import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 총회 상세 조회
 * GET /api/assemblies/[assemblyId]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const supabase = await createClient();

    let query = supabase
      .from('assemblies')
      .select(`
        *,
        creator:users!assemblies_created_by_fkey(id, name),
        agenda_items(
          *,
          polls(*, poll_options(*)),
          agenda_documents(*)
        )
      `)
      .eq('id', assemblyId);

    // SYSTEM_ADMIN은 모든 총회 조회 가능, 일반 ADMIN은 자기 조합만
    if (auth.user.union_id) {
      query = query.eq('union_id', auth.user.union_id);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
      }
      console.error('총회 상세 조회 실패:', error);
      return NextResponse.json({ error: '총회 정보를 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/assemblies/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 수정 허용 필드 화이트리스트 (Mass Assignment 방지)
const ASSEMBLY_ALLOWED_FIELDS = [
  'title', 'description', 'assembly_type', 'scheduled_at',
  'venue_address', 'stream_type', 'zoom_meeting_id', 'youtube_video_id',
  'legal_basis', 'notice_content',
];

/**
 * 총회 수정
 * PATCH /api/assemblies/[assemblyId]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const supabase = await createClient();
    const body = await request.json();

    // 수정 가능 상태 확인
    let existingQuery = supabase
      .from('assemblies')
      .select('status, updated_at')
      .eq('id', assemblyId);

    if (auth.user.union_id) {
      existingQuery = existingQuery.eq('union_id', auth.user.union_id);
    }

    const { data: existing } = await existingQuery.single();

    if (!existing) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!['DRAFT', 'NOTICE_SENT'].includes(existing.status)) {
      return NextResponse.json({ error: `현재 상태(${existing.status})에서는 수정할 수 없습니다.` }, { status: 400 });
    }

    // P0-4: NOTICE_SENT 이후 법적 필수 필드 잠금 (도정법 §44)
    const NOTICE_SENT_LOCKED_FIELDS = ['scheduled_at', 'assembly_type', 'venue_address'];
    if (existing.status === 'NOTICE_SENT') {
      const lockedField = Object.keys(body).find(k => NOTICE_SENT_LOCKED_FIELDS.includes(k));
      if (lockedField) {
        return NextResponse.json({
          error: `소집공고 발송 후에는 '${lockedField}' 필드를 수정할 수 없습니다. 공고를 취소하고 재발송해야 합니다.`,
        }, { status: 400 });
      }
    }

    // 화이트리스트 필터링 (Mass Assignment 방지)
    const safeUpdates = Object.fromEntries(
      Object.entries(body).filter(([k]) => ASSEMBLY_ALLOWED_FIELDS.includes(k))
    );

    // 낙관적 잠금
    let query = supabase
      .from('assemblies')
      .update(safeUpdates)
      .eq('id', assemblyId);

    if (auth.user.union_id) {
      query = query.eq('union_id', auth.user.union_id);
    }

    if (body.updated_at) {
      query = query.eq('updated_at', body.updated_at);
    }

    const { data, error } = await query.select().single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '다른 사용자가 수정했습니다. 새로고침 후 다시 시도해주세요.' }, { status: 409 });
      }
      console.error('총회 수정 실패:', error);
      return NextResponse.json({ error: '총회 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
