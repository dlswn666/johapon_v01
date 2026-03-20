-- Migration 031: 설계문서 정합 — 사전투표 기간 + 봉인 스냅샷 필드
-- 설계문서: preVoteStartDate/EndDate, announcementDate, finalDeadline
-- 설계문서: eligibleMemberCount, totalAttendanceCount, directAttendanceCount, dataIntegrityHash

-- 1. 사전투표/공고 일정 필드
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS announcement_date TIMESTAMPTZ;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS pre_vote_start_date TIMESTAMPTZ;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS pre_vote_end_date TIMESTAMPTZ;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS final_deadline TIMESTAMPTZ;

-- 2. 게시 모드 (즉시/예약)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS publish_mode VARCHAR(20)
  DEFAULT 'IMMEDIATE'
  CHECK (publish_mode IN ('IMMEDIATE', 'SCHEDULED'));

-- 3. 알림 설정 (JSON)
-- 구조: { "channels": ["KAKAO_ALIMTALK", "SMS"], "reminders": ["D-3", "D-1"], "customMessage": "..." }
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS notification_config JSONB;

-- 4. 봉인 스냅샷 (VOTING_CLOSED → CLOSED 전이 시점에 확정)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS eligible_member_count INT;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS total_attendance_count INT;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS direct_attendance_count INT;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS data_integrity_hash VARCHAR(128);

-- 5. 사전투표 기간 유효성 체크
ALTER TABLE assemblies ADD CONSTRAINT chk_prevote_date_order
  CHECK (
    pre_vote_start_date IS NULL
    OR pre_vote_end_date IS NULL
    OR pre_vote_start_date < pre_vote_end_date
  );

-- 코멘트
COMMENT ON COLUMN assemblies.announcement_date IS '공고일 (총회 14일 전 통지 의무)';
COMMENT ON COLUMN assemblies.pre_vote_start_date IS '사전투표 시작일 (총회 7-14일 전)';
COMMENT ON COLUMN assemblies.pre_vote_end_date IS '사전투표 마감일 (총회 전일)';
COMMENT ON COLUMN assemblies.final_deadline IS '최종 마감 시각 (이후 모든 투표 채널 차단)';
COMMENT ON COLUMN assemblies.publish_mode IS '게시 방식: IMMEDIATE(즉시 게시) / SCHEDULED(예약 게시)';
COMMENT ON COLUMN assemblies.notification_config IS '알림 설정 JSON: { channels, reminders, customMessage }';
COMMENT ON COLUMN assemblies.eligible_member_count IS '봉인 시점 전체 대상 조합원 수';
COMMENT ON COLUMN assemblies.total_attendance_count IS '봉인 시점 총 출석 수 (전자+서면+현장+대리)';
COMMENT ON COLUMN assemblies.direct_attendance_count IS '봉인 시점 직접출석 수 (전자+현장+대리, 서면 제외)';
COMMENT ON COLUMN assemblies.data_integrity_hash IS '봉인 시점 전체 투표 데이터 SHA-256 해시';
