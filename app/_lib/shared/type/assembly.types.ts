// Assembly 관련 타입 정의 (실제 DB 스키마 기반)

export type AssemblyStatus = 'DRAFT' | 'NOTICE_SENT' | 'CONVENED' | 'IN_PROGRESS' | 'VOTING' | 'VOTING_CLOSED' | 'CLOSED' | 'ARCHIVED' | 'CANCELLED';
export type AssemblyType = 'REGULAR' | 'EXTRAORDINARY' | 'ONLINE_ONLY';
export type StreamType = 'ZOOM' | 'YOUTUBE' | 'BOTH' | 'NONE';
export type PollStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type AgendaType = 'GENERAL' | 'CONTRACTOR_SELECTION' | 'DISSOLUTION' | 'BYLAW_AMENDMENT' | 'BUDGET_APPROVAL' | 'EXECUTIVE_ELECTION';
export type VotingMethod = 'ELECTRONIC' | 'ONSITE' | 'WRITTEN' | 'PROXY';
export type AttendanceType = 'ONLINE' | 'ONSITE' | 'WRITTEN_PROXY';
export type QuestionVisibility = 'PUBLIC' | 'ADMIN_ONLY' | 'AFTER_APPROVAL';
export type SpeakerRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type WrittenBallotStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'DISPUTED' | 'CANCELLED';

