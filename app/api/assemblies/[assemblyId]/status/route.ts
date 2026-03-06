import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { sendAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';

const ASSEMBLY_TYPE_KR: Record<string, string> = {
  REGULAR: '정기총회',
  EXTRAORDINARY: '임시총회',
  ONLINE_ONLY: '서면총회',
};

// 마크다운 특수문자 이스케이프 (XSS 및 마크다운 인젝션 방지)
function escapeMd(s: string): string {
  return s.replace(/([\\`*_{}[\]()#+\-.!|])/g, '\\$1');
}

// DEF-017: 카카오 알림톡 템플릿 구분자 제거
function sanitizeAlimtalk(value: string): string {
  return value.replace(/[\[\]#{}|]/g, '');
}

const AGENDA_TYPE_KR: Record<string, string> = {
  GENERAL: '일반안건',
  CONTRACTOR_SELECTION: '시공사 선정',
  DISSOLUTION: '조합 해산',
  BYLAW_AMENDMENT: '정관 변경',
  BUDGET_APPROVAL: '예산 승인',
  EXECUTIVE_ELECTION: '임원 선출',
};

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// 허용되는 상태 전이
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['NOTICE_SENT', 'CANCELLED'],
  NOTICE_SENT: ['CONVENED', 'CANCELLED'],
  CONVENED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['VOTING', 'CANCELLED'],
  VOTING: ['VOTING_CLOSED', 'CANCELLED'],
  VOTING_CLOSED: ['CLOSED'],
  CLOSED: ['ARCHIVED'],
};

/**
 * 총회 상태 전이
 * PATCH /api/assemblies/[assemblyId]/status
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }
    const { status: newStatus, reason } = body;

    const VALID_STATUSES = ['DRAFT', 'NOTICE_SENT', 'CONVENED', 'IN_PROGRESS', 'VOTING', 'VOTING_CLOSED', 'CLOSED', 'ARCHIVED', 'CANCELLED'];
    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: '유효하지 않은 상태 값입니다.' }, { status: 400 });
    }

    // SYSTEM_ADMIN(union_id=NULL)은 총회 운영 API 접근 불가 — 설계 의도
    // SYSTEM_ADMIN은 시스템 관리(조합 생성/삭제 등)만 담당하며, 총회는 조합 ADMIN이 운영
    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;

    // 현재 상태 조회
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 상태 전이 유효성 검증
    const allowed = VALID_TRANSITIONS[assembly.status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json({
        error: `${assembly.status}에서 ${newStatus}(으)로 전환할 수 없습니다.`,
      }, { status: 400 });
    }

    // 진행 중인 총회 취소 시 사유 필수
    if (newStatus === 'CANCELLED' && ['IN_PROGRESS', 'VOTING'].includes(assembly.status)) {
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return NextResponse.json({ error: '진행 중인 총회 취소 시 사유를 입력해야 합니다.' }, { status: 400 });
      }
    }

    // 상태 전이 실행
    let snapshotCount = 0;
    let alimtalkRequested = 0;
    let data;

    if (newStatus === 'NOTICE_SENT') {
      // NOTICE_SENT 전이: 원자적 RPC 사용 (상태전이 + 스냅샷 생성 단일 트랜잭션)
      // TODO: voting_weight는 현재 1.0 하드코딩 (transition_to_notice_sent RPC).
      // 차등 의결권 지원 시 users 테이블에 voting_weight 컬럼 추가 후 RPC 수정 필요.
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('transition_to_notice_sent', {
          p_assembly_id: assemblyId,
          p_union_id: unionId,
          p_actor_id: auth.user.id,
        });

      if (rpcError) {
        console.error('소집공고 RPC 실패:', rpcError);
        return NextResponse.json({ error: '소집공고 처리에 실패했습니다.' }, { status: 500 });
      }

      if (!rpcResult?.success) {
        return NextResponse.json({ error: rpcResult?.error || '소집공고 처리에 실패했습니다.' }, { status: 400 });
      }

      snapshotCount = rpcResult.snapshot_count || 0;

      // #2: 소집공고 내용 자동 생성 (법적 필수)
      await generateNoticeContent(supabase, assemblyId, unionId);

      const { data: updatedAssembly, error: fetchError } = await supabase
        .from('assemblies')
        .select()
        .eq('id', assemblyId)
        .eq('union_id', unionId)
        .single();

      if (fetchError || !updatedAssembly) {
        return NextResponse.json({ error: '총회 정보 조회에 실패했습니다.' }, { status: 500 });
      }

      data = updatedAssembly;

      // #1: 소집공고 알림톡 발송 (fire-and-forget)
      const tokens = rpcResult.tokens as Array<{
        user_id: string; member_name: string; member_phone: string; raw_token: string;
      }> | undefined;

      if (tokens && tokens.length > 0) {
        // 조합 slug 조회 (접속 링크 생성용)
        const { data: union } = await supabase
          .from('unions')
          .select('slug, name')
          .eq('id', unionId)
          .single();

        if (union) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://johapon.kr';
          const scheduledDate = updatedAssembly.scheduled_at
            ? new Date(updatedAssembly.scheduled_at).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })
            : '';

          const recipients = tokens
            .filter((t) => t.member_phone)
            .map((t) => ({
              phoneNumber: t.member_phone,
              name: t.member_name,
              variables: {
                조합명: sanitizeAlimtalk(union.name || ''),
                이름: sanitizeAlimtalk(t.member_name || ''),
                총회명: sanitizeAlimtalk(updatedAssembly.title || ''),
                일시: scheduledDate,
                장소: sanitizeAlimtalk(updatedAssembly.venue_address || '온라인'),
                접속링크: `${baseUrl}/${union.slug}/assembly/${assemblyId}?token=${t.raw_token}`,
              },
            }));

          alimtalkRequested = recipients.length;

          // 비동기 발송 — 실패해도 상태 전이 유지
          sendAlimTalk({
            unionId,
            templateCode: 'ASSEMBLY_NOTICE',
            recipients,
          }).then((result) => {
            if (result.success) {
              console.log(`소집공고 알림톡 발송 완료: ${recipients.length}건`);
            } else {
              console.error('소집공고 알림톡 발송 실패:', result.error);
            }
          }).catch((err) => {
            console.error('소집공고 알림톡 발송 오류:', err);
          });
        }
      }
    } else {
      // 일반 상태 전이
      const { data: updated, error: updateError } = await supabase
        .from('assemblies')
        .update({ status: newStatus })
        .eq('id', assemblyId)
        .eq('union_id', unionId)
        .select()
        .single();

      if (updateError || !updated) {
        console.error('상태 업데이트 실패:', updateError);
        return NextResponse.json({ error: '상태 변경에 실패했습니다.' }, { status: 500 });
      }

      data = updated;
    }

    // DEF-001: IN_PROGRESS→VOTING 전이 시 polls 일괄 OPEN (C-2)
    if (newStatus === 'VOTING' && assembly.status === 'IN_PROGRESS') {
      await supabase.from('polls')
        .update({ status: 'OPEN', opened_by: auth.user.id })
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('status', 'SCHEDULED');
    }

    // VOTING_CLOSED 전이 시 polls 일괄 CLOSED (C-3)
    if (newStatus === 'VOTING_CLOSED') {
      await supabase.from('polls')
        .update({ status: 'CLOSED', closed_by: auth.user.id })
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('status', 'OPEN');
    }

    // VOTING→CANCELLED 전이 시 polls 일괄 CANCELLED (C-4)
    if (newStatus === 'CANCELLED' && assembly.status === 'VOTING') {
      await supabase.from('polls').update({ status: 'CANCELLED' })
        .eq('assembly_id', assemblyId).eq('union_id', unionId).eq('status', 'OPEN');
    }

    // 감사 로그 기록 (해시 체인은 DB 트리거가 자동 계산)
    const eventData: Record<string, unknown> = {
      from_status: assembly.status,
      to_status: newStatus,
      ...(snapshotCount > 0 && { snapshot_count: snapshotCount }),
      ...(newStatus === 'CANCELLED' && reason && { cancellation_reason: reason.trim() }),
    };

    const { error: auditError } = await supabase
      .from('assembly_audit_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: 'STATUS_CHANGE',
        actor_id: auth.user.id,
        actor_role: 'ADMIN',
        target_type: 'assembly',
        target_id: assemblyId,
        event_data: eventData,
      });

    // 감사 로그 실패 시 상태 롤백
    if (auditError) {
      console.error('감사 로그 기록 실패:', auditError);
      await supabase.from('assemblies')
        .update({ status: assembly.status })
        .eq('id', assemblyId)
        .eq('union_id', unionId);
      return NextResponse.json({ error: '감사 로그 기록 실패로 상태 변경이 취소되었습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      ...(snapshotCount > 0 && {
        snapshot: { memberCount: snapshotCount },
        alimtalk: { requestedCount: alimtalkRequested },
      }),
    });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id]/status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 소집공고 내용 자동 생성 (법적 필수 내용 포함)
 * assemblies.notice_content에 마크다운 형태로 저장
 */
async function generateNoticeContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assemblyId: string,
  unionId: string,
) {
  // 총회 정보 조회
  const { data: assembly } = await supabase
    .from('assemblies')
    .select('title, assembly_type, scheduled_at, venue_address, stream_type, legal_basis')
    .eq('id', assemblyId)
    .eq('union_id', unionId)
    .single();

  if (!assembly) return;

  // 조합 정보 조회
  const { data: union } = await supabase
    .from('unions')
    .select('name')
    .eq('id', unionId)
    .single();

  // 안건 목록 조회
  const { data: agendas } = await supabase
    .from('agenda_items')
    .select('seq_order, title, agenda_type')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId)
    .order('seq_order', { ascending: true });

  // 투표 방법 목록 (polls에서 allow_* 확인)
  const { data: polls } = await supabase
    .from('polls')
    .select('allow_electronic, allow_written, allow_proxy, allow_onsite')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId);

  const votingMethods: string[] = [];
  if (polls?.some((p) => p.allow_electronic)) votingMethods.push('전자투표');
  if (polls?.some((p) => p.allow_onsite)) votingMethods.push('현장투표');
  if (polls?.some((p) => p.allow_written)) votingMethods.push('서면투표');
  if (polls?.some((p) => p.allow_proxy)) votingMethods.push('대리투표');
  if (votingMethods.length === 0) votingMethods.push('전자투표');

  const scheduledDate = assembly.scheduled_at
    ? new Date(assembly.scheduled_at).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', weekday: 'long',
      })
    : '미정';

  const assemblyType = ASSEMBLY_TYPE_KR[assembly.assembly_type] || assembly.assembly_type;
  const venue = assembly.venue_address || '온라인';
  const streamInfo = assembly.stream_type && assembly.stream_type !== 'NONE'
    ? '온라인 동시 참석 가능 (알림톡 접속 링크를 통해 입장)'
    : '';

  // 마크다운 소집공고 생성 (DB 값은 escapeMd로 마크다운 인젝션 방지)
  const unionName = escapeMd(union?.name || '');
  const assemblyTitle = escapeMd(assembly.title || '');
  const venueEscaped = escapeMd(venue);

  let content = `# ${unionName} ${assemblyType} 소집공고\n\n`;
  content += `아래와 같이 **${assemblyType}**를 소집하오니 조합원 여러분의 참석을 부탁드립니다.\n\n`;
  content += `## 총회 개요\n\n`;
  content += `- **총회명**: ${assemblyTitle}\n`;
  content += `- **일시**: ${scheduledDate}\n`;
  content += `- **장소**: ${venueEscaped}\n`;
  content += `- **투표 방법**: ${votingMethods.join(', ')}\n`;
  if (streamInfo) content += `- **온라인 참석**: ${streamInfo}\n`;
  content += `\n`;

  // 안건 목록
  content += `## 안건\n\n`;
  if (agendas && agendas.length > 0) {
    agendas.forEach((a) => {
      const agendaType = AGENDA_TYPE_KR[a.agenda_type] || a.agenda_type;
      content += `${a.seq_order}. **${escapeMd(a.title || '')}** (${agendaType})\n`;
    });
  } else {
    content += '*(안건 없음)*\n';
  }
  content += `\n`;

  // 투표 안내
  content += `## 투표 안내\n\n`;
  content += `- 알림톡으로 발송된 접속 링크를 통해 투표에 참여할 수 있습니다.\n`;
  content += `- 본인 확인을 위해 카카오 로그인이 필요합니다.\n`;
  content += `- 개인정보 수집·이용 동의 후 투표가 가능합니다.\n\n`;

  // 법적 근거
  content += `## 법적 근거\n\n`;
  content += assembly.legal_basis
    ? `${escapeMd(assembly.legal_basis)}\n`
    : `도시 및 주거환경정비법 및 해당 조합 정관에 의거하여 본 총회를 소집합니다.\n`;

  // notice_content 저장
  await supabase
    .from('assemblies')
    .update({ notice_content: content })
    .eq('id', assemblyId)
    .eq('union_id', unionId);
}
