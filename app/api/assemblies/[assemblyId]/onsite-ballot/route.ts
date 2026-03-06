import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 현장투표 입력 목록 조회 (관리자 전용)
 * GET /api/assemblies/[assemblyId]/onsite-ballot
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('written_ballot_inputs')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', auth.user.union_id)
      .order('input_at', { ascending: false });

    if (error) {
      console.error('현장투표 목록 조회 실패:', error);
      return NextResponse.json({ error: '현장투표 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/onsite-ballot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 현장투표 입력 (PENDING_VERIFICATION 상태)
 * POST /api/assemblies/[assemblyId]/onsite-ballot
 * Body: { poll_id, member_id (snapshot의 user_id), input_choice_id }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
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

    const { poll_id, member_id, input_choice_id } = body;

    if (!poll_id || typeof poll_id !== 'string') {
      return NextResponse.json({ error: '투표 ID가 필요합니다.' }, { status: 400 });
    }
    if (!member_id || typeof member_id !== 'string') {
      return NextResponse.json({ error: '조합원 ID가 필요합니다.' }, { status: 400 });
    }
    if (!input_choice_id || typeof input_choice_id !== 'string') {
      return NextResponse.json({ error: '선택 항목 ID가 필요합니다.' }, { status: 400 });
    }

    // 투표 유효성 확인
    const { data: poll } = await supabase
      .from('polls')
      .select('id, status, allow_onsite, allow_written')
      .eq('id', poll_id)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!poll) {
      return NextResponse.json({ error: '유효하지 않은 투표입니다.' }, { status: 400 });
    }
    if (poll.status !== 'OPEN') {
      return NextResponse.json({ error: '현재 투표가 진행 중이 아닙니다.' }, { status: 403 });
    }
    if (!poll.allow_onsite && !poll.allow_written) {
      return NextResponse.json({ error: '현장/서면 투표가 허용되지 않은 투표입니다.' }, { status: 403 });
    }

    // 선택 항목 유효성 확인
    const { data: pollOption } = await supabase
      .from('poll_options')
      .select('id')
      .eq('id', input_choice_id)
      .eq('poll_id', poll_id)
      .single();

    if (!pollOption) {
      return NextResponse.json({ error: '유효하지 않은 선택 항목입니다.' }, { status: 400 });
    }

    // 스냅샷 확인 (member_id는 user_id 기준)
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, user_id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', member_id)
      .eq('is_active', true)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: '유효하지 않은 조합원입니다.' }, { status: 400 });
    }

    // 중복 투표 방지 (같은 poll에 이미 PENDING/VERIFIED 상태 존재하는지)
    const { count: existingCount } = await supabase
      .from('written_ballot_inputs')
      .select('*', { count: 'exact', head: true })
      .eq('poll_id', poll_id)
      .eq('member_id', member_id)
      .in('status', ['PENDING_VERIFICATION', 'VERIFIED']);

    if (existingCount && existingCount > 0) {
      return NextResponse.json({ error: '이미 처리된 현장투표가 있습니다.' }, { status: 409 });
    }

    // M-10: 전자투표 교차 검증 — 이미 전자투표한 조합원은 현장투표 불가
    const { count: electronicCount } = await supabase
      .from('participation_records')
      .select('*', { count: 'exact', head: true })
      .eq('poll_id', poll_id)
      .eq('user_id', member_id);

    if (electronicCount && electronicCount > 0) {
      return NextResponse.json({ error: '이미 전자투표가 완료되어 현장투표를 입력할 수 없습니다.' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('written_ballot_inputs')
      .insert({
        assembly_id: assemblyId,
        poll_id,
        union_id: unionId,
        member_id,
        input_choice_id,
        inputter_id: auth.user.id,
        input_at: new Date().toISOString(),
        status: 'PENDING_VERIFICATION',
      })
      .select('*')
      .single();

    if (error) {
      console.error('현장투표 입력 실패:', error);
      return NextResponse.json({ error: '현장투표 입력에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/onsite-ballot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
