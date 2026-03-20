-- Migration 030: 설계문서 정합 — 알림 발송 이력 테이블
-- 설계문서: NotificationLog (채널별 발송 상태 추적)
-- 현재: scheduled_notifications (예약만 존재) → 실제 발송 이력 추적 추가

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  union_id UUID NOT NULL,
  user_id VARCHAR,                              -- 수신 대상 조합원 ID
  channel VARCHAR(30) NOT NULL                  -- 발송 채널
    CHECK (channel IN ('KAKAO_ALIMTALK', 'SMS', 'EMAIL')),
  template_type VARCHAR(50),                    -- CONVOCATION | VOTE_OPEN | REMINDER_D3 | REMINDER_D1 | RESULT
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRIED')),
  sent_at TIMESTAMPTZ,
  fail_reason TEXT,
  retry_count INT DEFAULT 0,
  external_message_id VARCHAR,                  -- 외부 API 메시지 ID (카카오/NHN 등)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_logs_assembly
  ON notification_logs(assembly_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user
  ON notification_logs(user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_logs_pending_failed
  ON notification_logs(status, created_at)
  WHERE status IN ('PENDING', 'FAILED');

-- RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 관리자 읽기 정책
CREATE POLICY "admin_read_notification_logs"
  ON notification_logs FOR SELECT
  USING (
    get_user_role_in_union(notification_logs.union_id) IN ('ADMIN', 'SUPER_ADMIN')
    OR is_system_admin()
  );

-- service_role 삽입 (API 서버에서만 생성)
CREATE POLICY "service_role_insert_notification_logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true);

-- 관리자 업데이트 (재시도, 상태 변경 등)
CREATE POLICY "admin_update_notification_logs"
  ON notification_logs FOR UPDATE
  USING (
    get_user_role_in_union(notification_logs.union_id) IN ('ADMIN', 'SUPER_ADMIN')
    OR is_system_admin()
  );

COMMENT ON TABLE notification_logs IS '알림 발송 이력 — 카카오 알림톡/SMS/이메일 채널별 발송 상태 추적';
