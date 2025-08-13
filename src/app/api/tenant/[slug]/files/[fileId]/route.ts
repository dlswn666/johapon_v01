export const runtime = 'nodejs';

import { ok, fail, withNoStore, isValidSlug, requireAuth } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function DELETE(req: Request, context: { params: Promise<{ slug: string; fileId: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const fileId = String(params?.fileId ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));
    if (!fileId) return withNoStore(fail('BAD_REQUEST', 'invalid fileId', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const { data: att, error: attErr } = await supabase
        .from('attachments')
        .select('id, file_url')
        .eq('union_id', unionId)
        .eq('id', fileId)
        .maybeSingle();
    if (attErr) return withNoStore(fail('DB_ERROR', 'query failed', 500));
    if (!att) return withNoStore(fail('NOT_FOUND', 'attachment not found', 404));

    // 스토리지에서 파일 삭제
    const storagePath = att.file_url;
    const { error: delErr } = await supabase.storage.from('post-upload').remove([storagePath]);
    if (delErr) return withNoStore(fail('STORAGE_ERROR', 'storage delete failed', 500));

    const { error: dbDelErr } = await supabase.from('attachments').delete().eq('id', fileId).eq('union_id', unionId);
    if (dbDelErr) return withNoStore(fail('DB_ERROR', 'db delete failed', 500));

    return withNoStore(ok({ deleted: true }));
}
