import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ unionId: string }>;
}

/**
 * 병합 후보 목록 조회 (관리자 전용)
 * GET /api/unions/[unionId]/merge-candidates
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { unionId } = await context.params;

    if (auth.user.union_id !== unionId) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc('get_merge_candidates', { p_union_id: unionId });

    if (error) {
      console.error('병합 후보 조회 실패:', error);
      return NextResponse.json({ error: '병합 후보 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    const candidates = Array.isArray(data) ? data : [];
    const pendingCount = candidates.filter((c: { status: string }) => c.status === 'PENDING').length;

    return NextResponse.json({ candidates, pending_count: pendingCount });
  } catch (error) {
    console.error('GET /api/unions/[unionId]/merge-candidates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
