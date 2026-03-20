-- Migration 028: 설계문서 정합 — 투표 유형 + 후보자/업체 필드
-- 설계문서: VoteType (APPROVE/ELECT/SELECT), SubVote 후보자/업체 정보
-- 현재: polls에 vote_type 없음, poll_options에 label/description만 존재

-- 1. polls 테이블에 vote_type 추가 (찬반/선출/시공사 구분)
ALTER TABLE polls ADD COLUMN IF NOT EXISTS vote_type VARCHAR(20)
  NOT NULL DEFAULT 'APPROVE'
  CHECK (vote_type IN ('APPROVE', 'ELECT', 'SELECT'));

-- 2. polls 테이블에 선출/선정 인원수 추가
ALTER TABLE polls ADD COLUMN IF NOT EXISTS elect_count INT;

-- 3. poll_options 테이블에 후보자 정보 필드 추가 (선출투표 ELECT)
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS candidate_name VARCHAR(100);
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS candidate_info TEXT;

-- 4. poll_options 테이블에 업체 정보 필드 추가 (시공사 선정 SELECT)
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS bid_amount VARCHAR(50);
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS company_info TEXT;

-- 5. poll_options 테이블에 당선/선정 결과 필드 추가
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS is_elected BOOLEAN;

-- 6. 인덱스: 투표 유형별 조회
CREATE INDEX IF NOT EXISTS idx_polls_vote_type ON polls(vote_type);

-- 코멘트
COMMENT ON COLUMN polls.vote_type IS '투표 유형: APPROVE(찬반), ELECT(선출), SELECT(시공사/업체 선정)';
COMMENT ON COLUMN polls.elect_count IS '선출/선정 인원수 (ELECT/SELECT 타입에서 사용)';
COMMENT ON COLUMN poll_options.candidate_name IS '후보자 이름 (ELECT 타입)';
COMMENT ON COLUMN poll_options.candidate_info IS '후보자 한줄 소개 (ELECT 타입, 예: "現 감사 / 구역 대표")';
COMMENT ON COLUMN poll_options.company_name IS '업체명 (SELECT 타입)';
COMMENT ON COLUMN poll_options.bid_amount IS '입찰금액 (SELECT 타입, 예: "1,200억")';
COMMENT ON COLUMN poll_options.company_info IS '업체 비고 (SELECT 타입, 예: "시공실적 42건")';
COMMENT ON COLUMN poll_options.is_elected IS '당선/선정 여부 (ELECT/SELECT 타입, 개표 후 설정)';
