// 문서 상태 머신 — 순수 TypeScript, 프레임워크 의존성 없음

import type { DocumentStatus } from '@/app/_lib/shared/type/assembly.types';

/** 허용된 문서 상태 전이 맵 */
const VALID_DOC_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ['GENERATED'],
  GENERATED: ['REVIEW', 'SUPERSEDED', 'VOID'],
  REVIEW: ['APPROVED', 'GENERATED', 'SUPERSEDED', 'VOID'],
  APPROVED: ['SIGNED_PARTIAL', 'SUPERSEDED', 'VOID'],
  SIGNED_PARTIAL: ['SIGNED_COMPLETE', 'SUPERSEDED', 'VOID'],
  SIGNED_COMPLETE: ['SEALED', 'SUPERSEDED', 'VOID'],
  SEALED: ['SUPERSEDED'],
  SUPERSEDED: [],
  VOID: [],
};

/** 문서 상태 전이 가능 여부 확인 */
export function canDocTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  return VALID_DOC_TRANSITIONS[from]?.includes(to) ?? false;
}

/** 가능한 다음 문서 상태 목록 */
export function getNextDocStates(current: DocumentStatus): DocumentStatus[] {
  return VALID_DOC_TRANSITIONS[current] || [];
}

/** 서명 가능 상태인지 확인 */
export function isSignableStatus(status: DocumentStatus): boolean {
  return status === 'APPROVED' || status === 'SIGNED_PARTIAL';
}

/** 불변(수정 불가) 상태인지 확인 */
export function isImmutableStatus(status: DocumentStatus): boolean {
  return status === 'SEALED' || status === 'VOID';
}

/** 봉인 가능 상태인지 확인 */
export function isSealableStatus(status: DocumentStatus): boolean {
  return status === 'SIGNED_COMPLETE';
}

/** 검토 가능 상태인지 확인 */
export function isReviewableStatus(status: DocumentStatus): boolean {
  return status === 'GENERATED';
}
