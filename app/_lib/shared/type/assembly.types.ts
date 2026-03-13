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
export type SessionMode = 'LEGACY' | 'SESSION';

// 본인인증 방법
export type IdentityMethod = 'KAKAO_LOGIN' | 'PASS_CERT' | 'CERTIFICATE';

// 전자서명 방법
export type SignatureType = 'SIMPLE' | 'KAKAO_CERT' | 'PASS_CERT';

// 인증 방법 한국어 레이블
export const IDENTITY_METHOD_LABELS: Record<IdentityMethod, string> = {
  KAKAO_LOGIN: '카카오 로그인',
  PASS_CERT: 'PASS 본인인증',
  CERTIFICATE: '공동인증서',
};

// 서명 방법 한국어 레이블
export const SIGNATURE_TYPE_LABELS: Record<SignatureType, string> = {
  SIMPLE: '간편서명',
  KAKAO_CERT: '카카오 인증서명',
  PASS_CERT: 'PASS 인증서명',
};

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
  session_mode: SessionMode;
  minutes_confirmed_by: Record<string, unknown>[] | null;
  minutes_content_hash: string | null;
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
  explanation_html: string | null;
  created_at: string;
  updated_at: string;
}

export type NewAgendaItem = Pick<AgendaItem, 'title' | 'agenda_type'> & Partial<Pick<AgendaItem, 'description' | 'seq_order' | 'quorum_threshold_pct' | 'quorum_requires_direct' | 'approval_threshold_pct' | 'explanation_html'>>;

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
  // 법적 투표 기간 잠금 (Workstream A)
  legal_opens_at: string | null;
  legal_closes_at: string | null;
  legal_window_locked_at: string | null;
  close_reason: string | null;
  close_reason_code: CloseReasonCode | null;
  created_at: string;
  updated_at: string;
}

// 조기 마감 사유 코드
export type CloseReasonCode = 'NORMAL' | 'EMERGENCY' | 'COURT_ORDER';

// 투표 상태 전이 요청
export interface PollTransitionRequest {
  status: 'OPEN' | 'CLOSED' | 'SCHEDULED' | 'CANCELLED';
  close_reason_code?: CloseReasonCode;
  close_reason?: string;
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
  last_seen_at: string | null;
  device_info: Record<string, unknown> | null;
  identity_verified: boolean;
  identity_method: string | null;
  identity_verified_at: string | null;
  created_at: string;
}

// 온라인 세션 device_info 구조
export interface OnlineSessionDeviceInfo {
  channel?: string;
  client_session_id?: string;
  player_mode?: string;
  last_player_state?: string;
  current_seconds?: number;
  is_reentry?: boolean;
  exit_reason?: string;
}

// 세션 상태 (클라이언트 상태 관리용)
export type SessionStatus = 'ACTIVE' | 'IDLE' | 'RECONNECTING' | 'ENDED';

export interface SessionState {
  sessionId: string;
  logId: string;
  entryAt: string;
  lastSeenAt: string | null;
  sessionStatus: SessionStatus;
  isBootstrapped: boolean;
  featureFlags: HallFeatureFlags;
}

// hall bootstrap API 응답
export interface HallBootstrapData {
  assembly: Assembly;
  snapshot: AssemblyMemberSnapshotPublic;
  attendanceSession: Pick<AssemblyAttendanceLog, 'id' | 'session_id' | 'entry_at' | 'last_seen_at' | 'attendance_type'> | null;
  agendaItems: (AgendaItem & { polls?: (Poll & { poll_options?: PollOption[] })[] })[];
  documents: AgendaDocument[];
  myQuestions: AssemblyQuestion[];
  mySpeakerRequests: SpeakerRequest[];
  featureFlags: HallFeatureFlags;
}

// heartbeat API 응답
export interface HeartbeatResponse {
  ok: boolean;
  lastSeenAt: string;
  assemblyStatus: AssemblyStatus;
  activePollIds: string[];
}

// session start API 응답
export interface SessionStartResponse {
  logId: string;
  sessionId: string;
  entryAt: string;
  attendanceType: AttendanceType;
  isReentry: boolean;
}

