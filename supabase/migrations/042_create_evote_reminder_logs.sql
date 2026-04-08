-- Migration 042: 미투표자 일일 알림 발송 이력
-- Vercel Cron → API route에서 발송 후 기록

SET search_path = public, pg_catalog;

CREATE TABLE IF NOT EXISTS evote_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  union_id UUID NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel VARCHAR NOT NULL DEFAULT 'KAKAO_ALIMTALK',
  status VARCHAR NOT NULL DEFAULT 'SENT'
    CHECK (status IN ('SENT', 'FAILED'))
);

CREATE INDEX idx_evote_reminder_logs_lookup
  ON evote_reminder_logs (assembly_id, user_id, sent_at);

CREATE INDEX idx_evote_reminder_logs_union
  ON evote_reminder_logs (union_id, sent_at);

COMMENT ON TABLE evote_reminder_logs IS '미투표자 알림 발송 이력';

-- RLS 정책
ALTER TABLE evote_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "관리자_알림이력_조회"
  ON evote_reminder_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_auth_links ual
      JOIN users u ON u.id = ual.user_id
      WHERE ual.auth_user_id = auth.uid()
        AND u.union_id = evote_reminder_logs.union_id
        AND u.role IN ('ADMIN', 'SYSTEM_ADMIN')
    )
  );

CREATE POLICY "서비스_알림이력_삽입"
  ON evote_reminder_logs FOR INSERT
  WITH CHECK (true);
