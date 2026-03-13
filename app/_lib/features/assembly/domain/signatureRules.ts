// 서명 규칙 — 순수 TypeScript, 프레임워크 의존성 없음

import type {
  OfficialDocumentType,
  SignerRole,
  DocumentRequiredSigner,
} from '@/app/_lib/shared/type/assembly.types';

/** 의사록 필수 서명자 (도시정비법 제45조 제6항) */
export const MINUTES_REQUIRED_ROLES: SignerRole[] = ['CHAIRPERSON', 'DIRECTOR', 'AUDITOR'];

/** 의사록 기본 서명 임계값 */
export const MINUTES_SIGNATURE_THRESHOLD = 3;

/** 문서 유형별 기본 필수 서명자 역할 */
export function getDefaultRequiredSignerRoles(docType: OfficialDocumentType): SignerRole[] {
  switch (docType) {
    case 'MINUTES':
      return [...MINUTES_REQUIRED_ROLES];
    case 'RESULT_PUBLICATION':
      return ['CHAIRPERSON', 'ADMIN'];
    case 'EVIDENCE_PACKAGE_SUMMARY':
      return ['CHAIRPERSON', 'AUDITOR'];
    case 'CONSENT_FORM':
    case 'PROXY_FORM':
    case 'WRITTEN_RESOLUTION':
      return ['MEMBER'];
    case 'CONVOCATION_NOTICE':
    case 'AGENDA_EXPLANATION':
    case 'E_VOTING_GUIDE':
      return []; // 서명 불필요
    default:
      return ['ADMIN'];
  }
}

/** 문서 유형별 기본 서명 임계값 */
export function getDefaultSignatureThreshold(docType: OfficialDocumentType): number {
  switch (docType) {
    case 'MINUTES':
      return MINUTES_SIGNATURE_THRESHOLD;
    case 'RESULT_PUBLICATION':
      return 2;
    case 'EVIDENCE_PACKAGE_SUMMARY':
      return 2;
    case 'CONSENT_FORM':
    case 'PROXY_FORM':
    case 'WRITTEN_RESOLUTION':
      return 1;
    case 'CONVOCATION_NOTICE':
    case 'AGENDA_EXPLANATION':
    case 'E_VOTING_GUIDE':
      return 0; // 서명 불필요
    default:
      return 1;
  }
}

/** 서명자가 필수 서명자 목록에 포함되어 있는지 확인 */
export function isRequiredSigner(
  signerId: string,
  requiredSigners: DocumentRequiredSigner[]
): boolean {
  return requiredSigners.some((s) => s.signer_id === signerId);
}

/** 서명 진행률 계산 */
export function calculateSignatureProgress(
  currentCount: number,
  threshold: number
): { percent: number; isComplete: boolean } {
  if (threshold <= 0) return { percent: 100, isComplete: true };
  const percent = Math.min(Math.round((currentCount / threshold) * 100), 100);
  return { percent, isComplete: currentCount >= threshold };
}
