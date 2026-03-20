import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string; proxyId: string }>;
}

const VALID_ACTIONS = ['APPROVED', 'REJECTED', 'REVOKED'];

/**
 * 대리인 승인/거절/해제
 * PATCH /api/assemblies/[assemblyId]/proxy-registrations/[proxyId]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, proxyId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { status: newStatus, revokedReason } = body;

    if (!newStatus || !VALID_ACTIONS.includes(newStatus)) {
      return NextResponse.json({ error: '유효한 상태(APPROVED/REJECTED/REVOKED)를 지정하세요.' }, { status: 400 });
    }

    // 대리인 등록 조회
    const { data: proxy } = await supabase
      .from('proxy_registrations')
      .select('id, status')
      .eq('id', proxyId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!proxy) {
      return NextResponse.json({ error: '대리인 등록을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 상태 전이 검증
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['REVOKED'],
    };

    if (!(allowedTransitions[proxy.status] || []).includes(newStatus)) {
      return NextResponse.json({
        error: `${proxy.status}에서 ${newStatus}(으)로 전환할 수 없습니다.`,
      }, { status: 400 });
    }

    if (newStatus === 'REVOKED' && (!revokedReason || !revokedReason.trim())) {
      return NextResponse.json({ error: '해제 사유를 입력해야 합니다.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'APPROVED') {
      updateData.verified_at = new Date().toISOString();
      updateData.verified_by = auth.user.id;
    }
    if (newStatus === 'REVOKED') {
      updateData.revoked_reason = revokedReason.trim();
    }

    const { data, error } = await supabase
      .from('proxy_registrations')
      .update(updateData)
      .eq('id', proxyId)
      .select()
      .single();

    if (error) {
      console.error('대리인 상태 변경 실패:', error);
      return NextResponse.json({ error: '대리인 상태 변경에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그 이벤트 매핑
    const eventMap: Record<string, string> = {
      APPROVED: 'PROXY_APPROVED',
      REJECTED: 'PROXY_REJECTED',
      REVOKED: 'PROXY_REVOKED',
    };

    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: eventMap[newStatus] || 'PROXY_APPROVED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'proxy_registration',
      target_id: proxyId,
      event_data: { newStatus, ...(revokedReason && { revokedReason: revokedReason.trim() }) },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id]/proxy-registrations/[proxyId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
