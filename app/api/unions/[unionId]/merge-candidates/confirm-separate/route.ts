import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ unionId: string }>;
}

/**
 * 별도 인물 확정 (병합 후보에서 제외)
 * POST /api/unions/[unionId]/merge-candidates/confirm-separate
 * Body: { user_id_a: string, user_id_b: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { unionId } = await context.params;

    if (auth.user.union_id !== unionId) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { user_id_a, user_id_b } = body;
    if (!user_id_a || !user_id_b || typeof user_id_a !== 'string' || typeof user_id_b !== 'string') {
      return NextResponse.json({ error: 'user_id_a, user_id_b가 필요합니다.' }, { status: 400 });
    }

    if (user_id_a === user_id_b) {
      return NextResponse.json({ error: '동일한 조합원 ID입니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 정렬하여 중복 방지 (a < b 보장)
    const [sortedA, sortedB] = [user_id_a, user_id_b].sort();

    const { error } = await supabase
      .from('merge_exclusions')
      .upsert({
        union_id: unionId,
        user_id_a: sortedA,
        user_id_b: sortedB,
        status: 'CONFIRMED_SEPARATE',
        created_by: auth.user.id,
      }, {
        onConflict: 'union_id,user_id_a,user_id_b',
      });

    if (error) {
      console.error('별도 인물 확정 실패:', error);
      return NextResponse.json({ error: '처리에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/unions/[unionId]/merge-candidates/confirm-separate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
