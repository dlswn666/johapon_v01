import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 투표 결과 공개 조회 (조합원용)
 * GET /api/assemblies/[assemblyId]/results/public
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    // 스냅샷 소속 확인 (본인 + 대리인 허용)
    let hasAccess = false;

    const { data: ownerSnap } = await supabase
      .from('assembly_member_snapshots')
      .select('id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (ownerSnap) hasAccess = true;

    if (!hasAccess) {
      const { data: proxySnap } = await supabase
        .from('assembly_member_snapshots')
        .select('id')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('proxy_user_id', auth.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (proxySnap) hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: '결과 조회 권한이 없습니다.' }, { status: 403 });
    }

    // 공개 결과 반환
    const { data: publication } = await supabase
      .from('assembly_result_publications')
      .select('id, published_at, result_json, result_hash, source_tally_hash')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .maybeSingle();

    if (!publication) {
      return NextResponse.json({ error: '결과가 아직 공개되지 않았습니다.' }, { status: 404 });
    }

    return NextResponse.json({ data: publication });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/results/public error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
