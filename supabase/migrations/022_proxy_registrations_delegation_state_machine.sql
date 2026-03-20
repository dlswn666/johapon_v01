-- Migration 022: proxy_registrations 6-state delegation machine
-- 해소 갭: Delegation state machine

-- 1. 신규 컬럼 추가
ALTER TABLE proxy_registrations
  ADD COLUMN IF NOT EXISTS expires_at       timestamptz,
  ADD COLUMN IF NOT EXISTS used_at          timestamptz,
  ADD COLUMN IF NOT EXISTS delegate_user_id varchar;

-- 2. 기존 상태 매핑 (데이터 보존 마이그레이션)
UPDATE proxy_registrations SET status = 'confirmed' WHERE status = 'APPROVED';
UPDATE proxy_registrations SET status = 'pending'   WHERE status = 'PENDING';
UPDATE proxy_registrations SET status = 'expired'   WHERE status = 'REJECTED';
UPDATE proxy_registrations SET status = 'revoked'   WHERE status = 'REVOKED';

-- 3. pending/confirmed 상태에 expires_at 기본값 설정
UPDATE proxy_registrations
   SET expires_at = created_at + INTERVAL '24 hours'
 WHERE status IN ('pending', 'confirmed')
   AND expires_at IS NULL;

-- 4. 상태 전이 검증 트리거
CREATE OR REPLACE FUNCTION check_delegation_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'draft'     AND NEW.status = 'pending')    OR
      (OLD.status = 'pending'   AND NEW.status = 'confirmed')  OR
      (OLD.status = 'pending'   AND NEW.status = 'expired')    OR
      (OLD.status = 'pending'   AND NEW.status = 'revoked')    OR
      (OLD.status = 'confirmed' AND NEW.status = 'used')       OR
      (OLD.status = 'confirmed' AND NEW.status = 'revoked')    OR
      (OLD.status = 'confirmed' AND NEW.status = 'expired')
    ) THEN
      RAISE EXCEPTION
        '위임 상태 전이 오류: [%] → [%] 전이는 허용되지 않습니다.',
        OLD.status, NEW.status;
    END IF;
  END IF;

  IF NEW.status = 'used' AND NEW.used_at IS NULL THEN
    NEW.used_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delegation_state ON proxy_registrations;
CREATE TRIGGER trg_delegation_state
  BEFORE UPDATE ON proxy_registrations
  FOR EACH ROW
  EXECUTE FUNCTION check_delegation_state_transition();

COMMENT ON TABLE proxy_registrations IS
  '위임 상태 머신: draft → pending → confirmed → used|revoked|expired';
