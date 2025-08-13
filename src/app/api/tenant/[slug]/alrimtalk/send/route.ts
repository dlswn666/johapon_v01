export const runtime = 'nodejs';

import { ok, fail, withNoStore, isValidSlug, requireAuth } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));
    const { title, body: content, group, schedule } = body as any;
    if (!title || !content) return withNoStore(fail('BAD_REQUEST', 'title and body required', 400));

    // 실제 발송 연동은 미구현: 로그만 기록
    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const scheduledAt = schedule?.type === 'now' ? new Date().toISOString() : schedule?.at ?? null;
    const { data, error } = await supabase
        .from('alrimtalk_logs')
        .insert({
            union_id: unionId,
            title,
            body: content,
            group: group ?? '전체',
            scheduled_at: scheduledAt,
            created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();
    if (error || !data) return withNoStore(fail('DB_ERROR', 'insert failed', 500));
    return withNoStore(ok({ id: data.id, scheduled_at: scheduledAt }));
}
