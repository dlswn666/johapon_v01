-- Phase 5 Migration 008: 증거 패키지 서명 필드 추가
-- Workstream F: 증거 패키지 v2

ALTER TABLE assemblies
  ADD COLUMN IF NOT EXISTS evidence_package_hash      text,
  ADD COLUMN IF NOT EXISTS evidence_package_signed_by  varchar,
  ADD COLUMN IF NOT EXISTS evidence_package_signed_at  timestamptz;

COMMENT ON COLUMN assemblies.evidence_package_hash IS '증거 패키지 SHA-256 해시';
COMMENT ON COLUMN assemblies.evidence_package_signed_by IS '증거 패키지 서명자 (users.id, VARCHAR)';
COMMENT ON COLUMN assemblies.evidence_package_signed_at IS '증거 패키지 서명 시각';
