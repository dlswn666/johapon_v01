export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';
import { randomUUID } from 'crypto';

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

function buildStoragePath(args: {
    unionId: string;
    targetTable: string;
    targetId?: string | null;
    originalName: string;
}): string {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const uuid = randomUUID();
    const safeName = args.originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const parts = [
        'union',
        args.unionId,
        args.targetTable,
        ...(args.targetId ? [args.targetId] : []),
        yyyy,
        mm,
        dd,
        `${uuid}_${safeName}`,
    ];
    return parts.join('/');
}

export async function POST(req: Request) {
    const contentType = req.headers.get('content-type') || '';
    const supabase = getSupabaseClient();

    try {
        if (contentType.includes('multipart/form-data')) {
            const form = await req.formData();
            const slug = String(form.get('slug') ?? '').trim();
            const targetTable = String(form.get('target_table') ?? '').trim();
            const targetId = (form.get('target_id') ?? '').toString().trim() || null;
            const file = form.get('file');

            if (!slug || !isValidSlug(slug)) return badRequest('invalid_slug');
            if (!targetTable) return badRequest('missing_target_table');
            if (!(file instanceof File)) return badRequest('missing_file');

            const unionId = await getTenantIdBySlug(slug);
            if (!unionId) return NextResponse.json({ error: 'union_not_found' }, { status: 404 });

            const path = buildStoragePath({
                unionId,
                targetTable,
                targetId,
                originalName: file.name,
            });

            const arrayBuffer = await file.arrayBuffer();
            const { data, error } = await supabase.storage.from('post-upload').upload(path, arrayBuffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: false,
            });
            if (error) return NextResponse.json({ error: 'upload_failed' }, { status: 500 });

            return NextResponse.json(
                { bucket: 'post-upload', path: data?.path ?? path, file_url: data?.path ?? path },
                { status: 200 }
            );
        }

        // JSON 방식 업로드 (base64)
        const body = await req.json().catch(() => null);
        if (!body) return badRequest('invalid_body');
        const {
            slug,
            target_table: targetTable,
            target_id: targetId,
            file_name: fileName,
            content_type: contentTypeJson,
            base64,
        } = body;
        if (!slug || !isValidSlug(slug)) return badRequest('invalid_slug');
        if (!targetTable) return badRequest('missing_target_table');
        if (!fileName) return badRequest('missing_file_name');
        if (!base64) return badRequest('missing_base64');

        const unionId = await getTenantIdBySlug(slug);
        if (!unionId) return NextResponse.json({ error: 'union_not_found' }, { status: 404 });

        const path = buildStoragePath({
            unionId,
            targetTable,
            targetId,
            originalName: String(fileName),
        });

        const binary = Buffer.from(String(base64), 'base64');
        const { data, error } = await supabase.storage.from('post-upload').upload(path, binary, {
            contentType: contentTypeJson || 'application/octet-stream',
            upsert: false,
        });
        if (error) return NextResponse.json({ error: 'upload_failed' }, { status: 500 });

        return NextResponse.json(
            { bucket: 'post-upload', path: data?.path ?? path, file_url: data?.path ?? path },
            { status: 200 }
        );
    } catch (e) {
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
