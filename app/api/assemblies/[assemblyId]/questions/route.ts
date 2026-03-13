import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// 질문 가능한 총회 상태
const QA_ALLOWED_STATUSES = ['IN_PROGRESS', 'VOTING', 'VOTING_CLOSED'];

/**
 * 총회 질문 목록 조회
 * GET /api/assemblies/[assemblyId]/questions
 * - admin=true: 관리자용 — 모든 질문 반환 (is_approved 무관)
 * - 기본: 참여자용 — 승인된 질문 + 내 질문만
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const isAdmin = request.nextUrl.searchParams.get('admin') === 'true';

    const auth = await authenticateApiRequest(isAdmin ? { requireAdmin: true } : undefined);
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    const selectFields = 'id, assembly_id, agenda_item_id, snapshot_id, user_id, content, visibility, is_approved, approved_by, approved_at, answer, answered_by, answered_at, is_read_aloud, submitted_at';

    // 관리자 모드: 모든 질문 반환
    if (isAdmin) {
      const { data, error } = await supabase
        .from('assembly_questions')
        .select(selectFields)
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .order('submitted_at', { ascending: true });

      if (error) {
        console.error('질문 목록 조회 실패:', error);
        return NextResponse.json({ error: '질문 목록을 불러올 수 없습니다.' }, { status: 500 });
      }

      return NextResponse.json({ data: data || [] });
    }

    // 참여자 모드: 내 질문 + 승인된 공개 질문
    const [myResult, publicResult] = await Promise.all([
      supabase
        .from('assembly_questions')
        .select(selectFields)
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('user_id', auth.user.id)
        .order('submitted_at', { ascending: true }),
      supabase
        .from('assembly_questions')
        .select(selectFields)
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('is_approved', true)
        .in('visibility', ['PUBLIC', 'AFTER_APPROVAL'])
        .order('submitted_at', { ascending: true }),
    ]);

    if (myResult.error || publicResult.error) {
      console.error('질문 목록 조회 실패:', myResult.error || publicResult.error);
      return NextResponse.json({ error: '질문 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    // 중복 제거 (내 질문이 승인된 경우 양쪽에 포함됨)
    const seen = new Set<string>();
    const merged = [...(myResult.data || []), ...(publicResult.data || [])]
      .filter((q) => {
        if (seen.has(q.id)) return false;
        seen.add(q.id);
        return true;
      })
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

    return NextResponse.json({ data: merged });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 질문 제출
 * POST /api/assemblies/[assemblyId]/questions
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
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
    const { content, agendaItemId } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: '질문 내용을 입력해주세요.' }, { status: 400 });
    }

    // Unicode 제어 문자 제거 (M-07)
    const sanitized = content.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

    if (sanitized.length > 1000) {
      return NextResponse.json({ error: '질문은 1000자 이내로 작성해주세요.' }, { status: 400 });
    }

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

    if (!assembly || !QA_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({ error: '현재 질문을 등록할 수 없는 상태입니다.' }, { status: 403 });
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

    // 스냅샷 확인 (본인확인 완료 여부)
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

    const { data, error } = await supabase
      .from('assembly_questions')
      .insert({
        assembly_id: assemblyId,
        agenda_item_id: agendaItemId || null,
        union_id: unionId,
        snapshot_id: snapshot.id,
        user_id: auth.user.id,
        content: sanitized,
        visibility: 'ADMIN_ONLY',
      })
      .select('id, content, visibility, submitted_at')
      .single();

    if (error) {
      console.error('질문 등록 실패:', error);
      return NextResponse.json({ error: '질문 등록에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
