import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 전자투표 일괄 투표 제출
 * POST /api/evotes/[id]/submit
 *
 * 조합원이 여러 안건에 대한 투표를 한 번에 제출
 * submit_evote_ballot RPC를 호출하여 단일 트랜잭션으로 처리
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { id } = await context.params;
    const assemblyId = id;

    const { authNonce, votes } = await request.json();

    // 필수 파라미터 검증
    if (!authNonce) {
      return NextResponse.json({ error: '본인인증이 필요합니다. PASS 인증을 완료해주세요.' }, { status: 400 });
    }

    // authNonce 형식 검증 (64자 hex — PASS Step-up 인증 토큰)
    if (!/^[0-9a-f]{64}$/i.test(authNonce)) {
      return NextResponse.json({ error: '인증 토큰 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    if (!Array.isArray(votes) || votes.length === 0) {
      return NextResponse.json({ error: '투표 항목이 누락되었습니다.' }, { status: 400 });
    }

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const unionId = auth.user.union_id;

    const supabase = await createClient();

    // 스냅샷 조회 (본인확인 + 개인정보 동의 여부 확인)
    const { data: snapshot, error: snapshotError } = await supabase
      .from('assembly_member_snapshots')
      .select('id, voting_weight, identity_verified_at, consent_agreed_at, is_active')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .single();

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: '투표 권한이 없습니다. 총회 접근 인증을 먼저 완료해주세요.' },
        { status: 403 },
      );
    }

    if (!snapshot.identity_verified_at) {
      return NextResponse.json({ error: '본인확인이 완료되지 않았습니다.' }, { status: 403 });
    }

    if (!snapshot.consent_agreed_at) {
      return NextResponse.json({ error: '개인정보 수집·이용 동의가 필요합니다.' }, { status: 403 });
    }

    // submit_evote_ballot RPC 호출
    const { data, error } = await supabase.rpc('submit_evote_ballot', {
      p_assembly_id: assemblyId,
      p_union_id: unionId,
      p_user_id: auth.user.id,
      p_snapshot_id: snapshot.id,
      p_auth_nonce: authNonce,
      p_votes: votes.map((v: { pollId: string; optionId: string }) => ({
        poll_id: v.pollId,
        option_id: v.optionId,
      })),
    });

    if (error) {
      console.error('일괄 투표 제출 실패:', error);
      const message = error.message || '투표에 실패했습니다.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('POST /api/evotes/[id]/submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
