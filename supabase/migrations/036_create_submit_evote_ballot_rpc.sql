-- Migration 036: submit_evote_ballot RPC
-- 전자투표 일괄 투표 제출 — 단일 트랜잭션으로 여러 안건 투표를 원자적 처리
-- 패턴 참조: cast_vote (013), create_evote_wizard (035)

CREATE OR REPLACE FUNCTION submit_evote_ballot(
  p_assembly_id   uuid,
  p_union_id      uuid,
  p_user_id       varchar,
  p_snapshot_id   uuid,
  p_auth_nonce    text,
  p_votes         jsonb        -- [{ "poll_id": uuid, "option_id": uuid }, ...]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_vote            jsonb;
  v_poll_id         uuid;
  v_option_id       uuid;
  v_poll_status     text;
  v_already_voted   boolean;
  v_delegation_state text;
  v_voting_weight   numeric;
  v_receipt_token   text;
  v_cast_count      int := 0;
  v_skip_count      int := 0;
  v_assembly_status text;
BEGIN
  -- ============================================================
  -- [0] 기본 검증
  -- ============================================================

  -- 총회 상태 확인 (PRE_VOTING 또는 VOTING만 허용)
  SELECT status INTO v_assembly_status
    FROM assemblies
   WHERE id = p_assembly_id AND union_id = p_union_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '해당 총회를 찾을 수 없습니다.';
  END IF;

  IF v_assembly_status NOT IN ('PRE_VOTING', 'VOTING') THEN
    RAISE EXCEPTION '현재 투표를 진행할 수 없는 상태입니다. (상태: %)', v_assembly_status;
  END IF;

  -- 스냅샷에서 투표 가중치 조회
  SELECT voting_weight INTO v_voting_weight
    FROM assembly_member_snapshots
   WHERE id = p_snapshot_id
     AND assembly_id = p_assembly_id
     AND union_id = p_union_id
     AND user_id = p_user_id
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION '유효한 투표 권한이 없습니다.';
  END IF;

  -- auth_nonce 검증 (PASS Step-up 인증)
  IF p_auth_nonce IS NOT NULL THEN
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
  END IF;

  -- 위임 상태 확인
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

  -- votes 배열 검증
  IF p_votes IS NULL OR jsonb_array_length(p_votes) = 0 THEN
    RAISE EXCEPTION '최소 1개의 투표가 필요합니다.';
  END IF;

  -- ============================================================
  -- [1] 투표 순회 처리
  -- ============================================================
  FOR v_vote IN SELECT * FROM jsonb_array_elements(p_votes)
  LOOP
    v_poll_id   := (v_vote->>'poll_id')::uuid;
    v_option_id := (v_vote->>'option_id')::uuid;

    IF v_poll_id IS NULL OR v_option_id IS NULL THEN
      v_skip_count := v_skip_count + 1;
      CONTINUE;
    END IF;

    -- 투표(poll) 상태 확인
    SELECT status INTO v_poll_status
      FROM polls
     WHERE id = v_poll_id
       AND assembly_id = p_assembly_id
       AND union_id = p_union_id
     FOR SHARE;

    IF NOT FOUND OR v_poll_status != 'OPEN' THEN
      v_skip_count := v_skip_count + 1;
      CONTINUE;
    END IF;

    -- 선택지 유효성 확인
    IF NOT EXISTS (
      SELECT 1 FROM poll_options
       WHERE id = v_option_id AND poll_id = v_poll_id
    ) THEN
      v_skip_count := v_skip_count + 1;
      CONTINUE;
    END IF;

    -- 기존 투표 대체 처리 (is_superseded)
    SELECT EXISTS(
      SELECT 1 FROM participation_records
       WHERE assembly_id  = p_assembly_id
         AND user_id      = p_user_id
         AND poll_id      = v_poll_id
         AND is_superseded = false
    ) INTO v_already_voted;

    IF v_already_voted THEN
      UPDATE participation_records
         SET is_superseded = true, superseded_at = now()
       WHERE assembly_id  = p_assembly_id
         AND user_id      = p_user_id
         AND poll_id      = v_poll_id
         AND is_superseded = false;

      UPDATE vote_ballots
         SET is_superseded = true, superseded_at = now()
       WHERE poll_id       = v_poll_id
         AND assembly_id   = p_assembly_id
         AND is_superseded = false;
    END IF;

    -- participation_records INSERT
    INSERT INTO participation_records (
      assembly_id, union_id, user_id, snapshot_id, poll_id,
      voting_method, voted_at
    ) VALUES (
      p_assembly_id, p_union_id, p_user_id, p_snapshot_id, v_poll_id,
      'ELECTRONIC', now()
    );

    -- vote_ballots INSERT (비밀투표: user_id 없음)
    INSERT INTO vote_ballots (
      assembly_id, union_id, poll_id, option_id,
      voting_method, voting_weight, submitted_at
    ) VALUES (
      p_assembly_id, p_union_id, v_poll_id, v_option_id,
      'ELECTRONIC', COALESCE(v_voting_weight, 1), now()
    );

    v_cast_count := v_cast_count + 1;
  END LOOP;

  -- 최소 1건은 성공해야 함
  IF v_cast_count = 0 THEN
    RAISE EXCEPTION '유효한 투표가 없습니다. 투표 항목을 확인해주세요.';
  END IF;

  -- ============================================================
  -- [2] receipt_token 생성
  -- ============================================================
  v_receipt_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO vote_receipt_registry (
    union_id, assembly_id, poll_id, snapshot_id,
    receipt_token_hash, issued_at
  ) VALUES (
    p_union_id, p_assembly_id,
    (p_votes->0->>'poll_id')::uuid,  -- 대표 poll_id (첫 번째)
    p_snapshot_id,
    encode(sha256(v_receipt_token::bytea), 'hex'),
    now()
  ) ON CONFLICT (receipt_token_hash) DO NOTHING;

  -- ============================================================
  -- [3] 감사 로그
  -- ============================================================
  INSERT INTO assembly_audit_logs (
    assembly_id, union_id, event_type,
    actor_id, actor_role, target_type, target_id,
    event_data, current_hash
  ) VALUES (
    p_assembly_id, p_union_id, 'EVOTE_BALLOT_SUBMITTED',
    p_user_id, 'MEMBER', 'assembly', p_assembly_id::text,
    jsonb_build_object(
      'cast_count',  v_cast_count,
      'skip_count',  v_skip_count,
      'voting_method', 'ELECTRONIC',
      'has_auth_nonce', p_auth_nonce IS NOT NULL
    ),
    ''
  );

  -- ============================================================
  -- [4] 결과 반환
  -- ============================================================
  RETURN jsonb_build_object(
    'success',        true,
    'receipt_token',  v_receipt_token,
    'cast_count',     v_cast_count,
    'skip_count',     v_skip_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_evote_ballot(uuid, uuid, varchar, uuid, text, jsonb)
  TO authenticated;

COMMENT ON FUNCTION submit_evote_ballot IS
  'submit_evote_ballot RPC: 전자투표 일괄 투표 제출 — 여러 안건 투표를 단일 트랜잭션으로 원자적 처리';
