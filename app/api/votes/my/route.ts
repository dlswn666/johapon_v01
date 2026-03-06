import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

/**
 * 내 투표 참여 기록 조회
 * GET /api/votes/my?pollId=xxx&assemblyId=xxx
 *
 * 비밀투표: 참여 기록(누가 투표)만 반환, 선택 내용(무엇을 투표)은 반환하지 않음
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    const assemblyId = searchParams.get('assemblyId');

    if (!pollId || !assemblyId) {
      return NextResponse.json({ error: 'pollId, assemblyId는 필수입니다.' }, { status: 400 });
    }

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const unionId = auth.user.union_id;

    const supabase = await createClient();

    // 참여 기록 조회
    const { data: participation, error } = await supabase
      .from('participation_records')
      .select('id, poll_id, first_voted_at, last_voted_at, vote_count, receipt_token, voting_method')
      .eq('poll_id', pollId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (error) {
      console.error('참여 기록 조회 실패:', error);
      return NextResponse.json({ error: '참여 기록 조회에 실패했습니다.' }, { status: 500 });
    }

    // 투표 수정 가능 여부 확인
    let canRevise = false;
    if (participation) {
      const { data: poll } = await supabase
        .from('polls')
        .select('allow_vote_revision, status, closes_at')
        .eq('id', pollId)
        .eq('union_id', unionId)
        .single();

      if (poll) {
        canRevise = poll.allow_vote_revision
          && poll.status === 'OPEN'
          && (poll.closes_at ? new Date(poll.closes_at) > new Date() : true);
      }
    }

    return NextResponse.json({
      data: participation ? {
        poll_id: participation.poll_id,
        receipt_token: participation.receipt_token,
        first_voted_at: participation.first_voted_at,
        last_voted_at: participation.last_voted_at,
        vote_count: participation.vote_count,
        voting_method: participation.voting_method,
        can_revise: canRevise,
      } : null,
    });
  } catch (error) {
    console.error('GET /api/votes/my error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
