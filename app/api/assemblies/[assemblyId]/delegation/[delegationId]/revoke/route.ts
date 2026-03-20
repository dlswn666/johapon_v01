import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string; delegationId: string }>;
}

/**
 * 위임 취소/철회 (위임인 또는 관리자 — pending|confirmed → revoked)
 * PATCH /api/assemblies/[assemblyId]/delegation/[delegationId]/revoke
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId, delegationId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    let body: { reason?: string } = {};
    try { body = await request.json(); } catch { /* body 없는 경우 허용 */ }

    const supabase = await createClient();

    // 위임 조회
    const { data: delegation, error: fetchError } = await supabase
      .from('proxy_registrations')
      .select('id, status, delegator_id, delegate_user_id')
      .eq('id', delegationId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .maybeSingle();

    if (fetchError || !delegation) {
      return NextResponse.json({ error: '위임 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 위임인 본인 또는 관리자만 취소 가능
    const isAdmin = auth.user.role === 'ADMIN' || auth.user.role === 'SYSTEM_ADMIN';
    const isDelegator = delegation.delegator_id === auth.user.id;

    if (!isDelegator && !isAdmin) {
      return NextResponse.json({ error: '위임 취소 권한이 없습니다.' }, { status: 403 });
    }

    if (!['pending', 'confirmed'].includes(delegation.status)) {
      return NextResponse.json(
        { error: `현재 상태(${delegation.status})에서는 취소할 수 없습니다.` },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('proxy_registrations')
      .update({
        status: 'revoked',
        ...(body.reason ? { revoked_reason: body.reason } : {}),
      })
      .eq('id', delegationId)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('위임 취소 실패:', updateError);
      return NextResponse.json({ error: '위임 취소에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id:  assemblyId,
      union_id:     unionId,
      event_type:   'DELEGATION_REVOKE',
      actor_id:     auth.user.id,
      actor_role:   isAdmin ? 'ADMIN' : 'MEMBER',
      target_type:  'proxy_registration',
      target_id:    delegationId,
      event_data:   {
        delegator_id: delegation.delegator_id,
        reason:       body.reason || null,
        revoked_by:   isAdmin ? 'ADMIN' : 'DELEGATOR',
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /delegation/[id]/revoke error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
