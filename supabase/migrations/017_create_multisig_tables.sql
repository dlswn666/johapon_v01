-- Migration 017: Multisig 다중 승인 시스템
-- 해소 갭: INFRA-07

-- multisig_approvals: 다중 승인 요청
CREATE TABLE IF NOT EXISTS multisig_approvals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id     uuid        NOT NULL REFERENCES assemblies(id),
  union_id        uuid        NOT NULL,
  action_type     text        NOT NULL CHECK (
    action_type IN (
      'SNAPSHOT_CONFIRM',
      'VOTE_START',
      'WRITTEN_TRANSITION',
      'RESULT_CONFIRM',
      'DISPUTE_RESOLVE'
    )
  ),
  required_count  integer     NOT NULL CHECK (required_count BETWEEN 2 AND 3),
  current_count   integer     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  payload         jsonb,
  expires_at      timestamptz NOT NULL,
  completed_at    timestamptz,
  created_by      varchar     NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- multisig_signatures: 개별 서명 기록
CREATE TABLE IF NOT EXISTS multisig_signatures (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id     uuid        NOT NULL REFERENCES multisig_approvals(id),
  signer_user_id  varchar     NOT NULL,
  signer_role     text        NOT NULL CHECK (
    signer_role IN (
      'UNION_PRESIDENT',
      'ELECTION_CHAIR',
      'AUDITOR',
      'OBSERVER_REP'
    )
  ),
  signature_hash  text        NOT NULL,
  ip_address      inet,
  signed_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (approval_id, signer_user_id)
);

-- 인덱스
CREATE INDEX idx_multisig_approvals_assembly ON multisig_approvals(assembly_id, union_id);
CREATE INDEX idx_multisig_approvals_status   ON multisig_approvals(status, expires_at)
  WHERE status = 'PENDING';
CREATE INDEX idx_multisig_signatures_approval ON multisig_signatures(approval_id);

-- RLS 활성화
ALTER TABLE multisig_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE multisig_signatures ENABLE ROW LEVEL SECURITY;

-- multisig_approvals: 관리자 SELECT
CREATE POLICY "multisig_approvals_admin_select"
  ON multisig_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM user_auth_links ual
        JOIN users u ON u.id = ual.user_id
       WHERE ual.auth_user_id = auth.uid()
         AND u.union_id       = multisig_approvals.union_id
         AND u.role IN ('ADMIN', 'SYSTEM_ADMIN')
    )
  );

-- multisig_approvals: 관리자 INSERT
CREATE POLICY "multisig_approvals_admin_insert"
  ON multisig_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM user_auth_links ual
        JOIN users u ON u.id = ual.user_id
       WHERE ual.auth_user_id = auth.uid()
         AND u.union_id       = multisig_approvals.union_id
         AND u.role IN ('ADMIN', 'SYSTEM_ADMIN')
    )
  );

-- multisig_approvals: 서버(service_role)만 UPDATE
CREATE POLICY "multisig_approvals_service_update"
  ON multisig_approvals FOR UPDATE
  TO service_role
  USING (true);

-- multisig_signatures: 서명자 본인만 INSERT (user_auth_links 매핑)
CREATE POLICY "multisig_signatures_self_insert"
  ON multisig_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM user_auth_links ual
       WHERE ual.auth_user_id = auth.uid()
         AND ual.user_id      = multisig_signatures.signer_user_id
    )
  );

-- multisig_signatures: 관리자 SELECT
CREATE POLICY "multisig_signatures_admin_select"
  ON multisig_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM multisig_approvals ma
        JOIN user_auth_links    ual ON true
        JOIN users              u   ON u.id = ual.user_id
       WHERE ma.id         = multisig_signatures.approval_id
         AND ual.auth_user_id = auth.uid()
         AND u.union_id    = ma.union_id
         AND u.role IN ('ADMIN', 'SYSTEM_ADMIN')
    )
  );

COMMENT ON TABLE multisig_approvals IS
  '핵심 행위(스냅샷확정/투표개시/서면전환/결과확정/이의해소)에 대한 다중 승인 요청';
COMMENT ON TABLE multisig_signatures IS
  'Multisig 승인에 대한 개별 서명 기록. 동일 approval 내 중복 서명 불가.';
