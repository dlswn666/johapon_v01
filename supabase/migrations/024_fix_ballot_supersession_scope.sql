-- Migration 024: cast_vote() 재생성 — C-01 ~ C-03, C-06 수정
-- C-01: ballot_group_id로 스코프된 supersession (전체 투표 무효화 버그 수정)
-- C-02: auth_nonce 필수 (PASS 인증 우회 방지)
-- C-03: advisory lock으로 중복 투표 경합조건 방지
-- C-06: allow_vote_revision 서버측 검증

-- ============================================================
-- 1. ballot_group_id 컬럼 추가
-- ============================================================

-- vote_ballots: 동일 사용자의 투표 묶음 식별 (비밀투표 유지, user_id 없음)
ALTER TABLE vote_ballots
  ADD COLUMN IF NOT EXISTS ballot_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_vote_ballots_ballot_group_id
  ON vote_ballots(ballot_group_id) WHERE ballot_group_id IS NOT NULL;

-- participation_records: ballot_group_id 대응 (user↔ballot 간접 매핑)
ALTER TABLE participation_records
  ADD COLUMN IF NOT EXISTS ballot_group_id uuid;

-- participation_records에 is_superseded / superseded_at 컬럼 보장
ALTER TABLE participation_records
  ADD COLUMN IF NOT EXISTS is_superseded boolean NOT NULL DEFAULT false;

ALTER TABLE participation_records
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_participation_records_ballot_group
  ON participation_records(user_id, poll_id, ballot_group_id)
  WHERE is_superseded = false;

-- ============================================================
-- 2. cast_vote() RPC 재생성
-- ============================================================

-- 기존 함수 시그니처 DROP 후 새로 생성 (파라미터 변경됨)
DROP FUNCTION IF EXISTS cast_vote(uuid, uuid, uuid, varchar, uuid, uuid, numeric, text);

CREATE OR REPLACE FUNCTION cast_vote(
  p_poll_id       uuid,
  p_assembly_id   uuid,
  p_union_id      uuid,
  p_user_id       varchar,
  p_snapshot_id   uuid,
  p_option_id     uuid,
  p_voting_weight numeric  DEFAULT 1,
  p_auth_nonce    text     -- C-02: DEFAULT NULL 제거 — 필수 파라미터
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_receipt_token    text;
  v_poll_status      text;
  v_already_voted    boolean;
  v_delegation_state text;
  v_ballot_group_id  uuid;
  v_allow_revision   boolean;
  v_old_ballot_group uuid;
BEGIN
  -- ──────────────────────────────────────────────
  -- [0] C-02: auth_nonce 필수 검증
  -- ──────────────────────────────────────────────
  IF p_auth_nonce IS NULL THEN
    RAISE EXCEPTION '본인인증이 필요합니다.';
  END IF;

  -- ──────────────────────────────────────────────
  -- [1] auth_nonce 유효성 검증 (PASS Step-up 인증, 60초 TTL, 1회용)
  -- ──────────────────────────────────────────────
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

  -- ──────────────────────────────────────────────
  -- [2] C-03: advisory lock — 동일 사용자+투표 경합조건 방지
  -- ──────────────────────────────────────────────
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id || p_poll_id::text));

  -- ──────────────────────────────────────────────
  -- [3] 투표 상태 확인
  -- ──────────────────────────────────────────────
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

  -- ──────────────────────────────────────────────
  -- [4] 중복 투표 방지 + C-06: allow_vote_revision 서버측 검증
  -- ──────────────────────────────────────────────
  SELECT EXISTS(
    SELECT 1 FROM participation_records
     WHERE assembly_id  = p_assembly_id
       AND user_id      = p_user_id
       AND poll_id      = p_poll_id
       AND is_superseded = false
  ) INTO v_already_voted;

  IF v_already_voted THEN
    -- C-06: 재투표 허용 여부 서버측 검증
    IF NOT v_allow_revision THEN
      RAISE EXCEPTION '이 투표는 수정이 허용되지 않습니다.';
    END IF;

    -- C-01: 기존 ballot_group_id 조회 (스코프된 supersession)
    SELECT ballot_group_id INTO v_old_ballot_group
      FROM participation_records
     WHERE user_id      = p_user_id
       AND poll_id      = p_poll_id
       AND is_superseded = false
     LIMIT 1;

    -- participation_records supersede (사용자 본인 것만)
    UPDATE participation_records
       SET is_superseded = true, superseded_at = now()
     WHERE assembly_id  = p_assembly_id
       AND user_id      = p_user_id
       AND poll_id      = p_poll_id
       AND is_superseded = false;

    -- C-01: vote_ballots supersede — ballot_group_id로 스코프 (다른 사용자 투표 보호)
    IF v_old_ballot_group IS NOT NULL THEN
      UPDATE vote_ballots
         SET is_superseded = true, superseded_at = now()
       WHERE poll_id         = p_poll_id
         AND assembly_id     = p_assembly_id
         AND ballot_group_id = v_old_ballot_group
         AND is_superseded   = false;
    END IF;
  END IF;

  -- ──────────────────────────────────────────────
  -- [5] 위임 상태 확인
  -- ──────────────────────────────────────────────
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

  -- ──────────────────────────────────────────────
  -- [6] 새 ballot_group_id 생성
  -- ──────────────────────────────────────────────
  v_ballot_group_id := gen_random_uuid();

  -- ──────────────────────────────────────────────
  -- [7] participation_records INSERT
  -- ──────────────────────────────────────────────
  INSERT INTO participation_records (
    assembly_id, union_id, user_id, snapshot_id, poll_id,
    voting_method, voted_at, ballot_group_id
  ) VALUES (
    p_assembly_id, p_union_id, p_user_id, p_snapshot_id, p_poll_id,
    'ELECTRONIC', now(), v_ballot_group_id
  );

  -- ──────────────────────────────────────────────
  -- [8] vote_ballots INSERT (ballot_group_id 포함)
  -- ──────────────────────────────────────────────
  INSERT INTO vote_ballots (
    assembly_id, union_id, poll_id, option_id,
    voting_method, voting_weight, submitted_at, ballot_group_id
  ) VALUES (
    p_assembly_id, p_union_id, p_poll_id, p_option_id,
    'ELECTRONIC', p_voting_weight, now(), v_ballot_group_id
  );

  -- ──────────────────────────────────────────────
  -- [9] receipt_token 생성 및 registry INSERT
  -- ──────────────────────────────────────────────
  v_receipt_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO vote_receipt_registry (
    union_id, assembly_id, poll_id, snapshot_id,
    receipt_token_hash, issued_at
  ) VALUES (
    p_union_id, p_assembly_id, p_poll_id, p_snapshot_id,
    encode(sha256(v_receipt_token::bytea), 'hex'),
    now()
  ) ON CONFLICT (receipt_token_hash) DO NOTHING;

  -- ──────────────────────────────────────────────
  -- [10] 감사 로그
  -- ──────────────────────────────────────────────
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
  'cast_vote RPC v2: ballot_group_id 스코프 supersession, 필수 auth_nonce, advisory lock, allow_vote_revision 서버 검증';
