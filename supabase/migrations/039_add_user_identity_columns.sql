-- 039_add_user_identity_columns.sql
-- KG이니시스 본인확인(03) 결과 저장용 컬럼 추가

SET search_path TO public;

-- CI/DI 해시 저장 (평문 저장 안 함)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ci_hash varchar(128) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS di_hash varchar(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_provider varchar(20);

COMMENT ON COLUMN users.ci_hash IS 'SHA256(CI) — 본인확인 동일인 판별용, UNIQUE로 중복가입 방지';
COMMENT ON COLUMN users.di_hash IS 'SHA256(DI) — 서비스 내 중복가입 판별';
COMMENT ON COLUMN users.identity_verified_at IS 'KG이니시스 본인확인 최초 완료 시각';
COMMENT ON COLUMN users.identity_provider IS '본인확인 제공자 (KG_INICIS)';
