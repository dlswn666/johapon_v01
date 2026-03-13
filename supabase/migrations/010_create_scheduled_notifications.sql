-- Migration 010: 예약 알림 테이블 생성
-- 소집공고/소집통지서 발송 예약 관리

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  union_id UUID NOT NULL,
  notification_type VARCHAR(50) NOT NULL, -- CONVOCATION_NOTICE, INDIVIDUAL_NOTICE
  document_id UUID REFERENCES official_documents(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  error_message TEXT,
  created_by VARCHAR NOT NULL,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_assembly ON scheduled_notifications(assembly_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status_scheduled ON scheduled_notifications(status, scheduled_at)
  WHERE status = 'PENDING';

-- RLS
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- 관리자 조회 정책 (get_user_role_in_union 헬퍼 사용)
CREATE POLICY "admin_read_scheduled_notifications"
  ON scheduled_notifications FOR SELECT
  USING (
    get_user_role_in_union(scheduled_notifications.union_id) IN ('ADMIN', 'SUPER_ADMIN')
    OR is_system_admin()
  );

-- 관리자 생성 정책
CREATE POLICY "admin_insert_scheduled_notifications"
  ON scheduled_notifications FOR INSERT
  WITH CHECK (
    get_user_role_in_union(scheduled_notifications.union_id) IN ('ADMIN', 'SUPER_ADMIN')
    OR is_system_admin()
  );

-- 관리자 수정 정책 (상태 변경 — 취소 등)
CREATE POLICY "admin_update_scheduled_notifications"
  ON scheduled_notifications FOR UPDATE
  USING (
    get_user_role_in_union(scheduled_notifications.union_id) IN ('ADMIN', 'SUPER_ADMIN')
    OR is_system_admin()
  );

COMMENT ON TABLE scheduled_notifications IS '예약 알림 (소집공고/소집통지서 발송 스케줄)';
