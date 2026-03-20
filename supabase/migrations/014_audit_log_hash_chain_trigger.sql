-- Migration 014: assembly_audit_logs 해시 체인 트리거 정규화
-- 해소 갭: INFRA-02

CREATE OR REPLACE FUNCTION compute_audit_log_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_prev_hash text;
  v_content   text;
BEGIN
  SELECT current_hash INTO v_prev_hash
    FROM assembly_audit_logs
   WHERE assembly_id = NEW.assembly_id
     AND union_id    = NEW.union_id
   ORDER BY created_at DESC
   LIMIT 1;

  NEW.prev_hash := COALESCE(
    v_prev_hash,
    '0000000000000000000000000000000000000000000000000000000000000000'
  );

  v_content :=
    NEW.prev_hash
    || COALESCE(NEW.event_type, '')
    || COALESCE(NEW.actor_id,   '')
    || COALESCE(NEW.target_id,  '')
    || COALESCE(NEW.event_data::text, '{}')
    || COALESCE(NEW.created_at, now())::text;

  NEW.current_hash := encode(sha256(v_content::bytea), 'hex');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_hash ON assembly_audit_logs;
CREATE TRIGGER trg_audit_log_hash
  BEFORE INSERT ON assembly_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION compute_audit_log_hash();

COMMENT ON FUNCTION compute_audit_log_hash() IS
  'assembly_audit_logs INSERT 시 prev_hash/current_hash를 자동 계산하는 WORM 해시 체인 트리거';
