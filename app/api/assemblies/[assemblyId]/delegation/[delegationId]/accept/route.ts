import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string; delegationId: string }>;
}

/**
 * 위임 수락 (대리인이 수락 — pending → confirmed)
 * PATCH /api/assemblies/[assemblyId]/delegation/[delegationId]/accept
 */
export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId, delegationId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 위임 조회 — 현재 사용자가 대리인인지 확인
    const { data: delegation, error: fetchError } = await supabase
      .from('proxy_registrations')
      .select('id, status, delegate_user_id, delegator_id, expires_at')
      .eq('id', delegationId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .maybeSingle();

    if (fetchError || !delegation) {
      return NextResponse.json({ error: '위임 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (delegation.delegate_user_id !== auth.user.id) {
      return NextResponse.json({ error: '위임 수락 권한이 없습니다.' }, { status: 403 });
    }

    if (delegation.status !== 'pending') {
      return NextResponse.json(
        { error: `현재 상태(${delegation.status})에서는 수락할 수 없습니다.` },
        { status: 400 }
      );
    }

    if (delegation.expires_at && new Date(delegation.expires_at) < new Date()) {
      return NextResponse.json({ error: '위임 요청이 만료되었습니다.' }, { status: 410 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('proxy_registrations')
      .update({ status: 'confirmed' })
      .eq('id', delegationId)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('위임 수락 실패:', updateError);
      return NextResponse.json({ error: '위임 수락에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id:  assemblyId,
      union_id:     unionId,
      event_type:   'DELEGATION_CONFIRM',
      actor_id:     auth.user.id,
      actor_role:   'MEMBER',
      target_type:  'proxy_registration',
      target_id:    delegationId,
      event_data:   { delegator_id: delegation.delegator_id },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /delegation/[id]/accept error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
