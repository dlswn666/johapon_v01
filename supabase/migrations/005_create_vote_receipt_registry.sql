-- Phase 5 Migration 005: 투표 영수증 레지스트리
-- Workstream C: 영수증 검증 시스템

CREATE TABLE IF NOT EXISTS vote_receipt_registry (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id           uuid NOT NULL,
  assembly_id        uuid NOT NULL,
  poll_id            uuid NOT NULL,
  snapshot_id        uuid NOT NULL,
  receipt_token_hash text NOT NULL UNIQUE,
  issued_at          timestamptz NOT NULL DEFAULT now(),
  revoked_at         timestamptz,
  verify_count       int NOT NULL DEFAULT 0,
  last_verified_at   timestamptz
);

ALTER TABLE vote_receipt_registry ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_receipt_registry_assembly
  ON vote_receipt_registry(assembly_id, union_id);
CREATE INDEX IF NOT EXISTS idx_receipt_registry_token_hash
  ON vote_receipt_registry(receipt_token_hash);
CREATE INDEX IF NOT EXISTS idx_receipt_registry_poll
  ON vote_receipt_registry(poll_id);

-- RLS: 조합 ADMIN만 조회
CREATE POLICY "admin_read_receipt_registry"
  ON vote_receipt_registry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_auth_links ual
      JOIN users u ON ual.user_id = u.id
      WHERE ual.auth_user_id = auth.uid()
        AND u.union_id = vote_receipt_registry.union_id
        AND u.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- INSERT: cast_vote RPC SECURITY DEFINER를 통해서만
CREATE POLICY "deny_direct_insert_receipt_registry"
  ON vote_receipt_registry FOR INSERT
  WITH CHECK (false);

-- UPDATE: 관리자만 (revoke용)
CREATE POLICY "admin_update_receipt_registry"
  ON vote_receipt_registry FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_auth_links ual
      JOIN users u ON ual.user_id = u.id
      WHERE ual.auth_user_id = auth.uid()
        AND u.union_id = vote_receipt_registry.union_id
        AND u.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
