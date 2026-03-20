-- Migration 026: ballot_group_id 비밀투표 위반 수정
-- 보안 검증 발견: ballot_group_id가 participation_records(user_id 포함)와
-- vote_ballots(user_id 없음) 양쪽에 동일 값으로 저장되어 JOIN으로 역추적 가능.
-- 해결: vote_ballots에서 ballot_group_id를 분리 (다른 UUID 사용)

-- ============================================================
-- 1. vote_ballots의 ballot_group_id를 내부 전용으로 변경
--    (participation_records와 동일한 값을 사용하지 않도록)
-- ============================================================

-- vote_ballots에 ballot_internal_group_id 추가 (내부 supersession 전용)
ALTER TABLE vote_ballots
  ADD COLUMN IF NOT EXISTS ballot_internal_group_id uuid;

-- 기존 ballot_group_id 값을 내부 그룹으로 복사
UPDATE vote_ballots
   SET ballot_internal_group_id = ballot_group_id
 WHERE ballot_group_id IS NOT NULL
   AND ballot_internal_group_id IS NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_vote_ballots_internal_group
  ON vote_ballots(ballot_internal_group_id)
  WHERE ballot_internal_group_id IS NOT NULL AND is_superseded = false;

-- vote_ballots에서 ballot_group_id 컬럼 제거 (역추적 경로 차단)
ALTER TABLE vote_ballots DROP COLUMN IF EXISTS ballot_group_id;

-- ballot_group_id 인덱스 제거
DROP INDEX IF EXISTS idx_vote_ballots_ballot_group_id;

-- ============================================================
-- 2. cast_vote() RPC 수정: 분리된 group_id 사용
-- ============================================================

DROP FUNCTION IF EXISTS cast_vote(uuid, uuid, uuid, varchar, uuid, uuid, numeric, text);

