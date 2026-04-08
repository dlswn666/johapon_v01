-- 041_extend_consent_and_participation.sql
-- 기존 테이블 확장: signature_type, identity_method, participation 컬럼

SET search_path TO public;

-- ─── 1. assembly_consent_evidences: signature_type 확장 ───
DO $$
BEGIN
  ALTER TABLE assembly_consent_evidences
    DROP CONSTRAINT IF EXISTS assembly_consent_evidences_signature_type_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

ALTER TABLE assembly_consent_evidences
  ADD CONSTRAINT assembly_consent_evidences_signature_type_check
  CHECK (signature_type IN ('SIMPLE', 'KAKAO_CERT', 'PASS_CERT', 'KG_ESIGN'));

-- ─── 2. participation_records: 인증 기록 + 해시 컬럼 추가 ──
ALTER TABLE participation_records
  ADD COLUMN IF NOT EXISTS consent_evidence_id uuid REFERENCES assembly_consent_evidences(id),
  ADD COLUMN IF NOT EXISTS auth_tx_id varchar(40),
  ADD COLUMN IF NOT EXISTS auth_method varchar(50),
  ADD COLUMN IF NOT EXISTS auth_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS record_hash char(64);

COMMENT ON COLUMN participation_records.consent_evidence_id IS '전자서명 동의 증거 연결';
COMMENT ON COLUMN participation_records.auth_tx_id IS 'KG이니시스 간편인증 거래 ID';
COMMENT ON COLUMN participation_records.auth_method IS '인증 수단 (PASS, KAKAO, NAVER 등)';
COMMENT ON COLUMN participation_records.record_hash IS 'SHA-256 무결성 해시';

-- ─── 3. vote_ballots: 무결성 해시 컬럼 추가 ───────────────
ALTER TABLE vote_ballots
  ADD COLUMN IF NOT EXISTS ballot_hash char(64);

COMMENT ON COLUMN vote_ballots.ballot_hash IS 'SHA-256 무결성 해시';

-- ─── 4. assembly_member_snapshots: identity_method 확장 ───
DO $$
BEGIN
  ALTER TABLE assembly_member_snapshots
    DROP CONSTRAINT IF EXISTS assembly_member_snapshots_identity_method_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

ALTER TABLE assembly_member_snapshots
  ADD CONSTRAINT assembly_member_snapshots_identity_method_check
  CHECK (identity_method IN (
    'KAKAO_LOGIN', 'PASS_CERT', 'CERTIFICATE',
    'KG_INICIS_ID', 'KG_INICIS_SIMPLE', 'KG_INICIS_ESIGN'
  ));
