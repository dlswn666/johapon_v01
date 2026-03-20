import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 서면투표 전환 — WRITTEN_TRANSITION multisig 요청 생성 (2시간 TTL)
 * POST /api/assemblies/[assemblyId]/emergency/written-transition
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    let body: { reason?: string } = {};
    try { body = await request.json(); } catch { /* body 없는 경우 허용 */ }

    if (!body.reason) {
      return NextResponse.json({ error: '서면 전환 사유를 입력해주세요.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 진행 중인 WRITTEN_TRANSITION multisig 중복 확인
    const { data: existing } = await supabase
      .from('multisig_approvals')
      .select('id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('action_type', 'WRITTEN_TRANSITION')
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: '이미 서면 전환 승인 요청이 진행 중입니다.' },
        { status: 409 }
      );
    }

    // WRITTEN_TRANSITION은 2시간 TTL (합의 1)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const { data: approval, error: insertError } = await supabase
      .from('multisig_approvals')
      .insert({
        assembly_id:    assemblyId,
        union_id:       unionId,
        action_type:    'WRITTEN_TRANSITION',
        required_count: 3,  // 조합장 + 선관위원장 + 감사 중 2/3
        payload:        { reason: body.reason },
        expires_at:     expiresAt,
        created_by:     auth.user.id,
      })
      .select('id')
      .single();

    if (insertError || !approval) {
      console.error('서면 전환 multisig 생성 실패:', insertError);
      return NextResponse.json({ error: '서면 전환 요청 생성에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id:  assemblyId,
      union_id:     unionId,
      event_type:   'WRITTEN_TRANSITION',
      actor_id:     auth.user.id,
      actor_role:   'ADMIN',
      target_type:  'multisig_approval',
      target_id:    approval.id,
      event_data:   {
        action_type: 'WRITTEN_TRANSITION',
        reason:      body.reason,
        event:       'MULTISIG_REQUESTED',
      },
    });

    return NextResponse.json({ data: { approval_id: approval.id } }, { status: 201 });
  } catch (error) {
    console.error('POST /emergency/written-transition error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
