-- Migration 036: submit_evote_ballot RPC
-- 전자투표 일괄 투표 제출 — 여러 안건에 대한 투표를 단일 트랜잭션으로 처리
-- 패턴 참조: cast_vote (026), vote_receipt_registry (034)

CREATE OR REPLACE FUNCTION submit_evote_ballot(
  p_assembly_id  uuid,
  p_union_id     uuid,
  p_user_id      varchar,
  p_snapshot_id  uuid,
  p_auth_nonce   text,
  p_votes        jsonb  -- [{"poll_id":"uuid","option_id":"uuid"}, ...]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_vote                       jsonb;
  v_poll_id                    uuid;
  v_option_id                  uuid;
  v_poll_status                text;
  v_allow_revision             boolean;
  v_already_voted              boolean;
  v_delegation_state           text;
  v_voting_weight              numeric;
  v_participation_group_id     uuid;
  v_ballot_internal_group_id   uuid;
  v_old_ballot_internal_group  uuid;
  v_receipt_token              text;
  v_cast_count                 int := 0;
  v_skip_count                 int := 0;
  v_skipped_polls              jsonb := '[]'::jsonb;
  v_now                        timestamptz := now();
BEGIN
  -- ============================================================
  -- [0] 입력 검증
  -- ============================================================
  IF p_auth_nonce IS NULL THEN
    RAISE EXCEPTION '본인인증이 필요합니다.';
  END IF;

  IF p_votes IS NULL OR jsonb_array_length(p_votes) = 0 THEN
    RAISE EXCEPTION '투표 데이터가 없습니다.';
  END IF;

  -- ============================================================
  -- [1] auth_nonce 검증 (1회, assembly 단위)
  -- ============================================================
  UPDATE auth_nonces
     SET used_at = v_now
   WHERE nonce        = p_auth_nonce
     AND user_id      = p_user_id
     AND assembly_id  = p_assembly_id
     AND used_at      IS NULL
     AND expires_at   > v_now;

  IF NOT FOUND THEN
    RAISE EXCEPTION '유효하지 않거나 만료된 인증 토큰입니다. 다시 인증해주세요.';
  END IF;

  -- ============================================================
  -- [2] 위임 상태 확인 (assembly 단위, 루프 밖에서 1회)
  -- ============================================================
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

  -- ============================================================
  -- [3] voting_weight 조회 (assembly_member_snapshots)
  -- ============================================================
  SELECT voting_weight INTO v_voting_weight
    FROM assembly_member_snapshots
   WHERE assembly_id = p_assembly_id
     AND union_id    = p_union_id
     AND user_id     = p_user_id
     AND is_active   = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION '총회 참여 대상자가 아닙니다. (스냅샷 미등록)';
  END IF;

  -- ============================================================
  -- [4] p_votes 배열 순회: 안건별 투표 처리
  -- ============================================================
  FOR v_vote IN SELECT * FROM jsonb_array_elements(p_votes)
  LOOP
    v_poll_id   := (v_vote->>'poll_id')::uuid;
    v_option_id := (v_vote->>'option_id')::uuid;

    -- 4-1. advisory lock (사용자+poll 경합 방지)
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id || v_poll_id::text));

    -- 4-2. poll 상태 확인 (OPEN만 허용)
    SELECT status, allow_vote_revision
      INTO v_poll_status, v_allow_revision
      FROM polls
     WHERE id = v_poll_id
       AND assembly_id = p_assembly_id
       AND union_id    = p_union_id
       FOR SHARE;

    IF NOT FOUND THEN
      -- poll을 찾을 수 없으면 skip
      v_skip_count := v_skip_count + 1;
      v_skipped_polls := v_skipped_polls || jsonb_build_object(
        'poll_id', v_poll_id, 'reason', 'POLL_NOT_FOUND'
      );
      CONTINUE;
    END IF;

    IF v_poll_status != 'OPEN' THEN
      v_skip_count := v_skip_count + 1;
      v_skipped_polls := v_skipped_polls || jsonb_build_object(
        'poll_id', v_poll_id, 'reason', 'POLL_NOT_OPEN', 'status', v_poll_status
      );
      CONTINUE;
    END IF;

    -- 4-3. 중복투표 확인
    SELECT EXISTS(
      SELECT 1 FROM participation_records
       WHERE assembly_id  = p_assembly_id
         AND user_id      = p_user_id
         AND poll_id      = v_poll_id
         AND is_superseded = false
    ) INTO v_already_voted;

    IF v_already_voted THEN
      IF NOT v_allow_revision THEN
        -- 수정 불허 → skip
        v_skip_count := v_skip_count + 1;
        v_skipped_polls := v_skipped_polls || jsonb_build_object(
          'poll_id', v_poll_id, 'reason', 'ALREADY_VOTED_NO_REVISION'
        );
        CONTINUE;
      END IF;

      -- 기존 ballot_internal_group_id 조회 (supersede 대상)
      SELECT ballot_internal_group_id INTO v_old_ballot_internal_group
        FROM vote_ballots
       WHERE poll_id      = v_poll_id
         AND assembly_id  = p_assembly_id
         AND is_superseded = false
         AND ballot_internal_group_id IS NOT NULL
       ORDER BY submitted_at DESC
       LIMIT 1;

      -- participation_records supersede
      UPDATE participation_records
         SET is_superseded = true, superseded_at = v_now
       WHERE assembly_id  = p_assembly_id
         AND user_id      = p_user_id
         AND poll_id      = v_poll_id
         AND is_superseded = false;

      -- vote_ballots supersede
      IF v_old_ballot_internal_group IS NOT NULL THEN
        UPDATE vote_ballots
           SET is_superseded = true, superseded_at = v_now
         WHERE poll_id                  = v_poll_id
           AND assembly_id              = p_assembly_id
           AND ballot_internal_group_id = v_old_ballot_internal_group
           AND is_superseded            = false;
      END IF;
    END IF;

    -- 4-4. 새 그룹 ID 생성 (비밀투표 보호: 서로 다른 UUID)
    v_participation_group_id   := gen_random_uuid();
    v_ballot_internal_group_id := gen_random_uuid();

    -- 4-5. participation_records INSERT (user_id 포함 — 누가 투표했는지)
    INSERT INTO participation_records (
      assembly_id, union_id, user_id, snapshot_id, poll_id,
      voting_method, first_voted_at, last_voted_at, ballot_group_id
    ) VALUES (
      p_assembly_id, p_union_id, p_user_id, p_snapshot_id, v_poll_id,
      'ELECTRONIC', v_now, v_now, v_participation_group_id
    );

    -- 4-6. vote_ballots INSERT (user_id 없음 — 무엇을 선택했는지만)
    INSERT INTO vote_ballots (
      assembly_id, union_id, poll_id, option_id,
      voting_method, voting_weight, submitted_at, ballot_internal_group_id
    ) VALUES (
      p_assembly_id, p_union_id, v_poll_id, v_option_id,
      'ELECTRONIC', v_voting_weight, v_now, v_ballot_internal_group_id
    );

    -- 4-7. vote_receipt_registry INSERT (안건별 영수증)
    INSERT INTO vote_receipt_registry (
      union_id, assembly_id, poll_id, snapshot_id,
      receipt_token_hash, issued_at
    ) VALUES (
      p_union_id, p_assembly_id, v_poll_id, p_snapshot_id,
      encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
      v_now
    ) ON CONFLICT (receipt_token_hash) DO NOTHING;

    v_cast_count := v_cast_count + 1;
  END LOOP;

  -- ============================================================
  -- [5] 전체 receipt_token 생성 (클라이언트 반환용)
  -- ============================================================
  v_receipt_token := encode(gen_random_bytes(24), 'hex');

  -- ============================================================
  -- [6] assembly_audit_logs INSERT
  -- ============================================================
  INSERT INTO assembly_audit_logs (
    assembly_id, union_id, event_type,
    actor_id, actor_role, target_type, target_id,
    event_data, current_hash
  ) VALUES (
    p_assembly_id, p_union_id, 'EVOTE_BALLOT_SUBMITTED',
    p_user_id, 'MEMBER', 'assembly', p_assembly_id::text,
    jsonb_build_object(
      'voting_method',  'ELECTRONIC',
      'cast_count',     v_cast_count,
      'skip_count',     v_skip_count,
      'has_auth_nonce',  true
    ),
    ''
  );

  -- ============================================================
  -- [7] 결과 반환
  -- ============================================================
  RETURN jsonb_build_object(
    'success',        true,
    'receipt_token',  v_receipt_token,
    'cast_count',     v_cast_count,
    'skip_count',     v_skip_count,
    'skipped_polls',  v_skipped_polls
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_evote_ballot(uuid, uuid, varchar, uuid, text, jsonb)
  TO authenticated;

COMMENT ON FUNCTION submit_evote_ballot IS
  'submit_evote_ballot RPC: 전자투표 일괄 제출 — 여러 안건을 단일 트랜잭션으로 처리 (PASS 인증 + 비밀투표 보호)';
