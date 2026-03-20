import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 총회 재개 (PAUSED → VOTING)
 * POST /api/assemblies/[assemblyId]/emergency/resume
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: result, error } = await supabase.rpc('transition_assembly_status', {
      p_assembly_id: assemblyId,
      p_union_id:    unionId,
      p_actor_id:    auth.user.id,
      p_new_status:  'VOTING',
      p_reason:      '비상 일시정지 해제 — 총회 재개',
      p_reason_code: 'EMERGENCY_RESUME',
    });

    if (error) {
      console.error('총회 재개 실패:', error);
      return NextResponse.json({ error: '총회 재개에 실패했습니다.' }, { status: 500 });
    }

    if (!result?.success) {
      return NextResponse.json({ error: result?.error || '상태 전이가 허용되지 않습니다.' }, { status: 400 });
    }

    return NextResponse.json({ data: { success: true, status: 'VOTING' } });
  } catch (error) {
    console.error('POST /emergency/resume error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
