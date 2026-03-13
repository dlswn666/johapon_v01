import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import { evaluateComplianceForCheckpoint } from '@/app/_lib/features/assembly/services/complianceService';
import type { ComplianceCheckpoint } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

const VALID_CHECKPOINTS: ComplianceCheckpoint[] = [
  'BEFORE_NOTICE', 'BEFORE_CONVENE', 'BEFORE_START',
  'BEFORE_VOTING', 'BEFORE_PUBLISH', 'BEFORE_SEAL', 'BEFORE_ARCHIVE',
];

/**
 * 컴플라이언스 규칙 평가
 * GET /api/assemblies/[assemblyId]/compliance?checkpoint=BEFORE_NOTICE
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const checkpoint = request.nextUrl.searchParams.get('checkpoint') as ComplianceCheckpoint | null;

    if (!checkpoint || !VALID_CHECKPOINTS.includes(checkpoint)) {
      return NextResponse.json({
        error: '유효한 checkpoint를 지정하세요.',
        valid: VALID_CHECKPOINTS,
      }, { status: 400 });
    }

    const supabase = await createClient();

    // 총회 존재 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    const result = await evaluateComplianceForCheckpoint(
      supabase, assemblyId, unionId, checkpoint, auth.user.id
    );

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'COMPLIANCE_EVALUATED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'compliance',
      target_id: checkpoint,
      event_data: { checkpoint, summary: result.summary },
    });

    return NextResponse.json({
      checkpoint,
      evaluations: result.evaluations,
      summary: result.summary,
    });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/compliance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
