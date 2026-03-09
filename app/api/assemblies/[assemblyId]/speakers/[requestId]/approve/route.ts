import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string; requestId: string }>;
}

/**
 * 발언 요청 승인 (관리자 전용)
 * PATCH /api/assemblies/[assemblyId]/speakers/[requestId]/approve
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, requestId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();
    const now = new Date().toISOString();

    // 현재 APPROVED 중 최대 queue_position 조회
    const { data: maxPos } = await supabase
      .from('speaker_requests')
      .select('queue_position')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('status', 'APPROVED')
      .order('queue_position', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    const nextPosition = (maxPos?.queue_position || 0) + 1;

    const { data, error } = await supabase
      .from('speaker_requests')
      .update({
        status: 'APPROVED',
        approved_by: auth.user.id,
        approved_at: now,
        queue_position: nextPosition,
      })
      .eq('id', requestId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('status', 'PENDING')
      .select('id, status, queue_position, approved_at')
      .single();

    if (error || !data) {
      console.error('발언 승인 실패:', error);
      return NextResponse.json({ error: '발언 승인에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase
      .from('assembly_audit_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: 'SPEAKER_APPROVED',
        actor_id: auth.user.id,
        actor_role: 'ADMIN',
        target_type: 'speaker_request',
        target_id: requestId,
        event_data: { queue_position: nextPosition },
      });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /speakers/[id]/approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
