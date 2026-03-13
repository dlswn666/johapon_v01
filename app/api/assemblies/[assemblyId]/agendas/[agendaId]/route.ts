import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string; agendaId: string }>;
}

// 수정 허용 필드 화이트리스트 (Mass Assignment 방지)
const AGENDA_ALLOWED_FIELDS = [
  'title', 'description', 'agenda_type', 'seq_order',
  'quorum_threshold_pct', 'quorum_requires_direct', 'approval_threshold_pct',
  'explanation_html',
];

/**
 * 안건 수정
 * PATCH /api/assemblies/[assemblyId]/agendas/[agendaId]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, agendaId } = await context.params;
    const supabase = await createClient();
    const body = await request.json();
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    // 총회 수정 가능 상태 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly || !['DRAFT', 'NOTICE_SENT'].includes(assembly.status)) {
      return NextResponse.json({ error: '현재 상태에서는 안건을 수정할 수 없습니다.' }, { status: 400 });
    }

    // 화이트리스트 필터링
    const safeUpdates = Object.fromEntries(
      Object.entries(body).filter(([k]) => AGENDA_ALLOWED_FIELDS.includes(k))
    );

    const { data, error } = await supabase
      .from('agenda_items')
      .update(safeUpdates)
      .eq('id', agendaId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '안건을 찾을 수 없습니다.' }, { status: 404 });
      }
      console.error('안건 수정 실패:', error);
      return NextResponse.json({ error: '안건 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id]/agendas/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 안건 삭제 (DRAFT/NOTICE_SENT 상태에서만)
 * DELETE /api/assemblies/[assemblyId]/agendas/[agendaId]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, agendaId } = await context.params;
    const supabase = await createClient();
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    // 총회 수정 가능 상태 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly || !['DRAFT', 'NOTICE_SENT'].includes(assembly.status)) {
      return NextResponse.json({ error: '현재 상태에서는 안건을 삭제할 수 없습니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('agenda_items')
      .delete()
      .eq('id', agendaId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    if (error) {
      console.error('안건 삭제 실패:', error);
      return NextResponse.json({ error: '안건 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/assemblies/[id]/agendas/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
