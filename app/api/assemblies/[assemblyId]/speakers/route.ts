import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// 발언요청 가능한 총회 상태
const SPEAKER_ALLOWED_STATUSES = ['IN_PROGRESS', 'VOTING'];

/**
 * 발언 요청 목록 조회
 * GET /api/assemblies/[assemblyId]/speakers
 * - admin=true: 관리자용 — 모든 발언 요청 반환
 * - 기본: 참여자용 — 내 요청만
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const isAdmin = request.nextUrl.searchParams.get('admin') === 'true';

    const auth = await authenticateApiRequest(isAdmin ? { requireAdmin: true } : undefined);
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    const selectFields = 'id, assembly_id, agenda_item_id, snapshot_id, user_id, status, approved_by, approved_at, queue_position, requested_at';

    if (isAdmin) {
      // 관리자 모드: 모든 발언 요청 (snapshot JOIN으로 이름 포함)
      const { data, error } = await supabase
        .from('speaker_requests')
        .select(selectFields)
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .order('requested_at', { ascending: true });

      if (error) {
        console.error('발언 요청 조회 실패:', error);
        return NextResponse.json({ error: '발언 요청 목록을 불러올 수 없습니다.' }, { status: 500 });
      }

      return NextResponse.json({ data: data || [] });
    }

    // 참여자 모드: 내 요청만
    const { data, error } = await supabase
      .from('speaker_requests')
      .select('id, assembly_id, agenda_item_id, status, queue_position, requested_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .order('requested_at', { ascending: true });

    if (error) {
      console.error('발언 요청 조회 실패:', error);
      return NextResponse.json({ error: '발언 요청 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/speakers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 발언 요청 제출
 * POST /api/assemblies/[assemblyId]/speakers
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }
    const { agendaItemId } = body;

    if (agendaItemId && typeof agendaItemId !== 'string') {
      return NextResponse.json({ error: '유효하지 않은 안건 ID입니다.' }, { status: 400 });
    }

    // 총회 상태 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly || !SPEAKER_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({ error: '현재 발언 요청을 할 수 없는 상태입니다.' }, { status: 403 });
    }

    // agendaItemId 유효성 검증 (제공된 경우)
    if (agendaItemId) {
      const { count: agendaCount } = await supabase
        .from('agenda_items')
        .select('*', { count: 'exact', head: true })
        .eq('id', agendaItemId)
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId);
      if (!agendaCount) {
        return NextResponse.json({ error: '유효하지 않은 안건입니다.' }, { status: 400 });
      }
    }

    // 스냅샷 확인
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, identity_verified_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .single();

    if (!snapshot || !snapshot.identity_verified_at) {
      return NextResponse.json({ error: '본인인증이 완료되지 않았습니다.' }, { status: 403 });
    }

    // 중복 요청 방지 (동일 안건에 PENDING 상태가 이미 있으면 거부)
    let duplicateQuery = supabase
      .from('speaker_requests')
      .select('*', { count: 'exact', head: true })
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .eq('status', 'PENDING');

    if (agendaItemId) {
      duplicateQuery = duplicateQuery.eq('agenda_item_id', agendaItemId);
    } else {
      duplicateQuery = duplicateQuery.is('agenda_item_id', null);
    }

    const { count: pendingCount } = await duplicateQuery;

    if (pendingCount && pendingCount > 0) {
      return NextResponse.json({ error: '이미 발언 요청이 등록되어 있습니다.' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('speaker_requests')
      .insert({
        assembly_id: assemblyId,
        agenda_item_id: agendaItemId || null,
        union_id: unionId,
        snapshot_id: snapshot.id,
        user_id: auth.user.id,
        status: 'PENDING',
      })
      .select('id, status, requested_at')
      .single();

    if (error) {
      // unique constraint violation → 중복 요청 (TOCTOU 방어)
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 발언 요청이 등록되어 있습니다.' }, { status: 409 });
      }
      console.error('발언 요청 등록 실패:', error);
      return NextResponse.json({ error: '발언 요청에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/speakers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
