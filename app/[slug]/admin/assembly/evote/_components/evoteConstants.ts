import type {
  EvoteStatus,
  EvoteType,
  AssemblyType,
  QuorumType,
  VoteType,
  WizardStep,
} from '@/app/_lib/features/evote/types/evote.types';

// 전자투표 상태별 배지 색상
export const EVOTE_STATUS_BADGE: Record<EvoteStatus, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600' },
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-green-100', text: 'text-green-700' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-600' },
};

// 전자투표 유형별 배지 색상
export const EVOTE_TYPE_BADGE: Record<EvoteType, { bg: string; text: string }> = {
  APPROVAL: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  ELECTION: { bg: 'bg-amber-100', text: 'text-amber-700' },
  SURVEY: { bg: 'bg-teal-100', text: 'text-teal-700' },
};

// 전자투표 목록 페이지 사이즈
export const EVOTE_PAGE_SIZE = 10;

// 전자투표 탭 필터 옵션
export const EVOTE_TAB_FILTERS = [
  { label: '전체', value: 'ALL' as const },
  { label: '진행중', value: 'IN_PROGRESS' as EvoteStatus },
  { label: '예정', value: 'SCHEDULED' as EvoteStatus },
  { label: '종료', value: 'CLOSED' as EvoteStatus },
  { label: '초안', value: 'DRAFT' as EvoteStatus },
] as const;

// ============================================
// 위저드 상수
// ============================================

// 위저드 스텝 정의
export const WIZARD_STEPS: { step: WizardStep; label: string; description: string }[] = [
  { step: 1, label: '기본 정보', description: '총회 유형 및 일정' },
  { step: 2, label: '안건 등록', description: '투표 안건 설정' },
  { step: 3, label: '투표 대상', description: '참여 조합원 선택' },
  { step: 4, label: '일정·알림', description: '게시 및 알림 설정' },
  { step: 5, label: '최종 확인', description: '생성 전 검토' },
];

// 총회 유형 옵션
export const ASSEMBLY_TYPE_OPTIONS: { value: AssemblyType; label: string }[] = [
  { value: 'REGULAR', label: '정기총회' },
  { value: 'EXTRAORDINARY', label: '임시총회' },
  { value: 'FOUNDING', label: '창립총회' },
  { value: 'DELEGATE', label: '대의원회' },
];

// 의결요건 옵션
export const QUORUM_TYPE_OPTIONS: { value: QuorumType; label: string; description: string }[] = [
  { value: 'GENERAL', label: '일반의결', description: '직접출석 10% + 출석 과반수 찬성' },
  { value: 'SPECIAL', label: '특별의결', description: '직접출석 20% + 전체 과반수 찬성' },
  { value: 'SPECIAL_TWO_THIRDS', label: '특별의결(가중)', description: '직접출석 20% + 전체 2/3 찬성' },
  { value: 'CONTRACTOR', label: '시공사 선정', description: '직접출석 과반수 + 출석 과반수 찬성' },
];

// 투표 유형 옵션
export const VOTE_TYPE_OPTIONS: { value: VoteType; label: string; description: string }[] = [
  { value: 'APPROVE', label: '찬반투표', description: '찬성/반대/기권 투표' },
  { value: 'ELECT', label: '선출투표', description: '후보자 선출' },
  { value: 'SELECT', label: '업체 선정', description: '시공사/업체 선정' },
];

// 의결요건 레이블
export const QUORUM_TYPE_LABELS: Record<QuorumType, string> = {
  GENERAL: '일반의결',
  SPECIAL: '특별의결',
  SPECIAL_TWO_THIRDS: '특별의결(가중)',
  CONTRACTOR: '시공사 선정',
};

// 투표 유형 레이블
export const VOTE_TYPE_LABELS: Record<VoteType, string> = {
  APPROVE: '찬반투표',
  ELECT: '선출투표',
  SELECT: '업체 선정',
};

// 총회 유형 레이블
export const ASSEMBLY_TYPE_LABELS: Record<AssemblyType, string> = {
  REGULAR: '정기총회',
  EXTRAORDINARY: '임시총회',
  FOUNDING: '창립총회',
  DELEGATE: '대의원회',
};
