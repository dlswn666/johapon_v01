-- Migration 015: verify_audit_log_integrity() 함수 정규화
-- 해소 갭: INFRA-03

CREATE OR REPLACE FUNCTION verify_audit_log_integrity(
  p_assembly_id uuid,
  p_union_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_expected_prev text := '0000000000000000000000000000000000000000000000000000000000000000';
  v_errors        text[] := ARRAY[]::text[];
  v_log           record;
  v_count         int := 0;
  v_expected_hash text;
  v_content       text;
BEGIN
  FOR v_log IN
    SELECT id, event_type, actor_id, target_id, event_data,
           prev_hash, current_hash, created_at
      FROM assembly_audit_logs
     WHERE assembly_id = p_assembly_id
       AND union_id    = p_union_id
     ORDER BY created_at ASC, id ASC
  LOOP
    v_count := v_count + 1;

    IF v_log.prev_hash IS DISTINCT FROM v_expected_prev THEN
      v_errors := array_append(v_errors,
        format('로그 %s: prev_hash 불일치 (expected: %s, got: %s)',
          v_log.id, v_expected_prev, v_log.prev_hash));
    END IF;

    v_content :=
      COALESCE(v_log.prev_hash, '0000000000000000000000000000000000000000000000000000000000000000')
      || COALESCE(v_log.event_type, '')
      || COALESCE(v_log.actor_id,   '')
      || COALESCE(v_log.target_id,  '')
      || COALESCE(v_log.event_data::text, '{}')
      || v_log.created_at::text;

    v_expected_hash := encode(sha256(v_content::bytea), 'hex');

    IF v_log.current_hash IS DISTINCT FROM v_expected_hash THEN
      v_errors := array_append(v_errors,
        format('로그 %s: current_hash 불일치 (expected: %s, got: %s)',
          v_log.id, v_expected_hash, v_log.current_hash));
    END IF;

    v_expected_prev := v_log.current_hash;
  END LOOP;

  RETURN jsonb_build_object(
    'valid',      array_length(v_errors, 1) IS NULL,
    'log_count',  v_count,
    'errors',     to_jsonb(v_errors)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION verify_audit_log_integrity(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION verify_audit_log_integrity(uuid, uuid) IS
  '감사 로그 해시 체인 무결성 검증. 결과 확정(tally, publish) 전에 반드시 호출해야 한다.';
