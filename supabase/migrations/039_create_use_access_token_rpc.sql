-- 039_create_use_access_token_rpc.sql
-- 접근 토큰 사용 처리 (atomic: 사용량 체크 + 증가 + 로그 기록)

CREATE OR REPLACE FUNCTION use_access_token(
  p_token_id UUID,
  p_accessed_path TEXT,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS TABLE(success BOOLEAN, new_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_usage INTEGER;
  v_usage_count INTEGER;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Atomic check + increment (FOR UPDATE로 동시 접근 방지)
  SELECT max_usage, usage_count, expires_at
  INTO v_max_usage, v_usage_count, v_expires_at
  FROM access_tokens
  WHERE id = p_token_id AND deleted_at IS NULL
  FOR UPDATE;

  -- 토큰이 없는 경우
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- 만료 확인
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN QUERY SELECT FALSE, v_usage_count;
    RETURN;
  END IF;

  -- 최대 사용 횟수 초과 체크
  IF v_max_usage IS NOT NULL AND v_usage_count >= v_max_usage THEN
    RETURN QUERY SELECT FALSE, v_usage_count;
    RETURN;
  END IF;

  -- 사용 횟수 증가
  UPDATE access_tokens
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = p_token_id;

  -- 접근 로그 기록
  INSERT INTO access_token_logs (token_id, accessed_path, ip_address, user_agent)
  VALUES (p_token_id, p_accessed_path, p_ip_address, p_user_agent);

  RETURN QUERY SELECT TRUE, v_usage_count + 1;
END;
$$;
