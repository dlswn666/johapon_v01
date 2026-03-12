// 컴플라이언스 엔진 타입 — 순수 TypeScript, 프레임워크 의존성 없음

import type {
  ComplianceCheckpoint,
  ComplianceSeverity,
  ComplianceRuleLayer,
  ComplianceRuleCategory,
  AssemblyStatus,
  AgendaType,
} from '@/app/_lib/shared/type/assembly.types';

/** 컴플라이언스 규칙 인터페이스 */
export interface ComplianceRule {
  code: string;
  layer: ComplianceRuleLayer;
  category: ComplianceRuleCategory;
  severity: ComplianceSeverity;
  evaluate: (context: ComplianceContext) => ComplianceResult;
  legalBasis: string | null;
  description: string;
  remediation: string;
  evaluateAt: ComplianceCheckpoint[];
  is_overridable: boolean;
}

/** 컴플라이언스 평가 컨텍스트 */
export interface ComplianceContext {
  assemblyId: string;
  assemblyStatus: AssemblyStatus;
  scheduledAt: string;
  noticeSentAt: string | null;
  noticeDocumentExists: boolean;
  notificationDelivered: boolean;
  deliveryRate: number;
  snapshotCreated: boolean;
  tokensIssued: boolean;
  identityVerificationLevel: string;
  agendaCount: number;
  agendaItems: ComplianceAgendaContext[];
  pollsReady: boolean;
  secretBallotEnabled: boolean;
  quorumMet: boolean;
  tallyExists: boolean;
  tallyHashValid: boolean;
  minutesSealed: boolean;
  resultPublished: boolean;
  evidencePackaged: boolean;
  signaturesComplete: boolean;
}

export interface ComplianceAgendaContext {
  agendaType: AgendaType;
  hasQuorumThreshold: boolean;
  hasApprovalThreshold: boolean;
}

/** 컴플라이언스 평가 결과 */
export interface ComplianceResult {
  status: 'PASS' | 'FAIL';
  message: string;
  contextData?: Record<string, unknown>;
}
