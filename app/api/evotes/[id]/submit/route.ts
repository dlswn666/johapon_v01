import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { sanitizeRpcError } from '@/app/_lib/shared/utils/sanitizeRpcError';
import { isLocalhostServer } from '@/app/_lib/shared/utils/isLocalhost';

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

    const { authNonce, votes, authTxId, authMethod } = await request.json();

    // dev 모드에서는 nonce 검증 우회
    let effectiveNonce = authNonce;
    const isDev = isLocalhostServer();

    if (isDev) {
      effectiveNonce = authNonce || '0'.repeat(64);
    } else {
      if (!authNonce) {
        return NextResponse.json({ error: '본인인증이 필요합니다. PASS 인증을 완료해주세요.' }, { status: 400 });
      }
      if (!/^[0-9a-f]{64}$/i.test(authNonce)) {
        return NextResponse.json({ error: '인증 토큰 형식이 올바르지 않습니다.' }, { status: 400 });
      }
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

    // dev 모드: auth_nonces 테이블에 테스트 nonce 삽입 (RPC 검증 통과용)
    if (isDev) {
      await supabase.from('auth_nonces').upsert({
        nonce: effectiveNonce,
        user_id: auth.user.id,
        assembly_id: assemblyId,
        expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
        used_at: null,
      }, { onConflict: 'nonce' });
    }

    // submit_evote_ballot RPC 호출
    // authTxId, authMethod: KG이니시스 인증 메타데이터 (migration 041에서 participation_records에 추가 예정)
    const rpcParams: Record<string, unknown> = {
      p_assembly_id: assemblyId,
      p_union_id: unionId,
      p_user_id: auth.user.id,
      p_snapshot_id: snapshot.id,
      p_auth_nonce: effectiveNonce,
      p_votes: votes.map((v: { pollId: string; optionId: string }) => ({
        poll_id: v.pollId,
        option_id: v.optionId,
      })),
    };

    // KG이니시스 인증 메타데이터가 있으면 RPC에 전달 (RPC가 해당 파라미터를 지원하는 경우)
    if (authTxId) rpcParams.p_auth_tx_id = authTxId;
    if (authMethod) rpcParams.p_auth_method = authMethod;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('submit_evote_ballot', rpcParams as any);

    if (error) {
      console.error('일괄 투표 제출 실패:', error);
      const message = sanitizeRpcError(error.message);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('POST /api/evotes/[id]/submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
