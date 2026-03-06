import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { ASSEMBLY_TYPE_LABELS, AGENDA_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 총회 결과 보고서 생성
 * GET /api/assemblies/[assemblyId]/report
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

    // 총회 기본 정보
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('*')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 보고서용 출석 집계: 총 참석 이력 (중복 사용자 제거, exit_at 무관)
    // quorum API와 다름 — quorum은 현재 체크인(exit_at IS NULL)만 집계
    const { data: attendanceLogs } = await supabase
      .from('assembly_attendance_logs')
      .select('attendance_type, snapshot_id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    const attendanceMap: Record<string, Set<string>> = {
      ONSITE: new Set(),
      ONLINE: new Set(),
      WRITTEN_PROXY: new Set(),
    };
    for (const log of attendanceLogs || []) {
      if (log.attendance_type && attendanceMap[log.attendance_type]) {
        attendanceMap[log.attendance_type].add(log.snapshot_id);
      }
    }

    const onsite = attendanceMap.ONSITE.size;
    const online = attendanceMap.ONLINE.size;
    const writtenProxy = attendanceMap.WRITTEN_PROXY.size;
    const total = onsite + online + writtenProxy;
    const quorumTotalMembers = assembly.quorum_total_members || 0;
    const quorumMet = quorumTotalMembers > 0 ? total >= Math.ceil(quorumTotalMembers / 2) : null;

    // 안건 목록
    const { data: agendas } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('seq_order');

    // 집계 결과 (poll → option → method)
    const { data: tallyResults } = await supabase
      .from('vote_tally_results')
      .select(`
        poll_id, option_id, voting_method, vote_count, vote_weight_sum, tallied_at,
        poll_options ( id, label, option_type, seq_order )
      `)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    // polls 정보 (agenda_item_id 매핑)
    const { data: polls } = await supabase
      .from('polls')
      .select('id, agenda_item_id, status, opens_at, closes_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    const pollByAgenda: Record<string, typeof polls> = {};
    for (const poll of polls || []) {
      if (!pollByAgenda[poll.agenda_item_id]) pollByAgenda[poll.agenda_item_id] = [];
      pollByAgenda[poll.agenda_item_id]!.push(poll);
    }

    // 집계결과 poll 기준 색인
    const tallyByPoll: Record<string, typeof tallyResults> = {};
    for (const t of tallyResults || []) {
      if (!tallyByPoll[t.poll_id]) tallyByPoll[t.poll_id] = [];
      tallyByPoll[t.poll_id]!.push(t);
    }

    // 안건별 결과 구성
    const agendasReport = (agendas || []).map((agenda) => {
      const agendaPolls = pollByAgenda[agenda.id] || [];

      const pollTallies = agendaPolls.map((poll) => {
        const tally = tallyByPoll[poll.id] || [];

        // option별 집계
        const optionMap: Record<string, {
          label: string;
          electronic_count: number;
          onsite_count: number;
          written_count: number;
          proxy_count: number;
          total_count: number;
          weight_sum: number;
        }> = {};

        for (const t of tally) {
          const optRaw = t.poll_options;
          const opt = (Array.isArray(optRaw) ? optRaw[0] : optRaw) as { id: string; label: string; option_type: string; seq_order: number } | null;
          const optLabel = opt?.label || t.option_id;
          if (!optionMap[t.option_id]) {
            optionMap[t.option_id] = {
              label: optLabel,
              electronic_count: 0,
              onsite_count: 0,
              written_count: 0,
              proxy_count: 0,
              total_count: 0,
              weight_sum: 0,
            };
          }
          const entry = optionMap[t.option_id];
          entry.total_count += t.vote_count;
          // TODO: voting_weight 차등 의결권은 users 테이블에 weight 필드 추가 시 반영 예정
          // 현재 1.0 하드코딩은 의도된 동작 (1인 1표 원칙)
          entry.weight_sum += Number(t.vote_weight_sum) || 0;
          if (t.voting_method === 'ELECTRONIC') entry.electronic_count += t.vote_count;
          else if (t.voting_method === 'ONSITE') entry.onsite_count += t.vote_count;
          else if (t.voting_method === 'WRITTEN') entry.written_count += t.vote_count;
          else if (t.voting_method === 'PROXY') entry.proxy_count += t.vote_count;
        }

        const options = Object.values(optionMap);
        const totalVotes = options.reduce((s, o) => s + o.total_count, 0);
        const talliedAt = tally.length > 0 ? tally[0].tallied_at : null;

        // 찬성 옵션 (option_type === 'APPROVAL' 또는 label이 '찬성')
        const approvalOption = options.find((o) => o.label === '찬성') || options[0];
        const approvalThreshold = agenda.approval_threshold_pct || 50;
        const quorumThreshold = agenda.quorum_threshold_pct || 50;
        const approvalCount = approvalOption?.total_count || 0;
        const approvalPct = totalVotes > 0 ? (approvalCount / totalVotes) * 100 : 0;
        const approved = totalVotes > 0 && approvalPct >= approvalThreshold;
        const quorumMetForPoll = quorumTotalMembers > 0
          ? totalVotes >= Math.ceil(quorumTotalMembers * quorumThreshold / 100)
          : null;

        return {
          poll_id: poll.id,
          options,
          total_votes: totalVotes,
          quorum_met: quorumMetForPoll,
          approved,
          tallied_at: talliedAt,
        };
      });

      return {
        id: agenda.id,
        seq_order: agenda.seq_order,
        title: agenda.title,
        type: agenda.agenda_type,
        type_label: AGENDA_TYPE_LABELS[agenda.agenda_type as keyof typeof AGENDA_TYPE_LABELS] || agenda.agenda_type,
        quorum_threshold_pct: agenda.quorum_threshold_pct,
        approval_threshold_pct: agenda.approval_threshold_pct,
        polls: pollTallies,
      };
    });

    const report = {
      assembly: {
        id: assembly.id,
        title: assembly.title,
        type: assembly.assembly_type,
        type_label: ASSEMBLY_TYPE_LABELS[assembly.assembly_type as keyof typeof ASSEMBLY_TYPE_LABELS] || assembly.assembly_type,
        scheduled_at: assembly.scheduled_at,
        opened_at: assembly.opened_at,
        closed_at: assembly.closed_at,
        venue_address: assembly.venue_address,
        legal_basis: assembly.legal_basis,
        status: assembly.status,
      },
      attendance: {
        onsite,
        online,
        written_proxy: writtenProxy,
        total,
        quorum_total_members: quorumTotalMembers,
        quorum_met: quorumMet,
      },
      agendas: agendasReport,
      timestamps: {
        generated_at: new Date().toISOString(),
      },
    };

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
