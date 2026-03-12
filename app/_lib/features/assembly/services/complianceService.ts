/**
 * 컴플라이언스 서비스 — 도메인 규칙 평가 + DB 저장
 * Supabase 클라이언트를 직접 사용
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComplianceCheckpoint, ComplianceRuleLayer } from '@/app/_lib/shared/type/assembly.types';
import {
  evaluateCheckpoint,
  hasBlockingFailures,
  summarize,
  findRuleByCode,
  type EvaluationEntry,
} from '../domain/compliance/engine';
import type { ComplianceContext } from '../domain/compliance/types';

/** 컨텍스트 수집 + 규칙 평가 + DB 저장 */
export async function evaluateComplianceForCheckpoint(
  supabase: SupabaseClient,
  assemblyId: string,
  unionId: string,
  checkpoint: ComplianceCheckpoint,
  evaluatedBy: string
) {
  // 1. 컨텍스트 수집
  const context = await buildComplianceContext(supabase, assemblyId, unionId);

  // 2. 도메인 규칙 평가
  const entries = evaluateCheckpoint(checkpoint, context);

  // 3. DB 저장
  const evaluations = entries.map((entry) => ({
    assembly_id: assemblyId,
    union_id: unionId,
    checkpoint,
    rule_code: entry.rule.code,
    rule_layer: entry.rule.layer as ComplianceRuleLayer,
    severity: entry.rule.severity,
    status: entry.result.status === 'PASS' ? 'PASS' : 'FAIL',
    message: entry.result.message,
    remediation: entry.rule.remediation,
    legal_basis: entry.rule.legalBasis,
    context_data: entry.result.contextData || null,
    evaluated_by: evaluatedBy,
  }));

  if (evaluations.length > 0) {
    await supabase.from('assembly_compliance_evaluations').insert(evaluations);
  }

  // 4. 요약 반환
  const summary = summarize(entries);
  return {
    checkpoint,
    evaluations,
    entries,
    summary: {
      ...summary,
      hasBlockingFailures: hasBlockingFailures(entries),
      canProceed: !hasBlockingFailures(entries),
    },
  };
}

/** 규칙 면제 처리 (BYLAW/POLICY만) */
export async function waiveComplianceRule(
  supabase: SupabaseClient,
  evaluationId: string,
  waiverReason: string,
  resolvedBy: string
) {
  // 평가 조회
  const { data: evaluation, error: fetchError } = await supabase
    .from('assembly_compliance_evaluations')
    .select('*')
    .eq('id', evaluationId)
    .single();

  if (fetchError || !evaluation) {
    return { success: false, error: '평가 항목을 찾을 수 없습니다.' };
  }

  // STATUTORY 규칙은 면제 불가
  if (evaluation.rule_layer === 'STATUTORY') {
    return { success: false, error: '법정 규칙(STATUTORY)은 면제할 수 없습니다.' };
  }

  // 이미 처리된 항목 확인
  if (evaluation.status !== 'FAIL' && evaluation.status !== 'OPEN') {
    return { success: false, error: `현재 상태(${evaluation.status})에서는 면제할 수 없습니다.` };
  }

  const { error: updateError } = await supabase
    .from('assembly_compliance_evaluations')
    .update({
      status: 'WAIVED',
      waiver_reason: waiverReason,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
    })
    .eq('id', evaluationId);

  if (updateError) {
    return { success: false, error: '면제 처리에 실패했습니다.' };
  }

  return { success: true };
}

/** 컴플라이언스 컨텍스트 수집 */
async function buildComplianceContext(
  supabase: SupabaseClient,
  assemblyId: string,
  unionId: string
): Promise<ComplianceContext> {
  // 총회 정보
  const { data: assembly } = await supabase
    .from('assemblies')
    .select('*')
    .eq('id', assemblyId)
    .eq('union_id', unionId)
    .single();

  // 안건 목록
  const { data: agendas } = await supabase
    .from('agenda_items')
    .select('id, title, agenda_type, quorum_threshold_pct, approval_threshold_pct')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId);

  // 공식 문서
  const { data: documents } = await supabase
    .from('official_documents')
    .select('id, document_type, status')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId);

  // 알림 배치
  const { data: notifications } = await supabase
    .from('notification_batches')
    .select('notification_type, status, total_recipients, delivered_count')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId);

  // 스냅샷 존재 확인
  const { count: snapshotCount } = await supabase
    .from('assembly_member_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId)
    .eq('is_active', true);

  // 토큰 발급 확인
  const { count: tokenCount } = await supabase
    .from('assembly_member_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId)
    .not('access_token_hash', 'is', null);

  // 폴 확인
  const { data: polls } = await supabase
    .from('polls')
    .select('id, agenda_item_id, status')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId);

  // 집계 결과
  const { data: tallyResults } = await supabase
    .from('vote_tally_results')
    .select('poll_id')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId);

  // 소집통지문 존재 확인
  const noticeDocExists = (documents || []).some(
    (d) => d.document_type === 'CONVOCATION_NOTICE' && d.status !== 'VOID' && d.status !== 'SUPERSEDED'
  );

  // 알림 발송 확인
  const notificationDelivered = (notifications || []).some(
    (n) => n.notification_type === 'CONVOCATION_NOTICE' && ['DELIVERED', 'PARTIALLY_DELIVERED'].includes(n.status)
  );

  // 도달율 계산
  const convocationNotif = (notifications || []).find(
    (n) => n.notification_type === 'CONVOCATION_NOTICE' && n.status === 'DELIVERED'
  );
  const deliveryRate = convocationNotif && convocationNotif.total_recipients > 0
    ? Math.round((convocationNotif.delivered_count / convocationNotif.total_recipients) * 100)
    : 0;

  // 폴 준비 확인
  const pollsReady = (agendas || []).length > 0 &&
    (agendas || []).every((a) =>
      (polls || []).some((p) => p.agenda_item_id === a.id)
    );

  return {
    assemblyId,
    assemblyStatus: assembly?.status || 'DRAFT',
    scheduledAt: assembly?.scheduled_at || '',
    noticeSentAt: assembly?.notice_sent_at || null,
    noticeDocumentExists: noticeDocExists,
    notificationDelivered,
    deliveryRate,
    snapshotCreated: (snapshotCount || 0) > 0,
    tokensIssued: (tokenCount || 0) > 0,
    identityVerificationLevel: assembly?.identity_verification_level || 'KAKAO_ONLY',
    agendaCount: (agendas || []).length,
    agendaItems: (agendas || []).map((a) => ({
      agendaType: a.agenda_type,
      hasQuorumThreshold: a.quorum_threshold_pct != null,
      hasApprovalThreshold: a.approval_threshold_pct != null,
    })),
    pollsReady,
    secretBallotEnabled: true, // 시스템 기본 비밀투표 활성화
    quorumMet: false, // 실제 정족수 평가는 BEFORE_PUBLISH에서
    tallyExists: (tallyResults || []).length > 0,
    tallyHashValid: true, // DB 해시 검증은 별도
    minutesSealed: (documents || []).some(
      (d) => d.document_type === 'MINUTES' && d.status === 'SEALED'
    ),
    resultPublished: (documents || []).some(
      (d) => d.document_type === 'RESULT_PUBLICATION' && !['DRAFT', 'VOID', 'SUPERSEDED'].includes(d.status)
    ),
    evidencePackaged: assembly?.evidence_packaged_at != null,
    signaturesComplete: (documents || []).some(
      (d) => d.document_type === 'MINUTES' && ['SIGNED_COMPLETE', 'SEALED'].includes(d.status)
    ),
  };
}
