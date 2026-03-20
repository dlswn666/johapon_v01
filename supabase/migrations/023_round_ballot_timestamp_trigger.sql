-- Migration 023: round_ballot_timestamp 트리거 정규화
-- 해소 갭: INFRA-02 관련
-- 비밀투표 시간 상관관계 방어: created_at을 10분 단위로 라운딩

CREATE OR REPLACE FUNCTION round_ballot_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.created_at := date_trunc('hour', NEW.created_at)
    + (EXTRACT(MINUTE FROM NEW.created_at)::integer / 10) * INTERVAL '10 minutes';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_round_ballot_timestamp ON vote_ballots;
CREATE TRIGGER trg_round_ballot_timestamp
  BEFORE INSERT ON vote_ballots
  FOR EACH ROW
  EXECUTE FUNCTION round_ballot_timestamp();

COMMENT ON FUNCTION round_ballot_timestamp() IS
  'vote_ballots INSERT 시 created_at을 10분 단위로 라운딩. 시간 상관관계 기반 역추적 방어.';
