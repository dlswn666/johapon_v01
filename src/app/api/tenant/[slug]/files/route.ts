export const runtime = 'nodejs';

import { ok, fail, withNoStore, isValidSlug, requireAuth } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const url = new URL(req.url);
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const targetTable = (url.searchParams.get('target_table') ?? '').trim();
    const targetId = (url.searchParams.get('target_id') ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));
    if (!targetTable || !targetId) return withNoStore(fail('BAD_REQUEST', 'missing target', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const { data, error } = await supabase
        .from('attachments')
        .select('id, target_table, target_id, file_url, file_name, file_type, uploaded_at')
        .eq('union_id', unionId)
        .eq('target_table', targetTable)
        .eq('target_id', targetId);
    if (error) return withNoStore(fail('DB_ERROR', 'query failed', 500));
    return withNoStore(ok({ items: data ?? [] }));
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    // 임시 권한 체크
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
        // 기존 /api/attachments 흐름과 동일 구현
        const supabase = getSupabaseClient();
        const form = await req.formData();
        const targetTable = String(form.get('target_table') ?? '').trim();
        const targetId = (form.get('target_id') ?? '').toString().trim();
        const file = form.get('file');
        if (!targetTable || !targetId || !(file instanceof File)) {
            return withNoStore(fail('BAD_REQUEST', 'invalid form data', 400));
        }

        const unionId = await getTenantIdBySlug(slug);
        if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

        const now = new Date();
        const yyyy = String(now.getFullYear());
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const path = `union/${unionId}/${targetTable}/${targetId}/${yyyy}/${mm}/${dd}/${safeName}`;

        const arrayBuffer = await file.arrayBuffer();
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-upload')
            .upload(path, arrayBuffer, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (uploadError) return withNoStore(fail('STORAGE_ERROR', 'upload failed', 500));

        const fileUrl = uploadData?.path ?? path;
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
        if (insertError || !insertData) return withNoStore(fail('DB_ERROR', 'db insert failed', 500));

        return withNoStore(ok({ attachment_id: insertData.id, file_url: insertData.file_url }));
    }

    // base64 JSON 업로드도 허용
    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));
    const {
        target_table: targetTable,
        target_id: targetId,
        file_name: fileName,
        content_type: contentTypeJson,
        base64,
    } = body as any;
    if (!targetTable || !targetId || !fileName || !base64)
        return withNoStore(fail('BAD_REQUEST', 'missing fields', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const safeName = String(fileName).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const path = `union/${unionId}/${targetTable}/${targetId}/${yyyy}/${mm}/${dd}/${safeName}`;

    const binary = Buffer.from(String(base64), 'base64');
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-upload')
        .upload(path, binary, { contentType: contentTypeJson || 'application/octet-stream', upsert: false });
    if (uploadError) return withNoStore(fail('STORAGE_ERROR', 'upload failed', 500));

    const fileUrl = uploadData?.path ?? path;
    const { data: insertData, error: insertError } = await supabase
        .from('attachments')
        .insert({
            union_id: unionId,
            target_table: targetTable,
            target_id: targetId,
            file_url: fileUrl,
            file_name: safeName,
            file_type: contentTypeJson || 'application/octet-stream',
            uploaded_at: new Date().toISOString(),
        })
        .select('id, file_url')
        .maybeSingle();
    if (insertError || !insertData) return withNoStore(fail('DB_ERROR', 'db insert failed', 500));

    return withNoStore(ok({ attachment_id: insertData.id, file_url: insertData.file_url }));
}
