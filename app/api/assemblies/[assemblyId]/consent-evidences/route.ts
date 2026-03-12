import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 동의 증거 목록 조회 (관리자 전용)
 * GET /api/assemblies/[assemblyId]/consent-evidences
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assembly_consent_evidences')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('created_at', { ascending: false });

    if (error) {
      // 테이블 미존재 시 빈 배열 반환
      if (error.code === '42P01') {
        return NextResponse.json({ data: [] });
      }
      console.error('동의 증거 조회 실패:', error);
      return NextResponse.json({ error: '동의 증거 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/consent-evidences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
