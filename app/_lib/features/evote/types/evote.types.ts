// 전자투표 관련 타입 정의

// 전자투표 상태
export type EvoteStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED';

// 전자투표 유형
export type EvoteType = 'APPROVAL' | 'ELECTION' | 'SURVEY';

// 투표 항목 유형
export type EvoteItemType = 'YES_NO' | 'SINGLE_CHOICE' | 'MULTI_CHOICE';

// 투표 결과 상태
export type EvoteResultStatus = 'PASSED' | 'REJECTED' | 'PENDING';

// 전자투표 상태 한국어 레이블
export const EVOTE_STATUS_LABELS: Record<EvoteStatus, string> = {
  DRAFT: '초안',
  SCHEDULED: '예정',
  IN_PROGRESS: '진행중',
  CLOSED: '종료',
  CANCELLED: '취소',
};

// 전자투표 유형 한국어 레이블
export const EVOTE_TYPE_LABELS: Record<EvoteType, string> = {
  APPROVAL: '안건 의결',
  ELECTION: '선거',
  SURVEY: '설문',
};

// 투표 항목 유형 한국어 레이블
export const EVOTE_ITEM_TYPE_LABELS: Record<EvoteItemType, string> = {
  YES_NO: '찬반투표',
  SINGLE_CHOICE: '단일선택',
  MULTI_CHOICE: '복수선택',
};

// 전자투표 안건(항목)
export interface EvoteItem {
  id: string;
  evote_id: string;
  title: string;
  description: string | null;
  item_type: EvoteItemType;
  options: string[];        // 선택지 목록 (찬반의 경우 ['찬성','반대'])
  sort_order: number;
  created_at: string;
}

// 전자투표 엔티티
export interface Evote {
  id: string;
  union_id: string;
  title: string;
  description: string | null;
  evote_type: EvoteType;
  status: EvoteStatus;
  start_at: string | null;
  end_at: string | null;
  quorum_required: number | null;  // 의결 정족수 (%)
  total_voters: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: EvoteItem[];
}

// 전자투표 생성 입력
export interface NewEvote {
  title: string;
  description?: string | null;
  evote_type: EvoteType;
  start_at?: string | null;
  end_at?: string | null;
  quorum_required?: number | null;
  items?: Omit<EvoteItem, 'id' | 'evote_id' | 'created_at'>[];
}

// 전자투표 수정 입력
export interface UpdateEvote {
  title?: string;
  description?: string | null;
  evote_type?: EvoteType;
  status?: EvoteStatus;
  start_at?: string | null;
  end_at?: string | null;
  quorum_required?: number | null;
}

// 전자투표 목록 필터
export interface EvoteListFilter {
  status?: EvoteStatus;
  evote_type?: EvoteType;
  search?: string;
}

// 전자투표 요약 통계
export interface EvoteSummary {
  total: number;
  draft: number;
  scheduled: number;
  in_progress: number;
  closed: number;
}

// ============================================
// 위저드 관련 타입
// ============================================

// 위저드 스텝 번호
export type WizardStep = 1 | 2 | 3 | 4 | 5;

// 총회 유형
export type AssemblyType = 'REGULAR' | 'EXTRAORDINARY' | 'FOUNDING' | 'DELEGATE';

// 의결요건 유형
export type QuorumType = 'GENERAL' | 'SPECIAL' | 'SPECIAL_TWO_THIRDS' | 'CONTRACTOR';

// 투표 유형 (안건별)
export type VoteType = 'APPROVE' | 'ELECT' | 'SELECT';

// 게시 방식
export type PublishMode = 'IMMEDIATE' | 'SCHEDULED';

// 알림 채널
export type NotificationChannel = 'KAKAO_ALIMTALK' | 'SMS' | 'EMAIL';

// 후보자 정보
export interface CandidateInfo {
  name: string;
  info: string;
}

// 업체 정보
export interface CompanyInfo {
  name: string;
  bidAmount: string;
  info: string;
}

// 안건 데이터
export interface AgendaFormData {
  id: string;
  title: string;
  description: string;
  voteType: VoteType;
  electCount?: number;
  quorumTypeOverride?: QuorumType | null;
  candidates: CandidateInfo[];
  companies: CompanyInfo[];
}

// 투표 대상자 선택 모드
export type VoterFilterMode = 'ALL' | 'DELEGATE_ONLY';

// 위저드 폼 전체 데이터
export interface EvoteCreateForm {
  // STEP 1: 기본 정보
  assemblyType: AssemblyType;
  title: string;
  quorumType: QuorumType;
  scheduledAt: string;
  documentFiles: File[];

  // STEP 2: 안건
  agendas: AgendaFormData[];

  // STEP 3: 투표 대상자
  voterFilter: VoterFilterMode;
  selectedVoterIds: string[];

  // STEP 4: 일정/알림
  publishMode: PublishMode;
  publishAt: string;
  preVoteStartAt: string;
  preVoteEndAt: string;
  finalDeadline: string;
  autoReminder: boolean;
  notificationChannels: NotificationChannel[];

  // STEP 5: 확인 (데이터 없음 — 요약만 표시)
}
