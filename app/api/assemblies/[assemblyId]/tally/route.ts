import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 투표 집계 결과 조회
 * GET /api/assemblies/[assemblyId]/tally
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vote_tally_results')
      .select(`
        id, poll_id, assembly_id, union_id, option_id,
        voting_method, vote_count, vote_weight_sum,
        tallied_at, tallied_by,
        poll_options ( id, label, option_type, seq_order )
      `)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('poll_id')
      .order('option_id')
      .order('voting_method');

    if (error) {
      console.error('집계 결과 조회 실패:', error);
      return NextResponse.json({ error: '집계 결과를 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/tally error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 투표 집계 실행
 * POST /api/assemblies/[assemblyId]/tally
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 총회 상태 확인 — VOTING_CLOSED 또는 CLOSED 상태여야 집계 가능
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id, status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    const TALLY_ALLOWED_STATUSES = ['VOTING_CLOSED', 'CLOSED', 'ARCHIVED'];
    if (!TALLY_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({
        error: '투표가 마감된 후에만 집계를 실행할 수 있습니다.',
      }, { status: 400 });
    }

    // 해당 총회의 모든 poll 목록 조회
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select('id, agenda_item_id, status')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    if (pollsError) {
      console.error('투표 목록 조회 실패:', pollsError);
      return NextResponse.json({ error: '투표 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    if (!polls || polls.length === 0) {
      return NextResponse.json({ error: '집계할 투표가 없습니다.' }, { status: 400 });
    }

    const tallyResults = [];
    const errors = [];

    for (const poll of polls) {
      const { data: result, error: rpcError } = await supabase.rpc('tally_votes', { p_poll_id: poll.id });
      if (rpcError) {
        console.error(`poll ${poll.id} 집계 RPC 실패:`, rpcError);
        errors.push({ poll_id: poll.id, error: rpcError.message });
        continue;
      }
      tallyResults.push({ poll_id: poll.id, result: result || [] });
    }

    // P2-3: 집계 결과 확정 해시
    const tallyPayload = JSON.stringify(tallyResults, Object.keys(tallyResults).sort());
    const tallyHash = crypto.createHash('sha256').update(tallyPayload).digest('hex');

    // 감사 로그에 집계 확정 해시 기록
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'TALLY_FINALIZED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'tally',
      target_id: assemblyId,
      event_data: { poll_count: polls.length, tally_hash: tallyHash },
    });

    return NextResponse.json({
      data: { tallied_at: new Date().toISOString(), polls: tallyResults, tally_hash: tallyHash },
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/tally error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
