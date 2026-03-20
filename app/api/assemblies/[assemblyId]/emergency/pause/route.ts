import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 총회 일시정지
 * POST /api/assemblies/[assemblyId]/emergency/pause
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
      return NextResponse.json({ error: '일시정지 사유를 입력해주세요.' }, { status: 400 });
    }

    const supabase = await createClient();

    // transition_assembly_status RPC 호출 (VOTING → PAUSED)
    const { data: result, error } = await supabase.rpc('transition_assembly_status', {
      p_assembly_id: assemblyId,
      p_union_id:    unionId,
      p_actor_id:    auth.user.id,
      p_new_status:  'PAUSED',
      p_reason:      body.reason,
      p_reason_code: 'EMERGENCY_PAUSE',
    });

    if (error) {
      console.error('총회 일시정지 실패:', error);
      return NextResponse.json({ error: '총회 일시정지에 실패했습니다.' }, { status: 500 });
    }

    if (!result?.success) {
      return NextResponse.json({ error: result?.error || '상태 전이가 허용되지 않습니다.' }, { status: 400 });
    }

    return NextResponse.json({ data: { success: true, status: 'PAUSED' } });
  } catch (error) {
    console.error('POST /emergency/pause error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