export interface Assembly {
  id: string;
  union_id: string;
  title: string;
  description: string | null;
  assembly_type: AssemblyType;
  status: AssemblyStatus;
  scheduled_at: string;
  opened_at: string | null;
  closed_at: string | null;
  venue_address: string | null;
  stream_type: StreamType | null;
  zoom_meeting_id: string | null;
  youtube_video_id: string | null;
  notice_sent_at: string | null;
  notice_content: string | null;
  quorum_total_members: number | null;
  roster_version: string | null;
  minutes_draft: string | null;
  minutes_finalized_at: string | null;
  evidence_package_url: string | null;
  evidence_packaged_at: string | null;
  legal_basis: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type NewAssembly = Pick<Assembly, 'title' | 'scheduled_at' | 'assembly_type'> & Partial<Pick<Assembly, 'description' | 'venue_address' | 'stream_type' | 'zoom_meeting_id' | 'youtube_video_id' | 'legal_basis'>>;

export type UpdateAssembly = Partial<Omit<Assembly, 'id' | 'union_id' | 'created_by' | 'created_at' | 'updated_at'>>;

// DB: agenda_items 테이블 (실제 컬럼명 사용)
export interface AgendaItem {
  id: string;
  assembly_id: string;
  union_id: string;
  seq_order: number;
  title: string;
  description: string | null;
  agenda_type: AgendaType;
  quorum_threshold_pct: number | null;
  quorum_requires_direct: boolean;
  approval_threshold_pct: number | null;
  created_at: string;
  updated_at: string;
}

export type NewAgendaItem = Pick<AgendaItem, 'title' | 'agenda_type'> & Partial<Pick<AgendaItem, 'description' | 'seq_order' | 'quorum_threshold_pct' | 'quorum_requires_direct' | 'approval_threshold_pct'>>;

export type UpdateAgendaItem = Partial<Omit<AgendaItem, 'id' | 'assembly_id' | 'union_id' | 'created_at' | 'updated_at'>>;

// DB: polls 테이블 (실제 컬럼명 사용)
export interface Poll {
  id: string;
  agenda_item_id: string;
  assembly_id: string;
  union_id: string;
  opens_at: string;
  closes_at: string;
  allow_vote_revision: boolean;
  allow_abstain: boolean;
  status: PollStatus;
  opened_by: string | null;
  closed_by: string | null;
  allow_electronic: boolean;
  allow_written: boolean;
  allow_proxy: boolean;
  allow_onsite: boolean;
  created_at: string;
  updated_at: string;
}

// DB: poll_options 테이블
export interface PollOption {
  id: string;
  poll_id: string;
  union_id: string;
  seq_order: number;
  label: string;
  option_type: string;
  description: string | null;
  created_at: string;
}

// 안건 + 관계 데이터
export interface AgendaItemWithPoll extends AgendaItem {
  polls?: Poll[];
}

export interface AgendaItemWithDocuments extends AgendaItem {
  agenda_documents?: AgendaDocument[];
}

export interface AgendaDocument {
  id: string;
  agenda_item_id: string | null;
  assembly_id: string;
  union_id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  version: number;
  is_current: boolean;
  uploaded_by: string;
  uploaded_at: string;
}

// 총회 목록 아이템 (목록 뷰용 요약)
export interface AssemblyListItem extends Assembly {
  creator?: { id: string; name: string } | null;
  agenda_count?: number;
}

// 상태 한국어 레이블
export const ASSEMBLY_STATUS_LABELS: Record<AssemblyStatus, string> = {
  DRAFT: '초안',
  NOTICE_SENT: '소집공고',
  CONVENED: '소집완료',
  IN_PROGRESS: '진행중',
  VOTING: '투표진행',
  VOTING_CLOSED: '투표마감',
  CLOSED: '종료',
  ARCHIVED: '보관',
  CANCELLED: '취소',
};

export const ASSEMBLY_TYPE_LABELS: Record<AssemblyType, string> = {
  REGULAR: '정기총회',
  EXTRAORDINARY: '임시총회',
  ONLINE_ONLY: '서면총회',
};

export const AGENDA_TYPE_LABELS: Record<AgendaType, string> = {
  GENERAL: '일반안건',
  CONTRACTOR_SELECTION: '시공사 선정',
  DISSOLUTION: '조합 해산',
  BYLAW_AMENDMENT: '정관 변경',
  BUDGET_APPROVAL: '예산 승인',
  EXECUTIVE_ELECTION: '임원 선출',
};

// DB: assembly_member_snapshots 테이블 (총회 시점 조합원 스냅샷)
export interface AssemblyMemberSnapshot {
  id: string;
  assembly_id: string;
  union_id: string;
  user_id: string;
  member_name: string;
  member_phone: string | null;
  property_address: string | null;
  voting_weight: number;
  member_type: string;
  proxy_user_id: string | null;
  proxy_name: string | null;
  proxy_authorized_at: string | null;
  access_token_hash: string | null;
  token_expires_at: string | null;
  token_used_at: string | null;
  identity_verified_at: string | null;
  identity_method: string | null;
  consent_agreed_at: string | null;
  is_active: boolean;
  created_at: string;
}

// DB: participation_records 테이블 (누가 투표했는지 — 비밀투표 분리)
export interface ParticipationRecord {
  id: string;
  poll_id: string;
  assembly_id: string;
  union_id: string;
  snapshot_id: string;
  user_id: string;
  voting_method: VotingMethod;
  proxy_user_id: string | null;
  first_voted_at: string;
  last_voted_at: string;
  vote_count: number;
  receipt_token: string | null;
  created_at: string;
  updated_at: string;
}

// DB: assembly_attendance_logs 테이블 (출석 기록)
export interface AssemblyAttendanceLog {
  id: string;
  assembly_id: string;
  union_id: string;
  snapshot_id: string;
  user_id: string;
  attendance_type: AttendanceType;
  entry_at: string | null;
  exit_at: string | null;
  session_id: string | null;
  qr_checkin_at: string | null;
  qr_checkout_at: string | null;
  checkin_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown> | null;
  identity_verified: boolean;
  identity_method: string | null;
  identity_verified_at: string | null;
  created_at: string;
}

// 클라이언트 전달용 스냅샷 (access_token_hash 제외)
export type AssemblyMemberSnapshotPublic = Omit<AssemblyMemberSnapshot, 'access_token_hash'>;

// 내 투표 정보 (API /api/votes/my 응답 기반)
export interface MyVoteInfo {
  poll_id: string;
  receipt_token: string | null;
  first_voted_at: string;
  last_voted_at: string;
  vote_count: number;
  voting_method: VotingMethod;
  /** API 서버에서 계산: allow_vote_revision && status=OPEN && closes_at > now */
  can_revise: boolean;
}

// 투표 실행 결과
export interface CastVoteResult {
  success: boolean;
  receipt_token: string | null;
}

// 총회 접근 검증 결과
export interface AssemblyAccessResult {
  snapshot: AssemblyMemberSnapshotPublic;
  assembly: Assembly;
  agendaItems: (AgendaItem & { polls?: (Poll & { poll_options?: PollOption[] })[] })[];
}

// DB: assembly_questions 테이블 (총회 중 Q&A)
export interface AssemblyQuestion {
  id: string;
  assembly_id: string;
  agenda_item_id: string | null;
  union_id: string;
  snapshot_id: string;
  user_id: string;
  content: string;
  visibility: QuestionVisibility;
  is_approved: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  is_read_aloud: boolean;
  submitted_at: string;
  created_at: string;
}

// DB: speaker_requests 테이블 (발언 요청)
export interface SpeakerRequest {
  id: string;
  assembly_id: string;
  agenda_item_id: string | null;
  union_id: string;
  snapshot_id: string;
  user_id: string;
  status: SpeakerRequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  queue_position: number | null;
  requested_at: string;
  created_at: string;
}

// DB: document_view_logs 테이블 (자료 열람 기록)
export interface DocumentViewLog {
  id: string;
  document_id: string;
  assembly_id: string;
  union_id: string;
  user_id: string;
  viewed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export const SPEAKER_REQUEST_STATUS_LABELS: Record<SpeakerRequestStatus, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '거절',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

export const QUESTION_VISIBILITY_LABELS: Record<QuestionVisibility, string> = {
  PUBLIC: '공개',
  ADMIN_ONLY: '관리자만',
  AFTER_APPROVAL: '승인 후 공개',
};

// DB 컬럼 매핑: quorum_requires_direct(bool) + quorum_threshold_pct + approval_threshold_pct
export const QUORUM_DEFAULTS: Record<AgendaType, { requiresDirect: boolean; quorumThresholdPct: number; approvalThresholdPct: number }> = {
  GENERAL: { requiresDirect: false, quorumThresholdPct: 50, approvalThresholdPct: 50 },
  CONTRACTOR_SELECTION: { requiresDirect: true, quorumThresholdPct: 50, approvalThresholdPct: 50 },
  DISSOLUTION: { requiresDirect: false, quorumThresholdPct: 66.7, approvalThresholdPct: 75 },
  BYLAW_AMENDMENT: { requiresDirect: false, quorumThresholdPct: 50, approvalThresholdPct: 66.7 },
  BUDGET_APPROVAL: { requiresDirect: false, quorumThresholdPct: 50, approvalThresholdPct: 50 },
  EXECUTIVE_ELECTION: { requiresDirect: false, quorumThresholdPct: 50, approvalThresholdPct: 50 },
};
