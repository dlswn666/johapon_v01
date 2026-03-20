-- Migration 013: cast_vote RPC 재생성 (auth_nonce + receipt_token_hash)
-- 해소 갭: INFRA-01 (migration 007 placeholder 실적용), SEC-05 (Step-up 인증 nonce)

-- 1. auth_nonces 테이블 (60초 TTL, 1회용 투표 인증 토큰)
CREATE TABLE IF NOT EXISTS auth_nonces (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id      uuid        NOT NULL,
  assembly_id   uuid        NOT NULL REFERENCES assemblies(id),
  user_id       varchar     NOT NULL,  -- users.id (VARCHAR)
  nonce         text        NOT NULL UNIQUE,
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_nonces_nonce    ON auth_nonces(nonce) WHERE used_at IS NULL;
CREATE INDEX idx_auth_nonces_expires  ON auth_nonces(expires_at);
CREATE INDEX idx_auth_nonces_user     ON auth_nonces(user_id, assembly_id);

ALTER TABLE auth_nonces ENABLE ROW LEVEL SECURITY;

-- auth_nonces: 서버(service_role)만 INSERT/UPDATE. 직접 접근 차단.
CREATE POLICY "auth_nonces_no_direct_access"
  ON auth_nonces FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- 2. cast_vote RPC 재생성
CREATE OR REPLACE FUNCTION cast_vote(
  p_poll_id       uuid,
  p_assembly_id   uuid,
  p_union_id      uuid,
  p_user_id       varchar,
  p_snapshot_id   uuid,
  p_option_id     uuid,
  p_voting_weight numeric  DEFAULT 1,
  p_auth_nonce    text     DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_receipt_token   text;
  v_poll_status     text;
  v_already_voted   boolean;
  v_delegation_state text;
BEGIN
  -- [1] auth_nonce 검증 (PASS Step-up 인증, SR-002/SR-003)
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

  -- [2] 투표 상태 확인
  SELECT status INTO v_poll_status
    FROM polls
   WHERE id = p_poll_id AND assembly_id = p_assembly_id AND union_id = p_union_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '해당 투표를 찾을 수 없습니다.';
  END IF;

  IF v_poll_status != 'OPEN' THEN
    RAISE EXCEPTION '투표가 진행 중이 아닙니다. (현재 상태: %)', v_poll_status;
  END IF;

  -- [3] 중복 투표 방지
  SELECT EXISTS(
    SELECT 1 FROM participation_records
     WHERE assembly_id = p_assembly_id
       AND user_id     = p_user_id
       AND poll_id     = p_poll_id
       AND is_superseded = false
  ) INTO v_already_voted;

  IF v_already_voted THEN
    UPDATE participation_records
       SET is_superseded = true, superseded_at = now()
     WHERE assembly_id  = p_assembly_id
       AND user_id      = p_user_id
       AND poll_id      = p_poll_id
       AND is_superseded = false;

    UPDATE vote_ballots
       SET is_superseded = true, superseded_at = now()
     WHERE poll_id       = p_poll_id
       AND assembly_id   = p_assembly_id
       AND is_superseded = false;
  END IF;

  -- [4] 위임 상태 확인
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

  -- [5] participation_records INSERT
  INSERT INTO participation_records (
    assembly_id, union_id, user_id, snapshot_id, poll_id,
    voting_method, voted_at
  ) VALUES (
    p_assembly_id, p_union_id, p_user_id, p_snapshot_id, p_poll_id,
    'ELECTRONIC', now()
  );

  -- [6] vote_ballots INSERT
  INSERT INTO vote_ballots (
    assembly_id, union_id, poll_id, option_id,
    voting_method, voting_weight, submitted_at
  ) VALUES (
    p_assembly_id, p_union_id, p_poll_id, p_option_id,
    'ELECTRONIC', p_voting_weight, now()
  );

  -- [7] receipt_token 생성 및 registry INSERT
  v_receipt_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO vote_receipt_registry (
    union_id, assembly_id, poll_id, snapshot_id,
    receipt_token_hash, issued_at
  ) VALUES (
    p_union_id, p_assembly_id, p_poll_id, p_snapshot_id,
    encode(sha256(v_receipt_token::bytea), 'hex'),
    now()
  ) ON CONFLICT (receipt_token_hash) DO NOTHING;

  -- [8] 감사 로그
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
      'has_auth_nonce', p_auth_nonce IS NOT NULL
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
