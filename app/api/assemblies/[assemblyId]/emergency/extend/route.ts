import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 투표 연장 — VOTE_START multisig 요청 생성
 * POST /api/assemblies/[assemblyId]/emergency/extend
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

    let body: { extensionMinutes?: number; reason?: string } = {};
    try { body = await request.json(); } catch { /* body 없는 경우 허용 */ }

    if (!body.extensionMinutes || body.extensionMinutes <= 0) {
      return NextResponse.json({ error: '연장 시간(분)을 입력해주세요.' }, { status: 400 });
    }
    if (!body.reason) {
      return NextResponse.json({ error: '연장 사유를 입력해주세요.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 현재 진행 중인 VOTE_START multisig 중복 확인
    const { data: existing } = await supabase
      .from('multisig_approvals')
      .select('id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('action_type', 'VOTE_START')
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: '이미 투표 연장 승인 요청이 진행 중입니다.' },
        { status: 409 }
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: approval, error: insertError } = await supabase
      .from('multisig_approvals')
      .insert({
        assembly_id:    assemblyId,
        union_id:       unionId,
        action_type:    'VOTE_START',
        required_count: 2,
        payload:        { extension_minutes: body.extensionMinutes, reason: body.reason },
        expires_at:     expiresAt,
        created_by:     auth.user.id,
      })
      .select('id')
      .single();

    if (insertError || !approval) {
      console.error('투표 연장 multisig 생성 실패:', insertError);
      return NextResponse.json({ error: '투표 연장 요청 생성에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id:  assemblyId,
      union_id:     unionId,
      event_type:   'MULTISIG_SIGN',
      actor_id:     auth.user.id,
      actor_role:   'ADMIN',
      target_type:  'multisig_approval',
      target_id:    approval.id,
      event_data:   {
        action_type:       'VOTE_START',
        extension_minutes: body.extensionMinutes,
        reason:            body.reason,
        event:             'EXTEND_REQUESTED',
      },
    });

    return NextResponse.json({ data: { approval_id: approval.id } }, { status: 201 });
  } catch (error) {
    console.error('POST /emergency/extend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
