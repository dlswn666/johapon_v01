import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 현장투표 검증 (VERIFIED 상태로 변경)
 * POST /api/assemblies/[assemblyId]/onsite-ballot/verify
 * Body: { ballot_input_id }
 * CRITICAL: 입력자와 다른 관리자만 검증 가능
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { ballot_input_id } = body;

    if (!ballot_input_id || typeof ballot_input_id !== 'string') {
      return NextResponse.json({ error: '현장투표 입력 ID가 필요합니다.' }, { status: 400 });
    }

    // RPC로 현장투표 검증 (상태 변경 + 참여 기록 생성을 원자적으로 처리)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('verify_onsite_ballot', {
      p_ballot_input_id: ballot_input_id,
      p_assembly_id: assemblyId,
      p_union_id: unionId,
      p_verifier_id: auth.user.id,
    });

    if (rpcError) {
      console.error('현장투표 검증 RPC 실패:', rpcError);
      return NextResponse.json({ error: '현장투표 검증에 실패했습니다.' }, { status: 500 });
    }

    // RPC 에러 필드에 따라 에러 매핑
    if (rpcResult?.error) {
      const errorMap: Record<string, { message: string; status: number }> = {
        NOT_FOUND: { message: '현장투표 입력을 찾을 수 없습니다.', status: 404 },
        INVALID_STATUS: { message: '검증 대기 상태가 아닙니다.', status: 409 },
        SAME_PERSON: { message: '입력자와 검증자가 같을 수 없습니다.', status: 403 },
        NO_SNAPSHOT: { message: '유효한 조합원 스냅샷을 찾을 수 없습니다.', status: 400 },
      };
      const mapped = errorMap[rpcResult.error];
      if (mapped) {
        return NextResponse.json({ error: mapped.message }, { status: mapped.status });
      }
      return NextResponse.json({ error: '현장투표 검증에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: rpcResult });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/onsite-ballot/verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
