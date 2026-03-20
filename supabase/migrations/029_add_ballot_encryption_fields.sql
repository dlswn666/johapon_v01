-- Migration 029: 설계문서 정합 — 투표 데이터 AES-256-GCM 암호화 지원
-- 설계문서: encryptedBallot + encryptionIv 기반 투표 데이터 암호화
-- 현재: vote_ballots.option_id에 직접 저장
-- 전략: 암호화 필드를 병행 추가하여 점진 전환 (기존 option_id 방식도 유지)

-- 1. vote_ballots에 암호화 필드 추가
ALTER TABLE vote_ballots ADD COLUMN IF NOT EXISTS encrypted_ballot TEXT;
ALTER TABLE vote_ballots ADD COLUMN IF NOT EXISTS encryption_iv VARCHAR(64);
ALTER TABLE vote_ballots ADD COLUMN IF NOT EXISTS encryption_tag VARCHAR(64);

-- 2. 암호화 활성화 여부 (polls 단위 설정)
ALTER TABLE polls ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN NOT NULL DEFAULT false;

-- 코멘트
COMMENT ON COLUMN vote_ballots.encrypted_ballot IS 'AES-256-GCM 암호화된 투표값 (encryption_enabled=true일 때 사용, 개표 시 복호화)';
COMMENT ON COLUMN vote_ballots.encryption_iv IS 'AES-256-GCM Initialization Vector (hex 인코딩)';
COMMENT ON COLUMN vote_ballots.encryption_tag IS 'AES-256-GCM Authentication Tag (hex 인코딩)';
COMMENT ON COLUMN polls.encryption_enabled IS '투표 암호화 활성화 여부 (true: encrypted_ballot 사용, false: option_id 직접 사용)';
