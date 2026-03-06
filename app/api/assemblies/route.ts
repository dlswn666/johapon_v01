import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

/**
 * 총회 목록 조회
 * GET /api/assemblies
 */
export async function GET() {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const supabase = await createClient();
    const unionId = auth.user.union_id;

    // M-9: union_id null 체크
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('assemblies')
      .select('*, creator:users!assemblies_created_by_fkey(id, name), agenda_items(count)')
      .eq('union_id', unionId)
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.error('총회 목록 조회 실패:', error);
      return NextResponse.json({ error: '총회 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 총회 생성
 * POST /api/assemblies
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const supabase = await createClient();
    const body = await request.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: '총회 제목을 입력해주세요.' }, { status: 400 });
    }
    if (!body.scheduled_at) {
      return NextResponse.json({ error: '총회 일시를 설정해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('assemblies')
      .insert({
        title: body.title.trim(),
        description: body.description?.trim() || null,
        assembly_type: body.assembly_type || 'REGULAR',
        scheduled_at: body.scheduled_at,
        venue_address: body.venue_address?.trim() || null,
        stream_type: body.stream_type || null,
        zoom_meeting_id: body.zoom_meeting_id || null,
        youtube_video_id: body.youtube_video_id || null,
        legal_basis: body.legal_basis?.trim() || null,
        union_id: auth.user.union_id,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('총회 생성 실패:', error);
      return NextResponse.json({ error: '총회 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
