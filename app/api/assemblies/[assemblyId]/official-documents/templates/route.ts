import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

/**
 * 문서 템플릿 목록 조회
 * GET /api/assemblies/[assemblyId]/official-documents/templates
 *
 * 인증된 모든 사용자 접근 가능 (시스템 리소스)
 * PERF-2: 1시간 캐시 헤더 설정
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_type');

    if (error) {
      console.error('템플릿 조회 실패:', error);
      return NextResponse.json({ error: '템플릿 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    // PERF-2: 캐시 헤더
    const response = NextResponse.json({ data: data || [] });
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error('GET /api/assemblies/[id]/official-documents/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
