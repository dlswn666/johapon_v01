-- Phase 5 Migration 001: 투표 기간 잠금 필드 추가
-- Workstream A: 법적 투표 기간 보호

ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS legal_opens_at         timestamptz,
  ADD COLUMN IF NOT EXISTS legal_closes_at        timestamptz,
  ADD COLUMN IF NOT EXISTS legal_window_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_reason           text,
  ADD COLUMN IF NOT EXISTS close_reason_code      text
    CHECK (close_reason_code IN ('NORMAL', 'EMERGENCY', 'COURT_ORDER'));

-- 법적 창 잠금 후 수정 차단 트리거
CREATE OR REPLACE FUNCTION prevent_locked_window_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.legal_window_locked_at IS NOT NULL AND (
    NEW.legal_opens_at  IS DISTINCT FROM OLD.legal_opens_at  OR
    NEW.legal_closes_at IS DISTINCT FROM OLD.legal_closes_at
  ) THEN
    RAISE EXCEPTION '법적 투표 창은 잠금 이후 수정할 수 없습니다. (잠금 시각: %)',
      OLD.legal_window_locked_at
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_window ON polls;
CREATE TRIGGER trg_prevent_locked_window
  BEFORE UPDATE ON polls
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_window_change();

COMMENT ON COLUMN polls.legal_opens_at IS '법적 투표 시작 시각 (소집공고 후 잠금)';
COMMENT ON COLUMN polls.legal_closes_at IS '법적 투표 마감 시각 (소집공고 후 잠금)';
COMMENT ON COLUMN polls.legal_window_locked_at IS '잠금 시각 (NULL이면 미잠금)';
COMMENT ON COLUMN polls.close_reason_code IS '마감 사유 코드 (NORMAL/EMERGENCY/COURT_ORDER)';
