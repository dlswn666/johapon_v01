import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import type { MultisigActionType } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// 액션 타입별 required_count 매핑
const REQUIRED_COUNTS: Record<MultisigActionType, number> = {
  SNAPSHOT_CONFIRM:   2,  // 조합장 + 선관위원장 2/2
  VOTE_START:         2,  // 조합장 + 선관위원장 2/2
  WRITTEN_TRANSITION: 3,  // 조합장 + 선관위원장 + 감사 중 2/3
  RESULT_CONFIRM:     2,  // 선관위원장 + 감사 2/2
  DISPUTE_RESOLVE:    3,  // 선관위원장 + 감사 + 참관인대표 중 2/3
};

const VALID_ACTION_TYPES: MultisigActionType[] = [
  'SNAPSHOT_CONFIRM', 'VOTE_START', 'WRITTEN_TRANSITION', 'RESULT_CONFIRM', 'DISPUTE_RESOLVE',
];

/**
 * 다중 승인(Multisig) 목록 조회
 * GET /api/assemblies/[assemblyId]/multisig
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 만료된 PENDING 항목 자동 EXPIRED 처리 (side-effect)
    await supabase
      .from('multisig_approvals')
      .update({ status: 'EXPIRED' })
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('status', 'PENDING')
      .lt('expires_at', new Date().toISOString());

    const { data, error } = await supabase
      .from('multisig_approvals')
      .select('*, multisig_signatures(*)')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Multisig 목록 조회 실패:', error);
      return NextResponse.json({ error: 'Multisig 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/multisig error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 새 다중 승인 요청 생성
 * POST /api/assemblies/[assemblyId]/multisig
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

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { action_type, payload } = body as { action_type: MultisigActionType; payload?: Record<string, unknown> };

    if (!action_type || !VALID_ACTION_TYPES.includes(action_type)) {
      return NextResponse.json({ error: '유효한 action_type을 지정하세요.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 동일 assembly + action_type + PENDING 중복 검사
    const { data: existing } = await supabase
      .from('multisig_approvals')
      .select('id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('action_type', action_type)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: '이미 동일한 유형의 승인 요청이 진행 중입니다.' },
        { status: 409 }
      );
    }

    // expires_at 계산
    const expiresAt = action_type === 'WRITTEN_TRANSITION'
      ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()   // 2시간
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();  // 24시간

    const { data: approval, error: insertError } = await supabase
      .from('multisig_approvals')
      .insert({
        assembly_id:    assemblyId,
        union_id:       unionId,
        action_type,
        required_count: REQUIRED_COUNTS[action_type],
        payload:        payload || null,
        expires_at:     expiresAt,
        created_by:     auth.user.id,
      })
      .select('id')
      .single();

    if (insertError || !approval) {
      console.error('Multisig 생성 실패:', insertError);
      return NextResponse.json({ error: 'Multisig 요청 생성에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id:  assemblyId,
      union_id:     unionId,
      event_type:   'MULTISIG_SIGN',
      actor_id:     auth.user.id,
      actor_role:   'ADMIN',
      target_type:  'multisig_approval',
      target_id:    approval.id,
      event_data:   { action_type, required_count: REQUIRED_COUNTS[action_type], event: 'CREATED' },
    });

    return NextResponse.json({ data: { approval_id: approval.id } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/multisig error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