// 총회장 기능 플래그
export interface HallFeatureFlags {
  canAskQuestion: boolean;
  canRequestSpeaker: boolean;
  canVote: boolean;
  isSessionMode: boolean;
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

// 동의 증거 (Workstream B)
export interface AssemblyConsentEvidence {
  id: string;
  union_id: string;
  assembly_id: string;
  snapshot_id: string;
  actor_user_id: string;
  actor_role: 'OWNER' | 'PROXY';
  consent_type: 'IDENTITY_CONSENT' | 'VOTING_CONSENT' | 'PROXY_CONSENT';
  consent_version: string;
  consent_text_hash: string;
  signature_type: 'SIMPLE' | 'KAKAO_CERT' | 'PASS_CERT';
  signature_value: string | null;
  signature_provider: string | null;
  signature_verified: boolean;
  signature_verified_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  created_at: string;
}

// 결과 공개 (Workstream D)
export interface AssemblyResultPublication {
  id: string;
  union_id: string;
  assembly_id: string;
  published_by: string;
  published_at: string;
  result_json: PublicResultJson;
  result_hash: string;
  source_tally_hash: string;
}

export interface PublicResultJson {
  assembly_id: string;
  assembly_title: string;
  published_at: string;
  agendas: PublicAgendaResult[];
}

export interface PublicAgendaResult {
  agenda_id: string;
  title: string;
  seq_order: number;
  agenda_type: string;
  total_votes: number;
  is_passed: boolean;
  options: PublicOptionResult[];
}

export interface PublicOptionResult {
  label: string;
  option_type: string;
  vote_count: number;
  vote_weight_sum: number;
}

// ============================================
// Phase 2: 공식 문서, 컴플라이언스, 서명, 알림
// ============================================

// 공식 문서 타입
export type OfficialDocumentType =
  | 'CONVOCATION_NOTICE'
  | 'INDIVIDUAL_NOTICE'
  | 'AGENDA_EXPLANATION'
  | 'E_VOTING_GUIDE'
  | 'CONSENT_FORM'
  | 'PROXY_FORM'
  | 'WRITTEN_RESOLUTION'
  | 'MINUTES'
  | 'RESULT_PUBLICATION'
  | 'EVIDENCE_PACKAGE_SUMMARY';

export type DocumentStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'REVIEW'
  | 'APPROVED'
  | 'SIGNED_PARTIAL'
  | 'SIGNED_COMPLETE'
  | 'SEALED'
  | 'SUPERSEDED'
  | 'VOID';

export const DOCUMENT_TYPE_LABELS: Record<OfficialDocumentType, string> = {
  CONVOCATION_NOTICE: '소집공고',
  INDIVIDUAL_NOTICE: '소집통지서',
  AGENDA_EXPLANATION: '안건 설명서',
  E_VOTING_GUIDE: '전자투표 안내문',
  CONSENT_FORM: '동의서',
  PROXY_FORM: '위임장',
  WRITTEN_RESOLUTION: '서면결의서',
  MINUTES: '의사록',
  RESULT_PUBLICATION: '결과 공표문',
  EVIDENCE_PACKAGE_SUMMARY: '증거 패키지 요약',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: '초안',
  GENERATED: '생성됨',
  REVIEW: '검토중',
  APPROVED: '승인됨',
  SIGNED_PARTIAL: '서명 진행중',
  SIGNED_COMPLETE: '서명 완료',
  SEALED: '봉인됨',
  SUPERSEDED: '대체됨',
  VOID: '무효',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  GENERATED: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-green-100 text-green-700',
  SIGNED_PARTIAL: 'bg-amber-100 text-amber-700',
  SIGNED_COMPLETE: 'bg-emerald-100 text-emerald-700',
  SEALED: 'bg-indigo-100 text-indigo-700',
  SUPERSEDED: 'bg-gray-50 text-gray-400 line-through',
  VOID: 'bg-red-100 text-red-700',
};

// DB: official_documents 테이블
export interface OfficialDocument {
  id: string;
  assembly_id: string;
  union_id: string;
  agenda_item_id: string | null;
  document_type: OfficialDocumentType;
  version: number;
  previous_version_id: string | null;
  status: DocumentStatus;
  source_json: Record<string, unknown>;
  html_content: string | null;
  pdf_storage_path: string | null;
  pdf_hash: string | null;
  content_hash: string | null;
  required_signers: DocumentRequiredSigner[];
  signature_threshold: number;
  generated_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  sealed_at: string | null;
  sealed_by: string | null;
  void_at: string | null;
  void_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequiredSigner {
  signer_id: string;
  signer_name: string;
  signer_role: SignerRole;
}

export type SignerRole = 'CHAIRPERSON' | 'DIRECTOR' | 'AUDITOR' | 'MEMBER' | 'ADMIN';

export const SIGNER_ROLE_LABELS: Record<SignerRole, string> = {
  CHAIRPERSON: '의장',
  DIRECTOR: '이사',
  AUDITOR: '감사',
  MEMBER: '조합원',
  ADMIN: '관리자',
};

// 서명 방법 (DB)
export type SignatureMethod = 'SIMPLE_HASH' | 'PASS_VERIFIED' | 'CERTIFIED';

export const SIGNATURE_METHOD_LABELS: Record<SignatureMethod, string> = {
  SIMPLE_HASH: '간편서명 (해시)',
  PASS_VERIFIED: 'PASS 인증서명',
  CERTIFIED: '공인전자서명',
};

// DB: document_signatures 테이블
export interface DocumentSignature {
  id: string;
  document_id: string;
  document_version: number;
  document_hash: string;
  signer_id: string;
  signer_name: string;
  signer_role: SignerRole;
  signature_method: SignatureMethod;
  signature_image_path: string | null;
  signature_image_hash: string | null;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  is_verified: boolean;
  verified_at: string | null;
  status: 'VALID' | 'INVALIDATED' | 'REVOKED';
  invalidated_at: string | null;
  invalidation_reason: string | null;
  audit_log_id: string | null;
  created_at: string;
}

// 서명 결과 (sign_document_atomic RPC 응답)
export interface SignDocumentResult {
  success: boolean;
  error?: string;
  signatureId?: string;
  thresholdMet?: boolean;
  currentCount?: number;
  requiredCount?: number;
}

// ============================================
// 컴플라이언스 엔진
// ============================================

export type ComplianceCheckpoint =
  | 'BEFORE_NOTICE'
  | 'BEFORE_CONVENE'
  | 'BEFORE_START'
  | 'BEFORE_VOTING'
  | 'BEFORE_PUBLISH'
  | 'BEFORE_SEAL'
  | 'BEFORE_ARCHIVE';

export type ComplianceSeverity = 'BLOCK' | 'WARNING' | 'INFO';

export type ComplianceRuleLayer = 'STATUTORY' | 'BYLAW' | 'POLICY';

export type ComplianceEvaluationStatus = 'OPEN' | 'PASS' | 'FAIL' | 'WAIVED' | 'RESOLVED';

export type ComplianceRuleCategory =
  | 'NOTICE'
  | 'AGENDA'
  | 'PARTICIPATION'
  | 'QUORUM'
  | 'VOTING'
  | 'DOCUMENT'
  | 'SIGNATURE'
  | 'RECORD';

export const COMPLIANCE_SEVERITY_LABELS: Record<ComplianceSeverity, string> = {
  BLOCK: '차단',
  WARNING: '경고',
  INFO: '정보',
};

export const COMPLIANCE_SEVERITY_COLORS: Record<ComplianceSeverity, string> = {
  BLOCK: 'bg-red-50 border-red-200 text-red-700',
  WARNING: 'bg-amber-50 border-amber-200 text-amber-700',
  INFO: 'bg-blue-50 border-blue-200 text-blue-700',
};

export const COMPLIANCE_SEVERITY_ICONS: Record<ComplianceSeverity, string> = {
  BLOCK: '■',
  WARNING: '▲',
  INFO: '●',
};

export const COMPLIANCE_LAYER_LABELS: Record<ComplianceRuleLayer, string> = {
  STATUTORY: '법정',
  BYLAW: '정관',
  POLICY: '내부정책',
};

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceEvaluationStatus, string> = {
  OPEN: '미평가',
  PASS: '통과',
  FAIL: '실패',
  WAIVED: '면제',
  RESOLVED: '해결됨',
};

// DB: assembly_compliance_evaluations 테이블
export interface ComplianceEvaluation {
  id: string;
  assembly_id: string;
  union_id: string;
  checkpoint: ComplianceCheckpoint;
  rule_code: string;
  rule_layer: ComplianceRuleLayer;
  severity: ComplianceSeverity;
  status: ComplianceEvaluationStatus;
  message: string;
  remediation: string | null;
  legal_basis: string | null;
  context_data: Record<string, unknown> | null;
  waiver_reason: string | null;
  transition_context: string | null;
  evaluated_at: string;
  evaluated_by: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

// 컴플라이언스 평가 결과 (API 응답)
export interface ComplianceCheckResult {
  checkpoint: ComplianceCheckpoint;
  evaluations: ComplianceEvaluation[];
  summary: {
    total: number;
    pass: number;
    fail: number;
    waived: number;
    open: number;
    hasBlockingFailures: boolean;
    canProceed: boolean;
  };
}

// ============================================
// 알림 배치
// ============================================

export type NotificationType =
  | 'CONVOCATION_NOTICE'
  | 'NOTICE_REMINDER'
  | 'VOTE_START'
  | 'VOTE_REMINDER'
  | 'RESULT_PUBLICATION'
  | 'SIGNATURE_REQUEST'
  | 'MINUTES_CORRECTION';

export type NotificationDeliveryChannel = 'KAKAO_ALIMTALK' | 'SMS' | 'EMAIL' | 'MIXED';

export type NotificationBatchStatus =
  | 'PENDING'
  | 'SENDING'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'FAILED'
  | 'SUPERSEDED';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  CONVOCATION_NOTICE: '소집통지',
  NOTICE_REMINDER: '통지 리마인더',
  VOTE_START: '투표 시작',
  VOTE_REMINDER: '투표 리마인더',
  RESULT_PUBLICATION: '결과 공표',
  SIGNATURE_REQUEST: '서명 요청',
  MINUTES_CORRECTION: '의사록 정정',
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationBatchStatus, string> = {
  PENDING: '대기',
  SENDING: '발송중',
  DELIVERED: '발송완료',
  PARTIALLY_DELIVERED: '부분발송',
  FAILED: '발송실패',
  SUPERSEDED: '대체됨',
};

export const NOTIFICATION_STATUS_COLORS: Record<NotificationBatchStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SENDING: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  PARTIALLY_DELIVERED: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  SUPERSEDED: 'bg-gray-50 text-gray-400',
};

// DB: notification_batches 테이블
export interface NotificationBatch {
  id: string;
  assembly_id: string;
  union_id: string;
  notification_type: NotificationType;
  document_id: string | null;
  document_hash: string | null;
  document_version: number | null;
  delivery_channel: NotificationDeliveryChannel;
  status: NotificationBatchStatus;
  sent_by: string;
  sent_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  delivered_count: number;
  failed_count: number;
  provider_batch_ref: string | null;
  failure_details: Record<string, unknown>;
  delivery_metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================
// 대리인 등록 (proxy_registrations)
// ============================================

export type ProxyType = 'MEMBER' | 'NON_MEMBER';
export type ProxyRelationship = 'SPOUSE' | 'FAMILY' | 'AGENT' | 'OTHER';
export type ProxyScope = 'ALL_AGENDAS' | 'SPECIFIC_AGENDAS';
export type ProxyRegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';

export const PROXY_STATUS_LABELS: Record<ProxyRegistrationStatus, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '거절',
  REVOKED: '해제',
};

export const PROXY_RELATIONSHIP_LABELS: Record<ProxyRelationship, string> = {
  SPOUSE: '배우자',
  FAMILY: '가족',
  AGENT: '대리인',
  OTHER: '기타',
};

export interface ProxyRegistration {
  id: string;
  assembly_id: string;
  union_id: string;
  snapshot_id: string;
  delegator_user_id: string;
  proxy_type: ProxyType;
  proxy_user_id: string | null;
  proxy_name: string;
  proxy_phone: string | null;
  proxy_relationship: ProxyRelationship | null;
  authorization_doc_url: string | null;
  scope: ProxyScope;
  agenda_ids: string[] | null;
  verified_at: string | null;
  verified_by: string | null;
  status: ProxyRegistrationStatus;
  revoked_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// 안건 법적 규칙
// ============================================

export interface AgendaLegalRule {
  id: string;
  union_id: string;
  agenda_type: string;
  statutory_quorum_pct: number;
  bylaw_quorum_pct: number | null;
  effective_quorum_pct: number;
  statutory_approval_pct: number;
  bylaw_approval_pct: number | null;
  effective_approval_pct: number;
  approval_base: 'PRESENT' | 'TOTAL';
  requires_direct_attendance: boolean;
  direct_attendance_basis: 'HEAD_COUNT' | 'WEIGHT' | null;
  electronic_allowed: boolean;
  written_allowed: boolean;
  proxy_allowed: boolean;
  required_documents: string[];
  requires_result_publication: boolean;
  legal_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// 의사록 정정
// ============================================

export interface MinutesCorrection {
  id: string;
  assembly_id: string;
  union_id: string;
  original_document_id: string;
  corrected_document_id: string;
  correction_number: number;
  correction_reason_code: string | null;
  correction_reason_detail: string;
  requested_by: string;
  requested_at: string;
  created_at: string;
}

// ============================================
// 위자드 스텝
// ============================================

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  1: '기본 정보',
  2: '안건 등록',
  3: '소집공고 작성',
  4: '소집통지서 작성',
  5: '발송 설정 & 확인',
};

export const WIZARD_STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  1: '총회 유형, 일시, 장소, 참여 방식 설정',
  2: '안건 추가 및 의안서(TipTap) 작성',
  3: 'TipTap 에디터로 소집공고 편집',
  4: 'TipTap 에디터로 소집통지서 편집',
  5: '발송 일정, 컴플라이언스, 최종 확인',
};

// 예약 알림
export type ScheduledNotificationStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type ScheduledNotificationType = 'CONVOCATION_NOTICE' | 'INDIVIDUAL_NOTICE';

export interface ScheduledNotification {
  id: string;
  assembly_id: string;
  union_id: string;
  notification_type: ScheduledNotificationType;
  document_id: string | null;
  scheduled_at: string;
  status: ScheduledNotificationStatus;
  error_message: string | null;
  created_by: string;
  executed_at: string | null;
  created_at: string;
}

// 채널 충돌 모드
export type ChannelConflictMode = 'LAST_WINS' | 'FIRST_LOCKS';

// 본인인증 수준
export type IdentityVerificationLevel = 'KAKAO_ONLY' | 'PASS_REQUIRED';

// assemblies 테이블 Phase 2 확장 필드
export interface AssemblyPhase2Extensions {
  identity_verification_level: IdentityVerificationLevel;
  required_signature_type: SignatureMethod;
  channel_conflict_mode: ChannelConflictMode;
}

// ============================================
// 공식 문서 시스템 — 추가 타입
// ============================================

// 문서 유형별 아이콘 (lucide 컴포넌트명)
export const DOCUMENT_TYPE_ICONS: Record<OfficialDocumentType, string> = {
  CONVOCATION_NOTICE: 'FileText',
  INDIVIDUAL_NOTICE: 'Mail',
  AGENDA_EXPLANATION: 'ClipboardList',
  E_VOTING_GUIDE: 'Smartphone',
  CONSENT_FORM: 'UserCheck',
  PROXY_FORM: 'Users',
  WRITTEN_RESOLUTION: 'Vote',
  MINUTES: 'BookOpen',
  RESULT_PUBLICATION: 'BarChart3',
  EVIDENCE_PACKAGE_SUMMARY: 'Package',
};

export const DOCUMENT_TYPE_ICON_COLORS: Record<OfficialDocumentType, string> = {
  CONVOCATION_NOTICE: 'bg-blue-50 text-blue-600',
  INDIVIDUAL_NOTICE: 'bg-teal-50 text-teal-600',
  AGENDA_EXPLANATION: 'bg-purple-50 text-purple-600',
  E_VOTING_GUIDE: 'bg-cyan-50 text-cyan-600',
  CONSENT_FORM: 'bg-amber-50 text-amber-600',
  PROXY_FORM: 'bg-indigo-50 text-indigo-600',
  WRITTEN_RESOLUTION: 'bg-emerald-50 text-emerald-600',
  MINUTES: 'bg-orange-50 text-orange-600',
  RESULT_PUBLICATION: 'bg-green-50 text-green-600',
  EVIDENCE_PACKAGE_SUMMARY: 'bg-gray-50 text-gray-600',
};

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<OfficialDocumentType, string> = {
  CONVOCATION_NOTICE: '총회 소집을 전체 조합원에게 공지하는 문서',
  INDIVIDUAL_NOTICE: '조합원 개인별 소집통지서 (서면결의 안내 포함)',
  AGENDA_EXPLANATION: '각 안건의 상세 설명 문서',
  E_VOTING_GUIDE: '전자투표 절차 안내 문서',
  CONSENT_FORM: '개인정보 수집/이용 및 전자투표 동의서',
  PROXY_FORM: '대리 참석 위임 문서',
  WRITTEN_RESOLUTION: '서면 투표 의사 표시 문서',
  MINUTES: '총회 진행 기록 (법정 문서)',
  RESULT_PUBLICATION: '투표 결과 공식 공표 문서',
  EVIDENCE_PACKAGE_SUMMARY: '총회 전체 증거 자료 요약',
};

// DB: document_templates 테이블
export interface DocumentTemplate {
  id: string;
  template_type: OfficialDocumentType;
  html_template: string;
  merge_field_schema: MergeFieldDef[];
  version: number;
  description: string | null;
  legal_basis: string | null;
  requires_signatures: boolean;
  required_signer_roles: SignerRole[];
  signature_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MergeFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  source: 'snapshot' | 'assembly' | 'union_info' | 'static';
}

export interface MergeContext {
  snapshot?: Record<string, unknown>;
  assembly?: Record<string, unknown>;
  unionInfo?: Record<string, unknown>;
  staticData?: Record<string, string>;
}

// DB: document_personalized_instances 테이블
export interface PersonalizedDocumentInstance {
  id: string;
  document_id: string;
  assembly_id: string;
  union_id: string;
  snapshot_id: string;
  user_id: string;
  personalized_html: string;
  personalization_hash: string;
  has_signed: boolean;
  signed_at: string | null;
  signature_image_url: string | null;
  viewed_at: string | null;
  downloaded_at: string | null;
  status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'SEALED';
  created_at: string;
  updated_at: string;
}

// DB: document_download_logs 테이블
export interface DocumentDownloadLog {
  id: string;
  document_id: string;
  personalization_snapshot_id: string | null;
  user_id: string;
  user_role: string;
  download_type: string;
  downloaded_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// PDF 생성 결과
export interface PdfGenerationResult {
  pdfStoragePath: string;
  pdfHash: string;
  generatedAt: string;
}

// 개인화 문서 API 응답 (조합원용)
export interface PersonalizedDocumentResponse {
  instanceId: string;
  personalizedHtml: string;
  personalizationHash: string;
  status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'SEALED';
  canSign: boolean;
  viewedAt: string | null;
  signedAt: string | null;
}

// 개인화 문서 뷰 (조합원 문서 열람 페이지용)
export interface PersonalizedDocumentView {
  instanceId: string;
  documentId: string;
  documentType: OfficialDocumentType;
  documentTitle: string;
  version: number;
  status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'SEALED';
  personalizedHtml: string;
  contentHash: string;
  canSign: boolean;
  hasSigned: boolean;
  signedAt: string | null;
  signatureThreshold: number;
  signerRole: SignerRole | null;
}

// 조합원 문서 수신함 요약
export interface PersonalizedDocumentSummary {
  documentId: string;
  instanceId: string;
  documentType: OfficialDocumentType;
  version: number;
  status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'SEALED';
  hasSigned: boolean;
  requiresSignature: boolean;
  signatureThreshold: number;
  createdAt: string;
  viewedAt: string | null;
  signedAt: string | null;
  pdfAvailable: boolean;
}

// 관리자용 개인화 인스턴스
export interface PersonalizedInstance {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'SEALED';
  viewedAt: string | null;
  signedAt: string | null;
  personalizationHash: string;
  signatureImageUrl: string | null;
}
