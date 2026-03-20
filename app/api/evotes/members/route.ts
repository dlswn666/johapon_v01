import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

/**
 * 조합원 목록 조회 (전자투표 위저드 STEP 3 — 투표 대상자 선택)
 * GET /api/evotes/members
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const unionId = auth.user.union_id
      ?? (auth.user.role === 'SYSTEM_ADMIN' ? searchParams.get('union_id') : null);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const filter = searchParams.get('filter') || 'ALL';
    if (!['ALL', 'DELEGATE'].includes(filter)) {
      return NextResponse.json({ error: '유효하지 않은 필터입니다.' }, { status: 400 });
    }

    let query = supabase
      .from('users')
      .select('id, name, phone_number, property_address, entity_type, voting_weight, is_executive')
      .eq('union_id', unionId)
      .in('user_status', ['approved', 'pre_registered'])
      .eq('is_blocked', false)
      .order('name', { ascending: true });

    if (filter === 'DELEGATE') {
      query = query.eq('is_executive', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('조합원 목록 조회 실패:', error);
      return NextResponse.json({ error: '조합원 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/evotes/members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
