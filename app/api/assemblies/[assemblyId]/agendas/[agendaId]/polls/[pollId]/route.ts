import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string; agendaId: string; pollId: string }>;
}

/**
 * 투표(poll) 상태 변경 (개시/마감/취소)
 * PATCH /api/assemblies/[assemblyId]/agendas/[agendaId]/polls/[pollId]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, agendaId, pollId } = await context.params;
    const supabase = await createClient();
    const body = await request.json();

    const { status, close_reason_code, close_reason } = body;
    if (!['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 투표 상태입니다.' }, { status: 400 });
    }

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const unionId = auth.user.union_id;

    // 현재 poll 조회 (상태 전이 유효성 + 법적 창 검증)
    const { data: poll } = await supabase
      .from('polls')
      .select('id, status, agenda_item_id, legal_closes_at, legal_window_locked_at, opens_at, closes_at')
      .eq('id', pollId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!poll) {
      return NextResponse.json({ error: '투표를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (poll.agenda_item_id !== agendaId) {
      return NextResponse.json({ error: '안건과 투표가 일치하지 않습니다.' }, { status: 400 });
    }

    // 상태 전이 유효성 검증
    const VALID_POLL_TRANSITIONS: Record<string, string[]> = {
      SCHEDULED: ['OPEN', 'CANCELLED'],
      OPEN: ['CLOSED', 'CANCELLED'],
      CLOSED: [],
      CANCELLED: [],
    };
    if (!VALID_POLL_TRANSITIONS[poll.status]?.includes(status)) {
      return NextResponse.json({
        error: `${poll.status}에서 ${status}(으)로 전환할 수 없습니다.`,
      }, { status: 400 });
    }

    // CLOSED 전이 시 법적 창 검증
    if (status === 'CLOSED') {
      const now = new Date();
      const legalClosesAt = poll.legal_closes_at ? new Date(poll.legal_closes_at) : null;

      if (legalClosesAt && now < legalClosesAt) {
        if (!close_reason_code || !['NORMAL', 'EMERGENCY', 'COURT_ORDER'].includes(close_reason_code)) {
          return NextResponse.json({
            error: '법적 마감 시각 이전 조기 마감 시 close_reason_code(NORMAL/EMERGENCY/COURT_ORDER)가 필요합니다.',
          }, { status: 400 });
        }
        if (!close_reason || close_reason.trim().length < 10) {
          return NextResponse.json({
            error: '조기 마감 사유(close_reason)는 10자 이상 입력하세요.',
          }, { status: 400 });
        }
      }
    }

    const updateData: Record<string, unknown> = { status };

    if (status === 'OPEN') {
      updateData.opened_by = auth.user.id;
      updateData.opens_at = new Date().toISOString();
    } else if (status === 'CLOSED') {
      updateData.closed_by = auth.user.id;
      updateData.closes_at = new Date().toISOString();
      updateData.close_reason_code = close_reason_code || 'NORMAL';
      if (close_reason) updateData.close_reason = close_reason.trim();
    }

    const { data, error } = await supabase
      .from('polls')
      .update(updateData)
      .eq('id', pollId)
      .eq('agenda_item_id', agendaId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '투표를 찾을 수 없습니다.' }, { status: 404 });
      }
      console.error('투표 상태 변경 실패:', error);
      return NextResponse.json({ error: '투표 상태 변경에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'POLL_STATUS_CHANGE',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'poll',
      target_id: pollId,
      event_data: {
        agenda_id: agendaId,
        from_status: poll.status,
        to_status: status,
        close_reason_code: close_reason_code || null,
        close_reason: close_reason || null,
      },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id]/agendas/[id]/polls/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
