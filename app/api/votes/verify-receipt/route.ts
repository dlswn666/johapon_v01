import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

/**
 * 투표 영수증 검증 (P1-3)
 * GET /api/votes/verify-receipt?token=xxx
 *
 * 비밀투표: 투표 내용(선택 항목) 절대 반환하지 않음.
 * 투표 존재 여부만 확인.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const token = request.nextUrl.searchParams.get('token');
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: '영수증 토큰이 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 본인 영수증만 조회 가능 (user_id 매칭)
    const { data } = await supabase
      .from('participation_records')
      .select('poll_id, first_voted_at, voting_method, assembly_id')
      .eq('receipt_token', token)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ data: { valid: false } });
    }

    return NextResponse.json({
      data: {
        valid: true,
        poll_id: data.poll_id,
        first_voted_at: data.first_voted_at,
        voting_method: data.voting_method,
        assembly_id: data.assembly_id,
      },
    });
  } catch (error) {
    console.error('GET /api/votes/verify-receipt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
