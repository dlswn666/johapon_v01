import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { canTransition } from '@/app/_lib/features/assembly/domain/assemblyStateMachine';
import type { AssemblyStatus } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES: AssemblyStatus[] = [
  'DRAFT', 'NOTICE_SENT', 'PRE_VOTING', 'CONVENED', 'IN_PROGRESS',
  'VOTING', 'PAUSED', 'WRITTEN_TRANSITION', 'VOTING_CLOSED',
  'CLOSED', 'ARCHIVED', 'CANCELLED',
];

/**
 * 전자투표 상태 전환
 * PATCH /api/evotes/[id]/status
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { id } = await context.params;
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { status: newStatus, reason, reason_code } = body;

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: '유효하지 않은 상태 값입니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    if (!unionId && auth.user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    // 현재 상태 조회
    let currentQuery = supabase
      .from('assemblies')
      .select('status, union_id')
      .eq('id', id);

    if (unionId) {
      currentQuery = currentQuery.eq('union_id', unionId);
    }

    const { data: assembly } = await currentQuery.single();

    if (!assembly) {
      return NextResponse.json({ error: '전자투표를 찾을 수 없습니다.' }, { status: 404 });
    }

    const effectiveUnionId = unionId || assembly.union_id;

    // 상태 전이 유효성 검증 (도메인 상태 머신)
    if (!canTransition(assembly.status as AssemblyStatus, newStatus as AssemblyStatus)) {
      return NextResponse.json({
        error: `${assembly.status}에서 ${newStatus}(으)로 전환할 수 없습니다.`,
      }, { status: 400 });
    }

    // 진행 중인 총회 취소 시 사유 필수
    if (newStatus === 'CANCELLED' && ['IN_PROGRESS', 'VOTING'].includes(assembly.status)) {
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return NextResponse.json({ error: '진행 중인 총회 취소 시 사유를 입력해야 합니다.' }, { status: 400 });
      }
    }

    // transition_assembly_status RPC 호출
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'transition_assembly_status',
      {
        p_assembly_id: id,
        p_union_id: effectiveUnionId,
        p_actor_id: auth.user.id,
        p_new_status: newStatus,
        p_reason: reason || null,
        p_reason_code: reason_code || null,
      }
    );

    if (rpcError) {
      // RPC 미존재 시 직접 업데이트 폴백
      if (rpcError.message?.includes('function') || rpcError.code === '42883') {
        console.warn('transition_assembly_status RPC 미생성, 폴백:', rpcError.message);

        const { data: updated, error: updateError } = await supabase
          .from('assemblies')
          .update({ status: newStatus })
          .eq('id', id)
          .eq('union_id', effectiveUnionId)
          .select()
          .single();

        if (updateError || !updated) {
          console.error('상태 업데이트 실패:', updateError);
          return NextResponse.json({ error: '상태 변경에 실패했습니다.' }, { status: 500 });
        }

        // 감사 로그
        await supabase.from('assembly_audit_logs').insert({
          assembly_id: id,
          union_id: effectiveUnionId,
          event_type: 'STATUS_CHANGE',
          actor_id: auth.user.id,
          actor_role: 'ADMIN',
          target_type: 'assembly',
          target_id: id,
          event_data: {
            from_status: assembly.status,
            to_status: newStatus,
            ...(newStatus === 'CANCELLED' && reason && { cancellation_reason: reason.trim() }),
          },
        });

        return NextResponse.json({ data: updated });
      }

      console.error('상태 전이 RPC 실패:', rpcError);
      return NextResponse.json({ error: '상태 변경에 실패했습니다.' }, { status: 500 });
    }

    if (!rpcResult?.success) {
      return NextResponse.json(
        { error: rpcResult?.error || '상태 변경에 실패했습니다.' },
        { status: 400 }
      );
    }

    // 최신 데이터 반환
    const { data: updated } = await supabase
      .from('assemblies')
      .select()
      .eq('id', id)
      .eq('union_id', effectiveUnionId)
      .single();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/evotes/[id]/status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
