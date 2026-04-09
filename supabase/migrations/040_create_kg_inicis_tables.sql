-- 040_create_kg_inicis_tables.sql
-- KG이니시스 통합인증 관련 테이블

SET search_path TO public;

-- ─── 1. 인증 트랜잭션 상태 관리 ───────────────────────────
CREATE TABLE kg_inicis_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id    uuid NOT NULL REFERENCES unions(id),
  user_id     varchar NOT NULL REFERENCES users(id),
  assembly_id uuid REFERENCES assemblies(id),
  m_tx_id     varchar(20) NOT NULL UNIQUE,
  req_svc_cd  varchar(2) NOT NULL CHECK (req_svc_cd IN ('01', '02', '03')),
  status      varchar(20) NOT NULL DEFAULT 'REQUESTED'
                CHECK (status IN ('REQUESTED', 'CALLBACK_RECEIVED', 'SUCCESS', 'FAILED', 'EXPIRED')),
  result_data jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '5 minutes'
);

CREATE INDEX idx_kg_inicis_tx_user ON kg_inicis_transactions (user_id, union_id);
CREATE INDEX idx_kg_inicis_tx_status ON kg_inicis_transactions (status) WHERE status = 'REQUESTED';

COMMENT ON TABLE kg_inicis_transactions IS 'KG이니시스 인증 요청~결과 조회 사이의 트랜잭션 상태';

ALTER TABLE kg_inicis_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY kg_inicis_tx_select ON kg_inicis_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_auth_links
      WHERE auth_user_id = auth.uid() AND user_id = kg_inicis_transactions.user_id
    )
  );

-- ─── 2. 전자서명 원본 저장 ───────────────────────────────
CREATE TABLE esign_certificates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id              uuid NOT NULL REFERENCES unions(id),
  consent_evidence_id   uuid REFERENCES assembly_consent_evidences(id),
  provider              varchar(20) NOT NULL DEFAULT 'KG_INICIS',
  tx_id                 varchar(40) NOT NULL,
  signed_data           text NOT NULL,
  signed_data_hash      varchar(128) NOT NULL,
  signature_value       text NOT NULL,
  certificate_dn        text,
  certificate_serial    varchar(64),
  certificate_issuer    text,
  certificate_expiry    timestamptz,
  verification_result   jsonb,
  verified_at           timestamptz,
  raw_response          jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esign_certs_consent ON esign_certificates (consent_evidence_id);
CREATE INDEX idx_esign_certs_union ON esign_certificates (union_id);

COMMENT ON TABLE esign_certificates IS '전자서명 원본 + 인증서 정보 (법적 증거 보전)';

ALTER TABLE esign_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY esign_certs_select ON esign_certificates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assembly_consent_evidences ace
      JOIN user_auth_links ual ON ual.user_id = ace.actor_user_id
      WHERE ace.id = esign_certificates.consent_evidence_id
        AND ual.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_auth_links ual
      JOIN union_members um ON um.user_id = ual.user_id AND um.union_id = esign_certificates.union_id
      WHERE ual.auth_user_id = auth.uid() AND um.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ─── 3. 투표 무결성 증명 (머클 루트 + TSA) ────────────────
CREATE TABLE vote_integrity_proofs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id                    uuid NOT NULL REFERENCES unions(id),
  assembly_id                 uuid NOT NULL REFERENCES assemblies(id),
  poll_id                     uuid,
  participation_merkle_root   char(64) NOT NULL,
  ballot_merkle_root          char(64) NOT NULL,
  tsa_timestamp               timestamptz,
  tsa_token                   bytea,
  sealed_at                   timestamptz NOT NULL DEFAULT now(),
  sealed_by                   varchar(100) NOT NULL
);

CREATE INDEX idx_vote_proofs_assembly ON vote_integrity_proofs (assembly_id, union_id);

COMMENT ON TABLE vote_integrity_proofs IS '투표 종료 시 머클 루트 해시 + TSA 타임스탬프 봉인';

ALTER TABLE vote_integrity_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY vote_proofs_select ON vote_integrity_proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_auth_links ual
      JOIN union_members um ON um.user_id = ual.user_id AND um.union_id = vote_integrity_proofs.union_id
      WHERE ual.auth_user_id = auth.uid()
    )
  );
