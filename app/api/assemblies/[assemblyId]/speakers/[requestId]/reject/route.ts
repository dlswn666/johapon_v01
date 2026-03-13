import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string; requestId: string }>;
}

/**
 * 발언 요청 거절 (관리자 전용)
 * PATCH /api/assemblies/[assemblyId]/speakers/[requestId]/reject
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, requestId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { reason } = body;

    const { data, error } = await supabase
      .from('speaker_requests')
      .update({ status: 'REJECTED' })
      .eq('id', requestId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .in('status', ['PENDING', 'APPROVED'])
      .select('id, status')
      .single();

    if (error || !data) {
      console.error('발언 거절 실패:', error);
      return NextResponse.json({ error: '발언 거절에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase
      .from('assembly_audit_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: 'SPEAKER_REJECTED',
        actor_id: auth.user.id,
        actor_role: 'ADMIN',
        target_type: 'speaker_request',
        target_id: requestId,
        event_data: {
          ...(reason && { reason: String(reason).slice(0, 500) }),
        },
      });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /speakers/[id]/reject error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
