import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { ASSEMBLY_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 의사록 초안 조회
 * GET /api/assemblies/[assemblyId]/minutes
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

    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id, title, minutes_draft, minutes_finalized_at')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        minutes_draft: assembly.minutes_draft,
        minutes_finalized_at: assembly.minutes_finalized_at,
      },
    });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/minutes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 의사록 초안 자동 생성
 * POST /api/assemblies/[assemblyId]/minutes
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

    // 총회 정보
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('*')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 의사록 생성 가능 상태 확인 (M-1)
    const MINUTES_ALLOWED_STATUSES = ['VOTING_CLOSED', 'CLOSED', 'ARCHIVED'];
    if (!MINUTES_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({ error: '의사록은 투표 종료 후에만 생성할 수 있습니다.' }, { status: 400 });
    }

    // 출석 현황
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
    const totalAttendance = onsite + online + writtenProxy;
    const quorumTotal = assembly.quorum_total_members || 0;

    // 안건 목록
    const { data: agendas } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('seq_order');

    // 집계 결과
    const { data: tallyResults } = await supabase
      .from('vote_tally_results')
      .select('poll_id, option_id, voting_method, vote_count, poll_options ( label )')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    // polls 정보
    const { data: polls } = await supabase
      .from('polls')
      .select('id, agenda_item_id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    const pollToAgenda: Record<string, string> = {};
    for (const p of polls || []) {
      pollToAgenda[p.id] = p.agenda_item_id;
    }

    // 안건별 집계 색인 (M-8: 방법별 투표 분리 표시)
    interface TallyEntry {
      total: number;
      byMethod: Record<string, number>;
    }
    const agendaTally: Record<string, Record<string, TallyEntry>> = {};
    for (const t of tallyResults || []) {
      const agendaId = pollToAgenda[t.poll_id];
      if (!agendaId) continue;
      if (!agendaTally[agendaId]) agendaTally[agendaId] = {};
      const optRaw = t.poll_options;
      const opt = (Array.isArray(optRaw) ? optRaw[0] : optRaw) as { label: string } | null;
      const label = opt?.label || t.option_id;
      if (!agendaTally[agendaId][label]) {
        agendaTally[agendaId][label] = { total: 0, byMethod: {} };
      }
      agendaTally[agendaId][label].total += t.vote_count;
      agendaTally[agendaId][label].byMethod[t.voting_method] =
        (agendaTally[agendaId][label].byMethod[t.voting_method] || 0) + t.vote_count;
    }

    // Q&A 기록
    const { data: questions } = await supabase
      .from('assembly_questions')
      .select('content, answer, submitted_at, assembly_member_snapshots ( member_name )')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_approved', true)
      .order('submitted_at');

    // 발언 기록
    const { data: speakers } = await supabase
      .from('speaker_requests')
      .select('approved_at, assembly_member_snapshots ( member_name )')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('status', 'COMPLETED')
      .order('approved_at');

    // 마크다운 삽입 전 특수문자 이스케이프 (XSS/마크다운 인젝션 방지)
    const escapeMd = (s: string) => s.replace(/([\\`*_{}[\]()#+\-.!|])/g, '\\$1');

    // 의사록 마크다운 생성
    const scheduledDate = new Date(assembly.scheduled_at).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
      timeZone: 'Asia/Seoul',
    });
    const scheduledTime = new Date(assembly.scheduled_at).toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Seoul',
    });
    const assemblyTypeLabel = ASSEMBLY_TYPE_LABELS[assembly.assembly_type as keyof typeof ASSEMBLY_TYPE_LABELS] || assembly.assembly_type;

    let minutes = `# ${assembly.title} 의사록\n\n`;
    minutes += `## 1. 총회 개요\n\n`;
    minutes += `- **총회 유형**: ${assemblyTypeLabel}\n`;
    minutes += `- **일시**: ${scheduledDate} ${scheduledTime}\n`;
    minutes += `- **장소**: ${assembly.venue_address || '미정'}\n`;
    minutes += `- **법적 근거**: ${assembly.legal_basis || '-'}\n`;
    minutes += `- **참석현황**: 현장 ${onsite}명, 온라인 ${online}명, 서면/위임 ${writtenProxy}명 (총 ${totalAttendance}명`;
    if (quorumTotal > 0) {
      minutes += `/${quorumTotal}명`;
    }
    minutes += `)\n\n`;

    minutes += `## 2. 안건별 심의 및 의결 결과\n\n`;
    for (const agenda of agendas || []) {
      const idx = agenda.seq_order;
      minutes += `### 제${idx}호 안건: ${escapeMd(agenda.title)}\n\n`;
      if (agenda.description) {
        minutes += `${agenda.description}\n\n`;
      }
      const tally = agendaTally[agenda.id] || {};
      const tallyEntries = Object.entries(tally);
      if (tallyEntries.length > 0) {
        const totalVotes = tallyEntries.reduce((s, [, e]) => s + e.total, 0);
        minutes += `**투표 결과**\n\n`;
        for (const [label, entry] of tallyEntries) {
          const pct = totalVotes > 0 ? ((entry.total / totalVotes) * 100).toFixed(1) : '0.0';
          const methodParts = Object.entries(entry.byMethod)
            .map(([method, count]) => {
              const methodLabel = method === 'ELECTRONIC' ? '전자' : method === 'ONSITE' ? '현장' : method === 'WRITTEN' ? '서면' : method === 'PROXY' ? '위임' : method;
              return `${methodLabel} ${count}표`;
            })
            .join(', ');
          minutes += `- ${label}: ${entry.total}표 (${pct}%) [${methodParts}]\n`;
        }
        const approvalThreshold = agenda.approval_threshold_pct || 50;
        const approvalEntry = tallyEntries.find(([l]) => l === '찬성');
        const approvalCount = approvalEntry ? approvalEntry[1].total : 0;
        const approvalPct = totalVotes > 0 ? (approvalCount / totalVotes) * 100 : 0;
        const approved = totalVotes > 0 && approvalPct >= approvalThreshold;
        minutes += `\n**의결 결과**: ${approved ? '✅ 가결' : '❌ 부결'}\n\n`;
      } else {
        minutes += `*집계 결과 없음*\n\n`;
      }
    }

    // Q&A
    if (questions && questions.length > 0) {
      minutes += `## 3. 질의응답\n\n`;
      for (const q of questions) {
        const snapshotRaw = q.assembly_member_snapshots;
        const snapshot = (Array.isArray(snapshotRaw) ? snapshotRaw[0] : snapshotRaw) as { member_name: string } | null;
        const name = snapshot?.member_name || '조합원';
        minutes += `- **Q**: ${escapeMd(q.content)} (${escapeMd(name)})\n`;
        if (q.answer) {
          minutes += `  **A**: ${escapeMd(q.answer)}\n`;
        }
        minutes += `\n`;
      }
    }

    // 발언 기록
    if (speakers && speakers.length > 0) {
      minutes += `## 4. 발언 기록\n\n`;
      for (const s of speakers) {
        const snapshotRaw = s.assembly_member_snapshots as unknown;
        const snapshot = (Array.isArray(snapshotRaw) ? snapshotRaw[0] : snapshotRaw) as { member_name: string } | null;
        const name = snapshot?.member_name || '조합원';
        const approvedAt = s.approved_at
          ? new Date(s.approved_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })
          : '-';
        minutes += `- ${escapeMd(name)} (승인시각: ${approvedAt})\n`;
      }
      minutes += `\n`;
    }

    minutes += `## 5. 기타사항\n\n`;
    minutes += `*없음*\n\n`;
    minutes += `---\n\n`;
    minutes += `*본 의사록은 ${new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} 자동 생성되었습니다.*\n`;

    // DB 저장
    const { error: updateError } = await supabase
      .from('assemblies')
      .update({ minutes_draft: minutes })
      .eq('id', assemblyId)
      .eq('union_id', unionId);

    if (updateError) {
      console.error('의사록 저장 실패:', updateError);
      return NextResponse.json({ error: '의사록 저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: { minutes_draft: minutes } }, { status: 200 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/minutes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 의사록 수정 / 확정
 * PATCH /api/assemblies/[assemblyId]/minutes
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const { minutes_draft, finalize } = body;

    // 총회 상태 및 확정 여부 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status, minutes_finalized_at')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    // M-1 상태 가드: 의사록 수정도 VOTING_CLOSED 이후에만 가능
    const MINUTES_ALLOWED_STATUSES = ['VOTING_CLOSED', 'CLOSED', 'ARCHIVED'];
    if (!MINUTES_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({ error: '의사록은 투표 종료 후에만 수정할 수 있습니다.' }, { status: 400 });
    }

    // H-2: 이미 확정된 의사록은 수정/재확정 불가
    if (assembly.minutes_finalized_at) {
      return NextResponse.json({ error: '이미 확정된 의사록은 수정할 수 없습니다.' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};

    if (finalize === true) {
      update.minutes_finalized_at = new Date().toISOString();
    } else if (typeof minutes_draft === 'string') {
      // M-5: XSS 위험 태그 제거
      let sanitized = minutes_draft;
      // script, iframe 태그 제거
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
      // on* 이벤트 핸들러 속성 제거
      sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      // javascript: URL 제거
      sanitized = sanitized.replace(/javascript\s*:/gi, '');
      // Unicode 제어 문자 제거 (C0/C1 제어 문자, 탭/줄바꿈은 유지)
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
      update.minutes_draft = sanitized;
    } else {
      return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('assemblies')
      .update(update)
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .select('id, minutes_draft, minutes_finalized_at')
      .single();

    if (error || !data) {
      console.error('의사록 업데이트 실패:', error);
      return NextResponse.json({ error: '의사록 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id]/minutes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
