-- Phase 5 Migration 002: 원자적 총회 상태 전이 RPC
-- Fix 3 (B3): 비원자적 상태 전이 → 단일 트랜잭션 RPC

CREATE OR REPLACE FUNCTION transition_assembly_status(
  p_assembly_id     uuid,
  p_union_id        uuid,
  p_actor_id        varchar,
  p_new_status      text,
  p_reason          text DEFAULT NULL,
  p_reason_code     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_poll_count     int := 0;
BEGIN
  -- 1. FOR UPDATE 잠금 (동시 전이 방지)
  SELECT status INTO v_current_status
    FROM assemblies
   WHERE id = p_assembly_id AND union_id = p_union_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '총회를 찾을 수 없습니다.');
  END IF;

  -- 2. 상태 기계 유효성 검증
  IF NOT (
    (v_current_status = 'NOTICE_SENT'   AND p_new_status = 'CONVENED') OR
    (v_current_status = 'CONVENED'      AND p_new_status = 'IN_PROGRESS') OR
    (v_current_status = 'IN_PROGRESS'   AND p_new_status = 'VOTING') OR
    (v_current_status = 'VOTING'        AND p_new_status = 'VOTING_CLOSED') OR
    (v_current_status = 'VOTING_CLOSED' AND p_new_status = 'CLOSED') OR
    (v_current_status = 'CLOSED'        AND p_new_status = 'ARCHIVED') OR
    (p_new_status = 'CANCELLED' AND v_current_status IN (
      'DRAFT', 'NOTICE_SENT', 'CONVENED', 'IN_PROGRESS', 'VOTING'))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('%s에서 %s(으)로 전환할 수 없습니다.', v_current_status, p_new_status));
  END IF;

  -- 3. assemblies 상태 업데이트
  UPDATE assemblies
     SET status = p_new_status
   WHERE id = p_assembly_id AND union_id = p_union_id;

  -- 4. polls 일괄 상태 변경
  IF p_new_status = 'VOTING' AND v_current_status = 'IN_PROGRESS' THEN
    UPDATE polls
       SET status = 'OPEN',
           opened_by = p_actor_id,
           opens_at = now()
     WHERE assembly_id = p_assembly_id
       AND union_id = p_union_id
       AND status = 'SCHEDULED';
    GET DIAGNOSTICS v_poll_count = ROW_COUNT;

  ELSIF p_new_status = 'VOTING_CLOSED' THEN
    UPDATE polls
       SET status = 'CLOSED',
           closed_by = p_actor_id,
           closes_at = now(),
           close_reason_code = COALESCE(p_reason_code, 'NORMAL'),
           close_reason = p_reason
     WHERE assembly_id = p_assembly_id
       AND union_id = p_union_id
       AND status = 'OPEN';
    GET DIAGNOSTICS v_poll_count = ROW_COUNT;

  ELSIF p_new_status = 'CANCELLED' AND v_current_status = 'VOTING' THEN
    UPDATE polls SET status = 'CANCELLED'
     WHERE assembly_id = p_assembly_id
       AND union_id = p_union_id
       AND status = 'OPEN';
    GET DIAGNOSTICS v_poll_count = ROW_COUNT;
  END IF;

  -- 5. 감사 로그 INSERT
  INSERT INTO assembly_audit_logs (
    assembly_id, union_id, event_type, actor_id, actor_role,
    target_type, target_id, event_data
  ) VALUES (
    p_assembly_id, p_union_id, 'STATUS_CHANGE', p_actor_id, 'ADMIN',
    'assembly', p_assembly_id::text,
    jsonb_build_object(
      'from_status', v_current_status,
      'to_status',   p_new_status,
      'poll_count',  v_poll_count,
      'reason',      p_reason,
      'reason_code', p_reason_code
    )
  );

  RETURN jsonb_build_object(
    'success',     true,
    'from_status', v_current_status,
    'to_status',   p_new_status,
    'poll_count',  v_poll_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION transition_assembly_status IS
  '총회 상태 전이를 원자적으로 실행. NOTICE_SENT 전이는 transition_to_notice_sent RPC 사용.';
