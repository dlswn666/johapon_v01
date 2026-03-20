-- Migration 021: written_ballot_inputs 4-Eye 원칙 트리거
-- 해소 갭: SEC-08
-- SR-007: created_by != verified_by CHECK 강제

CREATE OR REPLACE FUNCTION check_written_ballot_four_eye()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.status = 'VERIFIED' THEN
    IF NEW.verified_by IS NULL THEN
      RAISE EXCEPTION 'SR-007 위반: VERIFIED 상태에서는 검증자(verified_by)가 필요합니다.';
    END IF;

    IF NEW.created_by = NEW.verified_by THEN
      RAISE EXCEPTION
        'SR-007 위반: 4-Eye 원칙 — 현장투표 입력자와 검증자는 다른 사람이어야 합니다. (created_by: %)',
        NEW.created_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_four_eye_check ON written_ballot_inputs;
CREATE TRIGGER trg_four_eye_check
  BEFORE INSERT OR UPDATE ON written_ballot_inputs
  FOR EACH ROW
  EXECUTE FUNCTION check_written_ballot_four_eye();

COMMENT ON FUNCTION check_written_ballot_four_eye() IS
  '현장투표 4-Eye 원칙: VERIFIED 상태에서 입력자(created_by) ≠ 검증자(verified_by) 강제';
