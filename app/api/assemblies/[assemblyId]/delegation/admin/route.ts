import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 관리자용 위임 전체 현황 조회
 * GET /api/assemblies/[assemblyId]/delegation/admin
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('proxy_registrations')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('위임 현황 조회 실패:', error);
      return NextResponse.json({ error: '위임 현황을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /delegation/admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
