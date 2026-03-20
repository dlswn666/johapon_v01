import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 내가 위임한 기록 조회 (위임인 기준)
 * GET /api/assemblies/[assemblyId]/delegation/my
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 위임인(delegator_id)으로서 내가 위임한 기록 조회
    const { data, error } = await supabase
      .from('proxy_registrations')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('delegator_id', auth.user.id)
      .not('status', 'in', '("expired","revoked")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('위임 조회 실패:', error);
      return NextResponse.json({ error: '위임 정보를 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || null });
  } catch (error) {
    console.error('GET /delegation/my error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
