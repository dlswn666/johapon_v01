import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ assemblyId: string; approvalId: string }>;
}

type MultisigSignerRole = 'UNION_PRESIDENT' | 'ELECTION_CHAIR' | 'AUDITOR' | 'OBSERVER_REP';

/**
 * Multisig 서명
 * POST /api/assemblies/[assemblyId]/multisig/[approvalId]/sign
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId, approvalId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { signer_role } = body as { signer_role: MultisigSignerRole };
    if (!signer_role) {
      return NextResponse.json({ error: 'signer_role이 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // multisig_approvals 조회
    const { data: approval } = await supabase
      .from('multisig_approvals')
      .select('id, action_type, status, required_count, current_count, expires_at')
      .eq('id', approvalId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .maybeSingle();

    if (!approval) {
      return NextResponse.json({ error: '승인 요청을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (approval.status !== 'PENDING') {
      return NextResponse.json({ error: '이미 처리된 승인 요청입니다.' }, { status: 410 });
    }

    if (new Date(approval.expires_at) < new Date()) {
      return NextResponse.json({ error: '만료된 승인 요청입니다.' }, { status: 410 });
    }

    // 역할 검증: 현재 사용자가 해당 assembly에서 signer_role을 가지는지
    const { data: roleRecord } = await supabase
      .from('assembly_roles')
      .select('id')
      .eq('assembly_id', assemblyId)
      .eq('user_id', auth.user.id)
      .eq('role', signer_role)
      .is('revoked_at', null)
      .maybeSingle();

    if (!roleRecord) {
      return NextResponse.json(
        { error: '해당 역할로 서명할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 중복 서명 검사
    const { data: existingSig } = await supabase
      .from('multisig_signatures')
      .select('id')
      .eq('approval_id', approvalId)
      .eq('signer_user_id', auth.user.id)
      .maybeSingle();

    if (existingSig) {
      return NextResponse.json({ error: '이미 서명하셨습니다.' }, { status: 409 });
    }

    // 서명 해시 생성
    const now = new Date().toISOString();
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${approvalId}${auth.user.id}${now}`)
      .digest('hex');

    // 서명 INSERT
    const { error: sigError } = await supabase
      .from('multisig_signatures')
      .insert({
        approval_id:    approvalId,
        signer_user_id: auth.user.id,
        signer_role,
        signature_hash: signatureHash,
      });

    if (sigError) {
      console.error('서명 INSERT 실패:', sigError);
      return NextResponse.json({ error: '서명에 실패했습니다.' }, { status: 500 });
    }

    // current_count 증가
    const newCount = approval.current_count + 1;
    const isCompleted = newCount >= approval.required_count;

    await supabase
      .from('multisig_approvals')
      .update({
        current_count: newCount,
        ...(isCompleted && { status: 'COMPLETED', completed_at: now }),
      })
      .eq('id', approvalId);

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id:  assemblyId,
      union_id:     unionId,
      event_type:   isCompleted ? 'MULTISIG_COMPLETE' : 'MULTISIG_SIGN',
      actor_id:     auth.user.id,
      actor_role:   'ADMIN',
      target_type:  'multisig_approval',
      target_id:    approvalId,
      event_data:   { approval_id: approvalId, signer_role, action_type: approval.action_type, current_count: newCount },
    });

    return NextResponse.json({
      data: {
        signed:        true,
        completed:     isCompleted,
        current_count: newCount,
      },
    });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/multisig/[approvalId]/sign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
