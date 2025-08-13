export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}

function isValidSlug(slug: string): boolean {
    return /^[a-z0-9-_.]+$/i.test(slug);
}

async function resolveUnionIdBySlug(supabase: ReturnType<typeof getSupabaseClient>, slug: string) {
    const { data, error } = await supabase.from('unions').select('id').eq('homepage', slug).maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
}

export async function POST(req: Request) {
    const supabase = getSupabaseClient();
    const contentType = req.headers.get('content-type') || '';

    try {
        if (!contentType.includes('multipart/form-data')) {
            return badRequest('multipart_required');
        }

        const form = await req.formData();
        const slug = String(form.get('slug') ?? '').trim();
        const targetTable = String(form.get('target_table') ?? '').trim();
        const targetId = (form.get('target_id') ?? '').toString().trim();
        const file = form.get('file');

        if (!slug || !isValidSlug(slug)) return badRequest('invalid_slug');
        if (!targetTable) return badRequest('missing_target_table');
        if (!targetId) return badRequest('missing_target_id');
        if (!(file instanceof File)) return badRequest('missing_file');

        // 1) 업로드 API 호출 대신 직접 업로드 수행하여 트랜잭션 유사 흐름 유지
        const unionId = await getTenantIdBySlug(slug);
        if (!unionId) return NextResponse.json({ error: 'union_not_found' }, { status: 404 });

        const now = new Date();
        const yyyy = String(now.getFullYear());
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const path = `union/${unionId}/${targetTable}/${targetId}/${yyyy}/${mm}/${dd}/${safeName}`;

        const arrayBuffer = await file.arrayBuffer();
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-upload')
            .upload(path, arrayBuffer, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (uploadError) return NextResponse.json({ error: 'upload_failed' }, { status: 500 });

        const fileUrl = uploadData?.path ?? path;

        // 2) 첨부파일 DB 기록
        const { data: insertData, error: insertError } = await supabase
            .from('attachments')
            .insert({
                union_id: unionId,
                target_table: targetTable,
                target_id: targetId,
                file_url: fileUrl,
                file_name: safeName,
                file_type: file.type || 'application/octet-stream',
                uploaded_at: new Date().toISOString(),
            })
            .select('id, file_url')
            .maybeSingle();

        if (insertError || !insertData) {
            return NextResponse.json({ error: 'db_insert_failed' }, { status: 500 });
        }

        return NextResponse.json({ attachment_id: insertData.id, file_url: insertData.file_url }, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
