export const runtime = 'nodejs';

import { ok, fail, withNoStore, requireAuth } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';

export async function PATCH(req: Request, context: { params: Promise<{ userId: string }> }) {
    const params = await context.params;
    const userId = String(params?.userId ?? '').trim();
    if (!userId) return withNoStore(fail('BAD_REQUEST', 'invalid userId', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));
    const { role, status, name, address, phone } = body as any;

    // 화면에서 받은 데이터를 DB 형식으로 변환
    const dbUpdateData: any = {};

    // 직접 매핑되는 필드들
    if (typeof name === 'string') dbUpdateData.name = name;
    if (typeof phone === 'string') dbUpdateData.phone = phone;

    // 변환이 필요한 필드들
    if (typeof address === 'string') dbUpdateData.property_location = address;
    if (typeof role === 'string') dbUpdateData.user_type = role;
    if (typeof status === 'string') {
        dbUpdateData.is_approved = status === 'active';
    }

    // 중복 제거: body에서 직접 받은 값들 우선 처리
    if (body.property_location !== undefined) dbUpdateData.property_location = body.property_location;
    if (body.user_type !== undefined) dbUpdateData.user_type = body.user_type;
    if (body.is_approved !== undefined) dbUpdateData.is_approved = body.is_approved;

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('users').update(dbUpdateData).eq('id', userId);
    if (error) return withNoStore(fail('DB_ERROR', 'update failed', 500));
    return withNoStore(ok({ updated: true }));
}
