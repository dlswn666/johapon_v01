-- Migration 034: vote_receipt_registry 테이블 생성
-- cast_vote RPC에서 영수증 해시 INSERT, api/votes/receipt/verify에서 조회
-- 누락 발견: DB에 테이블이 없었으나 RPC 코드에서 참조

CREATE TABLE IF NOT EXISTS vote_receipt_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  union_id UUID NOT NULL,
  assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  snapshot_id UUID,
  receipt_token_hash VARCHAR(128) NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  verify_count INT NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipt_registry_assembly ON vote_receipt_registry(assembly_id);
CREATE INDEX IF NOT EXISTS idx_receipt_registry_poll ON vote_receipt_registry(poll_id);
CREATE INDEX IF NOT EXISTS idx_receipt_registry_hash ON vote_receipt_registry(receipt_token_hash);

ALTER TABLE vote_receipt_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_receipt_registry" ON vote_receipt_registry FOR SELECT TO authenticated
  USING (get_user_role_in_union(vote_receipt_registry.union_id) IN ('ADMIN', 'SUPER_ADMIN') OR is_system_admin());

CREATE POLICY "service_role_manage_receipt_registry" ON vote_receipt_registry FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "admin_update_receipt_registry" ON vote_receipt_registry FOR UPDATE TO authenticated
  USING (get_user_role_in_union(vote_receipt_registry.union_id) IN ('ADMIN', 'SUPER_ADMIN') OR is_system_admin());

COMMENT ON TABLE vote_receipt_registry IS '투표 영수증 SHA-256 해시 저장. WORM: INSERT + verify_count UPDATE만 허용.';
