import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import { waiveComplianceRule } from '@/app/_lib/features/assembly/services/complianceService';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 컴플라이언스 규칙 면제 (BYLAW/POLICY만)
 * POST /api/assemblies/[assemblyId]/compliance/waive
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
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { evaluationId, waiverReason } = body;

    if (!evaluationId || typeof evaluationId !== 'string') {
      return NextResponse.json({ error: '평가 ID가 필요합니다.' }, { status: 400 });
    }

    if (!waiverReason || typeof waiverReason !== 'string' || !waiverReason.trim()) {
      return NextResponse.json({ error: '면제 사유를 입력해야 합니다.' }, { status: 400 });
    }

    // 해당 총회의 평가인지 확인
    const { data: evaluation } = await supabase
      .from('assembly_compliance_evaluations')
      .select('id')
      .eq('id', evaluationId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!evaluation) {
      return NextResponse.json({ error: '해당 총회의 평가 항목이 아닙니다.' }, { status: 404 });
    }

    const result = await waiveComplianceRule(
      supabase, evaluationId, waiverReason.trim(), auth.user.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'COMPLIANCE_WAIVED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'compliance_evaluation',
      target_id: evaluationId,
      event_data: { waiverReason: waiverReason.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/compliance/waive error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
