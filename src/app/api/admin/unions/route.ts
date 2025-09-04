import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { ok, fail, requireAuth } from '@/shared/lib/api';

// GET /api/admin/unions - 조합 목록 조회 (간소화)
export async function GET(request: NextRequest) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const supabase = getSupabaseClient();

        const { data: unions, error } = await supabase.from('unions').select('id, name, homepage').order('name');

        if (error) {
            console.error('[UNIONS_API] Database error:', error);
            return fail('DATABASE_ERROR', `조합 목록 조회 실패: ${error.message}`, 500);
        }

        const items = (unions || []).map((union) => ({
            id: union.id,
            name: union.name,
            homepage: union.homepage,
        }));

        return ok({ items });
    } catch (error) {
        console.error('[UNIONS_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
