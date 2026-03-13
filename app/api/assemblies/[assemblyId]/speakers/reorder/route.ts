import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 발언 순서 변경 (관리자 전용)
 * PUT /api/assemblies/[assemblyId]/speakers/reorder
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

    const { orderedIds } = body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: '정렬할 발언 요청 ID 목록이 필요합니다.' }, { status: 400 });
    }

    // 순서 업데이트 (각 ID에 queue_position = index + 1)
    const updates = orderedIds.map((id: string, index: number) =>
      supabase
        .from('speaker_requests')
        .update({ queue_position: index + 1 })
        .eq('id', id)
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('status', 'APPROVED')
    );

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      console.error('발언 순서 변경 실패:', results.filter((r) => r.error).map((r) => r.error));
      return NextResponse.json({ error: '발언 순서 변경에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('PUT /speakers/reorder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
