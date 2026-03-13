import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// 안건 유형별 기본 정족수 (DB 컬럼명 기준)
const QUORUM_DEFAULTS: Record<string, { requiresDirect: boolean; quorumThresholdPct: number; approvalThresholdPct: number }> = {
  GENERAL: { requiresDirect: false, quorumThresholdPct: 50, approvalThresholdPct: 50 },
  CONTRACTOR_SELECTION: { requiresDirect: true, quorumThresholdPct: 50, approvalThresholdPct: 50 },
  DISSOLUTION: { requiresDirect: false, quorumThresholdPct: 66.7, approvalThresholdPct: 75 },
  BYLAW_AMENDMENT: { requiresDirect: false, quorumThresholdPct: 50, approvalThresholdPct: 66.7 },
  BUDGET_APPROVAL: { requiresDirect: false, quorumThresholdPct: 50, approvalThresholdPct: 50 },
  EXECUTIVE_ELECTION: { requiresDirect: false, quorumThresholdPct: 50, approvalThresholdPct: 50 },
};

/**
 * 안건 목록 조회
 * GET /api/assemblies/[assemblyId]/agendas
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const supabase = await createClient();
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('agenda_items')
      .select('*, polls(*, poll_options(*)), agenda_documents(*)')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('seq_order', { ascending: true });

    if (error) {
      console.error('안건 목록 조회 실패:', error);
      return NextResponse.json({ error: '안건 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/agendas error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 안건 생성 (투표 세션 + 기본 선택지 자동 생성)
 * POST /api/assemblies/[assemblyId]/agendas
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const supabase = await createClient();
    const body = await request.json();
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: '안건 제목을 입력해주세요.' }, { status: 400 });
    }

    // 총회 수정 가능 상태 확인 + scheduled_at 가져오기
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status, scheduled_at')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (!['DRAFT', 'NOTICE_SENT'].includes(assembly.status)) {
      return NextResponse.json({ error: '현재 상태에서는 안건을 추가할 수 없습니다.' }, { status: 400 });
    }

    // 다음 안건 번호 자동 계산
    const { count } = await supabase
      .from('agenda_items')
      .select('*', { count: 'exact', head: true })
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    const seqOrder = body.seq_order || (count || 0) + 1;
    const agendaType = body.agenda_type || 'GENERAL';
    const defaults = QUORUM_DEFAULTS[agendaType] || QUORUM_DEFAULTS.GENERAL;

    const { data, error } = await supabase
      .from('agenda_items')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        seq_order: seqOrder,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        agenda_type: agendaType,
        quorum_threshold_pct: body.quorum_threshold_pct ?? defaults.quorumThresholdPct,
        quorum_requires_direct: body.quorum_requires_direct ?? defaults.requiresDirect,
        approval_threshold_pct: body.approval_threshold_pct ?? defaults.approvalThresholdPct,
      })
      .select()
      .single();

    if (error) {
      console.error('안건 생성 실패:', error);
      return NextResponse.json({ error: '안건 생성에 실패했습니다.' }, { status: 500 });
    }

    // 기본 투표 세션 자동 생성 (opens_at/closes_at은 총회 일시 기준)
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        agenda_item_id: data.id,
        assembly_id: assemblyId,
        union_id: unionId,
        opens_at: assembly.scheduled_at,
        closes_at: assembly.scheduled_at,
        allow_vote_revision: true,
        allow_abstain: true,
      })
      .select()
      .single();

    if (pollError) {
      console.error('투표 세션 자동 생성 실패:', pollError);
      // 롤백: 안건 삭제
      await supabase.from('agenda_items').delete().eq('id', data.id);
      return NextResponse.json({ error: '안건 생성에 실패했습니다 (투표 세션 생성 오류).' }, { status: 500 });
    }

    // 기본 선택지: 찬성/반대/기권
    const { error: optionsError } = await supabase.from('poll_options').insert([
      { poll_id: poll.id, union_id: unionId, label: '찬성', seq_order: 1, option_type: 'YES' },
      { poll_id: poll.id, union_id: unionId, label: '반대', seq_order: 2, option_type: 'NO' },
      { poll_id: poll.id, union_id: unionId, label: '기권', seq_order: 3, option_type: 'ABSTAIN' },
    ]);

    if (optionsError) {
      console.error('투표 선택지 생성 실패:', optionsError);
      // 롤백: poll + agenda 삭제
      await supabase.from('polls').delete().eq('id', poll.id);
      await supabase.from('agenda_items').delete().eq('id', data.id);
      return NextResponse.json({ error: '안건 생성에 실패했습니다 (선택지 생성 오류).' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/agendas error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
