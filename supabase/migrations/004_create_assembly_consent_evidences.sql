-- Phase 5 Migration 004: 동의 증거 테이블
-- Workstream B: 동의 증거 시스템
-- CRITICAL: actor_user_id는 VARCHAR (users.id, NOT uuid)

CREATE TABLE IF NOT EXISTS assembly_consent_evidences (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id              uuid NOT NULL,
  assembly_id           uuid NOT NULL,
  snapshot_id           uuid NOT NULL
    REFERENCES assembly_member_snapshots(id) ON DELETE RESTRICT,
  actor_user_id         varchar NOT NULL,
  actor_role            text NOT NULL
    CHECK (actor_role IN ('OWNER', 'PROXY')),
  consent_type          text NOT NULL
    CHECK (consent_type IN ('IDENTITY_CONSENT', 'VOTING_CONSENT', 'PROXY_CONSENT')),
  consent_version       text NOT NULL DEFAULT '1.0',
  consent_text_hash     text NOT NULL,
  signature_type        text NOT NULL DEFAULT 'SIMPLE'
    CHECK (signature_type IN ('SIMPLE', 'KAKAO_CERT', 'PASS_CERT')),
  signature_value       text,
  signature_provider    text,
  signature_verified    boolean NOT NULL DEFAULT false,
  signature_verified_at timestamptz,
  ip_address            inet,
  user_agent            text,
  device_fingerprint    text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assembly_consent_evidences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_consent_evidences_assembly
  ON assembly_consent_evidences(assembly_id, union_id);
CREATE INDEX IF NOT EXISTS idx_consent_evidences_snapshot
  ON assembly_consent_evidences(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_consent_evidences_actor
  ON assembly_consent_evidences(actor_user_id);

-- RLS: 조합 ADMIN만 조회
CREATE POLICY "admin_read_consent_evidences"
  ON assembly_consent_evidences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_auth_links ual
      JOIN users u ON ual.user_id = u.id
      WHERE ual.auth_user_id = auth.uid()
        AND u.union_id = assembly_consent_evidences.union_id
        AND u.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- INSERT: service_role만 허용 (API에서 직접 INSERT)
CREATE POLICY "deny_direct_insert_consent_evidences"
  ON assembly_consent_evidences FOR INSERT
  WITH CHECK (false);
