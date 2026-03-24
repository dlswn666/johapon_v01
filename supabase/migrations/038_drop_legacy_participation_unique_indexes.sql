-- 038: 재투표(vote revision)를 차단하는 레거시 UNIQUE 인덱스 제거
--
-- 문제: idx_participation_poll_user와 participation_records_poll_user_unique가
--       (poll_id, user_id)에 대해 무조건적인 UNIQUE 제약을 설정하여
--       allow_vote_revision=true일 때 재투표(supersede 후 새 레코드 INSERT)를 차단함
--
-- 올바른 인덱스: uidx_participation_active (migration 033에서 생성)
--   → UNIQUE (assembly_id, user_id, poll_id) WHERE (is_superseded = false)
--   → 활성 투표만 유일성 보장, superseded 레코드는 허용
--
-- 발견: E2E 테스트 S4.1 (재투표 시나리오)

ALTER TABLE participation_records DROP CONSTRAINT IF EXISTS participation_records_poll_user_unique;
DROP INDEX IF EXISTS idx_participation_poll_user;
