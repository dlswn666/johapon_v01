import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string; questionId: string }>;
}

/**
 * 질문 답변 등록 (관리자 전용)
 * PATCH /api/assemblies/[assemblyId]/questions/[questionId]/answer
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, questionId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { answer } = body;
    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json({ error: '답변 내용을 입력해주세요.' }, { status: 400 });
    }

    const sanitized = answer.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('assembly_questions')
      .update({
        answer: sanitized,
        answered_by: auth.user.id,
        answered_at: now,
      })
      .eq('id', questionId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .select('id, answer, answered_at')
      .single();

    if (error || !data) {
      console.error('답변 등록 실패:', error);
      return NextResponse.json({ error: '답변 등록에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase
      .from('assembly_audit_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: 'QUESTION_ANSWERED',
        actor_id: auth.user.id,
        actor_role: 'ADMIN',
        target_type: 'question',
        target_id: questionId,
        event_data: { answer: sanitized },
      });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /questions/[id]/answer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
