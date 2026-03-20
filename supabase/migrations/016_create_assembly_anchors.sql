-- Migration 016: assembly_anchors (RFC 3161 TSA + OpenTimestamps 앵커링 기록)
-- 해소 갭: INFRA-04

CREATE TABLE IF NOT EXISTS assembly_anchors (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id   uuid        NOT NULL REFERENCES assemblies(id),
  union_id      uuid        NOT NULL,
  anchor_type   text        NOT NULL CHECK (anchor_type IN ('TSA', 'OTS')),
  source_hash   text        NOT NULL,
  anchor_data   jsonb,
  ots_file_path text,
  bitcoin_txid  text,
  status        text        NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_at  timestamptz
);

CREATE INDEX idx_assembly_anchors_assembly ON assembly_anchors(assembly_id, union_id);
CREATE INDEX idx_assembly_anchors_status   ON assembly_anchors(status) WHERE status = 'PENDING';

ALTER TABLE assembly_anchors ENABLE ROW LEVEL SECURITY;

-- 관리자 SELECT (user_auth_links 매핑)
CREATE POLICY "assembly_anchors_admin_select"
  ON assembly_anchors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM user_auth_links ual
        JOIN users u ON u.id = ual.user_id
       WHERE ual.auth_user_id = auth.uid()
         AND u.union_id       = assembly_anchors.union_id
         AND u.role IN ('ADMIN', 'SYSTEM_ADMIN')
    )
  );

-- INSERT/UPDATE는 service_role(서버 API)만
CREATE POLICY "assembly_anchors_service_write"
  ON assembly_anchors FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "assembly_anchors_service_update"
  ON assembly_anchors FOR UPDATE
  TO service_role
  USING (true);

COMMENT ON TABLE assembly_anchors IS
  'RFC 3161 TSA 및 OpenTimestamps Bitcoin 앵커링 기록. 이중 시점 증명.';