CREATE OR REPLACE FUNCTION cast_vote(
  p_poll_id       uuid,
  p_assembly_id   uuid,
  p_union_id      uuid,
  p_user_id       varchar,
  p_snapshot_id   uuid,
  p_option_id     uuid,
  p_voting_weight numeric  DEFAULT 1,
  p_auth_nonce    text     -- 필수 (DEFAULT NULL 없음)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_receipt_token             text;
  v_poll_status               text;
  v_already_voted             boolean;
  v_delegation_state          text;
  v_participation_group_id    uuid;  -- participation_records 전용
  v_ballot_internal_group_id  uuid;  -- vote_ballots 전용 (서로 다른 UUID)
  v_allow_revision            boolean;
  v_old_participation_group   uuid;
  v_old_ballot_internal_group uuid;
BEGIN
  -- [0] auth_nonce 필수 검증
  IF p_auth_nonce IS NULL THEN
    RAISE EXCEPTION '본인인증이 필요합니다.';
  END IF;

  -- [1] auth_nonce 유효성 검증 (PASS Step-up 인증, 60초 TTL, 1회용)
  UPDATE auth_nonces
     SET used_at = now()
   WHERE nonce        = p_auth_nonce
     AND user_id      = p_user_id
     AND assembly_id  = p_assembly_id
     AND used_at      IS NULL
     AND expires_at   > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION '유효하지 않거나 만료된 인증 토큰입니다. 다시 인증해주세요.';
  END IF;

  -- [2] advisory lock — 동일 사용자+투표 경합조건 방지
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id || p_poll_id::text));

  -- [3] 투표 상태 확인
  SELECT status, allow_vote_revision
    INTO v_poll_status, v_allow_revision
    FROM polls
   WHERE id = p_poll_id AND assembly_id = p_assembly_id AND union_id = p_union_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '해당 투표를 찾을 수 없습니다.';
  END IF;

  IF v_poll_status != 'OPEN' THEN
    RAISE EXCEPTION '투표가 진행 중이 아닙니다. (현재 상태: %)', v_poll_status;
  END IF;

  -- [4] 중복 투표 방지 + allow_vote_revision 서버측 검증
  SELECT EXISTS(
    SELECT 1 FROM participation_records
     WHERE assembly_id  = p_assembly_id
       AND user_id      = p_user_id
       AND poll_id      = p_poll_id
       AND is_superseded = false
  ) INTO v_already_voted;

  IF v_already_voted THEN
    IF NOT v_allow_revision THEN
      RAISE EXCEPTION '이 투표는 수정이 허용되지 않습니다.';
    END IF;

    -- 기존 ballot_group_id 조회 (participation_records에서)
    SELECT ballot_group_id INTO v_old_participation_group
      FROM participation_records
     WHERE user_id      = p_user_id
       AND poll_id      = p_poll_id
       AND is_superseded = false
     LIMIT 1;

    -- participation_records에서 old ballot_internal_group_id 찾기
    -- (같은 그룹의 ballot을 supersede하기 위해)
    SELECT ballot_internal_group_id INTO v_old_ballot_internal_group
      FROM vote_ballots
     WHERE poll_id      = p_poll_id
       AND assembly_id  = p_assembly_id
       AND is_superseded = false
       -- ballot_internal_group_id는 participation_records의 ballot_group_id와
       -- 1:1 매핑되지 않으므로, 시간 기반으로 최근 것을 찾음
     ORDER BY submitted_at DESC
     LIMIT 1;

    -- participation_records supersede (사용자 본인 것만)
    UPDATE participation_records
       SET is_superseded = true, superseded_at = now()
     WHERE assembly_id  = p_assembly_id
       AND user_id      = p_user_id
       AND poll_id      = p_poll_id
       AND is_superseded = false;

    -- vote_ballots supersede — ballot_internal_group_id로 스코프
    IF v_old_ballot_internal_group IS NOT NULL THEN
      UPDATE vote_ballots
         SET is_superseded = true, superseded_at = now()
       WHERE poll_id                  = p_poll_id
         AND assembly_id              = p_assembly_id
         AND ballot_internal_group_id = v_old_ballot_internal_group
         AND is_superseded            = false;
    END IF;
  END IF;

  -- [5] 위임 상태 확인
  SELECT status INTO v_delegation_state
    FROM proxy_registrations
   WHERE assembly_id   = p_assembly_id
     AND delegator_id  = p_user_id
     AND status IN ('pending', 'confirmed')
   LIMIT 1;

  IF v_delegation_state = 'pending' THEN
    RAISE EXCEPTION '위임 확인 대기 중에는 직접 투표할 수 없습니다.';
  END IF;

  IF v_delegation_state = 'confirmed' THEN
    RAISE EXCEPTION '위임이 확정된 상태에서는 직접 투표할 수 없습니다. 위임을 취소한 후 투표해주세요.';
  END IF;

  -- [6] 새 그룹 ID 생성 (각각 별도 UUID — 비밀투표 보호)
  v_participation_group_id   := gen_random_uuid();
  v_ballot_internal_group_id := gen_random_uuid();

  -- [7] participation_records INSERT (user_id 포함 — 누가 투표했는지)
  INSERT INTO participation_records (
    assembly_id, union_id, user_id, snapshot_id, poll_id,
    voting_method, voted_at, ballot_group_id
  ) VALUES (
    p_assembly_id, p_union_id, p_user_id, p_snapshot_id, p_poll_id,
    'ELECTRONIC', now(), v_participation_group_id
  );

  -- [8] vote_ballots INSERT (user_id 없음 — 무엇을 선택했는지만)
  INSERT INTO vote_ballots (
    assembly_id, union_id, poll_id, option_id,
    voting_method, voting_weight, submitted_at, ballot_internal_group_id
  ) VALUES (
    p_assembly_id, p_union_id, p_poll_id, p_option_id,
    'ELECTRONIC', p_voting_weight, now(), v_ballot_internal_group_id
  );

  -- [9] receipt_token 생성 및 registry INSERT
  v_receipt_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO vote_receipt_registry (
    union_id, assembly_id, poll_id, snapshot_id,
    receipt_token_hash, issued_at
  ) VALUES (
    p_union_id, p_assembly_id, p_poll_id, p_snapshot_id,
    encode(sha256(v_receipt_token::bytea), 'hex'),
    now()
  ) ON CONFLICT (receipt_token_hash) DO NOTHING;

  -- [10] 감사 로그
  INSERT INTO assembly_audit_logs (
    assembly_id, union_id, event_type,
    actor_id, actor_role, target_type, target_id,
    event_data, current_hash
  ) VALUES (
    p_assembly_id, p_union_id, 'VOTE_CAST',
    p_user_id, 'MEMBER', 'poll', p_poll_id::text,
    jsonb_build_object(
      'poll_id', p_poll_id,
      'voting_method', 'ELECTRONIC',
      'has_auth_nonce', true,
      'is_revote', v_already_voted
    ),
    ''
  );

  RETURN jsonb_build_object(
    'success',        true,
    'receipt_token',  v_receipt_token
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION cast_vote(uuid, uuid, uuid, varchar, uuid, uuid, numeric, text)
  TO authenticated;

COMMENT ON FUNCTION cast_vote IS
  '전자투표 실행 RPC — PASS 인증 + 비밀투표 보호 (ballot_group_id 분리)';
