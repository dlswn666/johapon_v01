-- Migration 032: 설계문서 정합 — PRE_VOTING(사전투표) 상태 추가
-- 설계문서: ANNOUNCED → PRE_VOTING → IN_SESSION 흐름
-- 매핑: NOTICE_SENT → PRE_VOTING → CONVENED/IN_PROGRESS
-- PRE_VOTING 진입 시 모든 SCHEDULED polls를 OPEN으로 전환 (사전투표 시작)

CREATE OR REPLACE FUNCTION transition_assembly_status(
  p_assembly_id  uuid,
  p_union_id     uuid,
  p_actor_id     varchar,
  p_new_status   text,
  p_reason       text    DEFAULT NULL,
  p_reason_code  text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_current_status text;
  v_event_type     text;
BEGIN
  -- 현재 상태 조회 + 행 잠금 (동시 전이 방지)
  SELECT status INTO v_current_status
    FROM assemblies
   WHERE id = p_assembly_id AND union_id = p_union_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '총회를 찾을 수 없습니다.');
  END IF;

  -- 유효한 전이 검증 (PRE_VOTING 추가)
  IF NOT (
    -- 기존 전이
    (v_current_status = 'DRAFT'              AND p_new_status = 'NOTICE_SENT') OR
    (v_current_status = 'NOTICE_SENT'        AND p_new_status = 'CONVENED') OR
    -- 신규: NOTICE_SENT → PRE_VOTING (사전투표 시작)
    (v_current_status = 'NOTICE_SENT'        AND p_new_status = 'PRE_VOTING') OR
    -- 신규: PRE_VOTING → CONVENED 또는 IN_PROGRESS (총회 당일 전환)
    (v_current_status = 'PRE_VOTING'         AND p_new_status = 'CONVENED') OR
    (v_current_status = 'PRE_VOTING'         AND p_new_status = 'IN_PROGRESS') OR
    -- 기존 전이 계속
    (v_current_status = 'CONVENED'           AND p_new_status = 'IN_PROGRESS') OR
    (v_current_status = 'IN_PROGRESS'        AND p_new_status = 'VOTING') OR
    (v_current_status = 'VOTING'             AND p_new_status = 'VOTING_CLOSED') OR
    (v_current_status = 'VOTING_CLOSED'      AND p_new_status = 'CLOSED') OR
    (v_current_status = 'CLOSED'             AND p_new_status = 'ARCHIVED') OR
    -- PAUSED (비상 일시정지)
    (v_current_status = 'VOTING'             AND p_new_status = 'PAUSED') OR
    (v_current_status = 'PAUSED'             AND p_new_status = 'VOTING') OR
    -- WRITTEN_TRANSITION (서면 전환)
    (v_current_status = 'VOTING'             AND p_new_status = 'WRITTEN_TRANSITION') OR
    (v_current_status = 'PAUSED'             AND p_new_status = 'WRITTEN_TRANSITION') OR
    (v_current_status = 'WRITTEN_TRANSITION' AND p_new_status = 'VOTING_CLOSED') OR
    -- 취소 (PRE_VOTING 포함)
    (p_new_status = 'CANCELLED' AND v_current_status IN (
      'DRAFT', 'NOTICE_SENT', 'PRE_VOTING', 'CONVENED', 'IN_PROGRESS', 'VOTING', 'PAUSED'
    ))
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('[%s] → [%s] 전이는 허용되지 않습니다.', v_current_status, p_new_status)
    );
  END IF;

  -- 상태 업데이트
  UPDATE assemblies
     SET status = p_new_status
   WHERE id = p_assembly_id AND union_id = p_union_id;

  -- PRE_VOTING 진입 시: SCHEDULED polls를 OPEN으로 전환 (사전투표 시작)
  IF p_new_status = 'PRE_VOTING' THEN
    UPDATE polls
       SET status = 'OPEN',
           opened_by = p_actor_id,
           updated_at = now()
     WHERE assembly_id = p_assembly_id
       AND union_id = p_union_id
       AND status = 'SCHEDULED';
  END IF;

  -- VOTING 진입 시: 아직 SCHEDULED인 polls만 OPEN 전환 (이미 OPEN인 것은 유지)
  IF p_new_status = 'VOTING' THEN
    UPDATE polls
       SET status = 'OPEN',
           opened_by = p_actor_id,
           updated_at = now()
     WHERE assembly_id = p_assembly_id
       AND union_id = p_union_id
       AND status = 'SCHEDULED';
  END IF;

  -- VOTING_CLOSED 진입 시: 모든 OPEN polls 닫기
  IF p_new_status = 'VOTING_CLOSED' THEN
    UPDATE polls
       SET status = 'CLOSED',
           closed_by = p_actor_id,
           close_reason = COALESCE(p_reason, '투표 마감'),
           close_reason_code = COALESCE(p_reason_code, 'NORMAL'),
           updated_at = now()
     WHERE assembly_id = p_assembly_id
       AND union_id = p_union_id
       AND status = 'OPEN';
  END IF;

  -- 이벤트 타입 결정
  v_event_type := CASE p_new_status
    WHEN 'WRITTEN_TRANSITION' THEN 'WRITTEN_TRANSITION'
    ELSE 'STATUS_CHANGE'
  END;

  -- 감사 로그
  INSERT INTO assembly_audit_logs (
    assembly_id, union_id, event_type,
    actor_id, actor_role, target_type, target_id,
    event_data, current_hash
  ) VALUES (
    p_assembly_id, p_union_id, v_event_type,
    p_actor_id, 'ADMIN', 'assembly', p_assembly_id::text,
    jsonb_build_object(
      'from',        v_current_status,
      'to',          p_new_status,
      'reason',      p_reason,
      'reason_code', p_reason_code
    ),
    ''
  );

  RETURN jsonb_build_object('success', true, 'from', v_current_status, 'to', p_new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION transition_assembly_status(uuid, uuid, varchar, text, text, text)
  TO authenticated;
