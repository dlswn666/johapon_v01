import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string; questionId: string }>;
}

/**
 * 질문 반려 (관리자 전용)
 * PATCH /api/assemblies/[assemblyId]/questions/[questionId]/reject
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, questionId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { reason } = body;

    const { data, error } = await supabase
      .from('assembly_questions')
      .update({
        is_approved: false,
      })
      .eq('id', questionId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .select('id, is_approved')
      .single();

    if (error || !data) {
      console.error('질문 반려 실패:', error);
      return NextResponse.json({ error: '질문 반려에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그 (사유 기록)
    await supabase
      .from('assembly_audit_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: 'QUESTION_REJECTED',
        actor_id: auth.user.id,
        actor_role: 'ADMIN',
        target_type: 'question',
        target_id: questionId,
        event_data: {
          question_id: questionId,
          ...(reason && { reason: String(reason).slice(0, 500) }),
        },
      });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /questions/[id]/reject error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
