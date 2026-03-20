// 총회 상태 머신 — 순수 TypeScript, 프레임워크 의존성 없음
// 전이 규칙의 단일 소스 (Single Source of Truth)

import type { AssemblyStatus } from '@/app/_lib/shared/type/assembly.types';

/** 허용된 상태 전이 맵 (설계문서 정합: PRE_VOTING 추가) */
const VALID_TRANSITIONS: Record<AssemblyStatus, AssemblyStatus[]> = {
  DRAFT: ['NOTICE_SENT', 'CANCELLED'],
  NOTICE_SENT: ['CONVENED', 'PRE_VOTING', 'CANCELLED'],
  PRE_VOTING: ['CONVENED', 'IN_PROGRESS', 'CANCELLED'],  // 사전투표 → 총회 당일 전환
  CONVENED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['VOTING', 'CANCELLED'],
  VOTING: ['VOTING_CLOSED', 'CANCELLED', 'PAUSED', 'WRITTEN_TRANSITION'],
  PAUSED: ['VOTING', 'CANCELLED'],             // 재개 또는 취소
  WRITTEN_TRANSITION: ['VOTING_CLOSED'],        // 서면투표 완료 후 마감
  VOTING_CLOSED: ['CLOSED', 'CANCELLED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: [],
};

/** 상태 전이에 컴플라이언스 게이팅이 필요한 체크포인트 */
export const TRANSITION_CHECKPOINTS: Partial<Record<string, string>> = {
  'DRAFT->NOTICE_SENT': 'BEFORE_NOTICE',
  'NOTICE_SENT->PRE_VOTING': 'BEFORE_PRE_VOTING',
  'NOTICE_SENT->CONVENED': 'BEFORE_CONVENE',
  'PRE_VOTING->CONVENED': 'BEFORE_CONVENE',
  'PRE_VOTING->IN_PROGRESS': 'BEFORE_START',
  'CONVENED->IN_PROGRESS': 'BEFORE_START',
  'IN_PROGRESS->VOTING': 'BEFORE_VOTING',
  'VOTING_CLOSED->CLOSED': 'BEFORE_PUBLISH',
  'CLOSED->ARCHIVED': 'BEFORE_ARCHIVE',
};

/** 상태 전이 가능 여부 확인 */
export function canTransition(from: AssemblyStatus, to: AssemblyStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** 가능한 다음 상태 목록 */
export function getNextStates(current: AssemblyStatus): AssemblyStatus[] {
  return [...(VALID_TRANSITIONS[current] || [])];
}

/** 상태 전이 시 필요한 컴플라이언스 체크포인트 (없으면 null) */
export function getTransitionCheckpoint(from: AssemblyStatus, to: AssemblyStatus): string | null {
  return TRANSITION_CHECKPOINTS[`${from}->${to}`] || null;
}

/** 상태가 종료 상태인지 확인 */
export function isTerminalState(status: AssemblyStatus): boolean {
  return status === 'ARCHIVED' || status === 'CANCELLED';
}

/** 상태가 편집 가능한지 확인 */
export function isEditableState(status: AssemblyStatus): boolean {
  return status === 'DRAFT' || status === 'NOTICE_SENT';
}

/** 상태가 진행 중인지 확인 */
export function isLiveState(status: AssemblyStatus): boolean {
  return ['PRE_VOTING', 'IN_PROGRESS', 'VOTING', 'VOTING_CLOSED'].includes(status);
}

/** 사전투표 중인지 확인 */
export function isPreVotingState(status: AssemblyStatus): boolean {
  return status === 'PRE_VOTING';
}

/** 투표 가능한 상태인지 확인 (사전투표 또는 투표 진행 중) */
export function isVotingAllowed(status: AssemblyStatus): boolean {
  return status === 'PRE_VOTING' || status === 'VOTING';
}
