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

    // status 필드만 허용
    const { status } = body;
    if (!['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 투표 상태입니다.' }, { status: 400 });
    }

    // 총회 소속 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status')
      .eq('id', assemblyId)
      .eq('union_id', auth.user.union_id)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };

    // 개시 시 opened_by 기록, 마감 시 closed_by 기록
    if (status === 'OPEN') {
      updateData.opened_by = auth.user.id;
      updateData.opens_at = new Date().toISOString();
    } else if (status === 'CLOSED') {
      updateData.closed_by = auth.user.id;
      updateData.closes_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('polls')
      .update(updateData)
      .eq('id', pollId)
      .eq('agenda_item_id', agendaId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', auth.user.union_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '투표를 찾을 수 없습니다.' }, { status: 404 });
      }
      console.error('투표 상태 변경 실패:', error);
      return NextResponse.json({ error: '투표 상태 변경에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id]/agendas/[id]/polls/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
