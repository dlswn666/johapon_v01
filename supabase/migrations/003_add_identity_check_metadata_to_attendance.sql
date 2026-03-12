-- Phase 5 Migration 003: 출석 신원확인 메타데이터 추가
-- Workstream E: 정족수 본인인증 강화

ALTER TABLE assembly_attendance_logs
  ADD COLUMN IF NOT EXISTS identity_check_method text,
  ADD COLUMN IF NOT EXISTS identity_checker_id   varchar,
  ADD COLUMN IF NOT EXISTS identity_check_at     timestamptz;

COMMENT ON COLUMN assembly_attendance_logs.identity_check_method IS '신원 확인 방법 (ID_CARD, DRIVER_LICENSE, PASSPORT, QR_SCAN)';
COMMENT ON COLUMN assembly_attendance_logs.identity_checker_id IS '신원 확인자 (users.id, VARCHAR)';
COMMENT ON COLUMN assembly_attendance_logs.identity_check_at IS '신원 확인 시각';
