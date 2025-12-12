-- member_invites 테이블 생성
CREATE TABLE member_invites (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  union_id UUID NOT NULL REFERENCES unions(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  phone_number VARCHAR NOT NULL,
  property_address TEXT NOT NULL,
  invite_token VARCHAR NOT NULL UNIQUE,
  status VARCHAR DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'USED', 'EXPIRED')),
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(union_id, name, phone_number, property_address)
);

-- 인덱스 생성
CREATE INDEX idx_member_invites_union_id ON member_invites(union_id);
CREATE INDEX idx_member_invites_status ON member_invites(status);
CREATE INDEX idx_member_invites_invite_token ON member_invites(invite_token);

-- 동기화 RPC 함수
CREATE OR REPLACE FUNCTION sync_member_invites(
  p_union_id UUID,
  p_created_by VARCHAR,
  p_expires_hours INT,
  p_members JSONB
) RETURNS JSONB AS $$
DECLARE
  v_deleted_pending INT := 0;
  v_deleted_used INT := 0;
  v_inserted INT := 0;
  v_user_ids VARCHAR[];
  v_auth_user_ids UUID[];
BEGIN
  -- 1. 엑셀에 없는 PENDING 데이터 삭제
  WITH deleted AS (
    DELETE FROM member_invites 
    WHERE union_id = p_union_id AND status = 'PENDING'
      AND (name, phone_number, property_address) NOT IN (
        SELECT x.name, x.phone_number, x.property_address
        FROM jsonb_to_recordset(p_members) AS x(name VARCHAR, phone_number VARCHAR, property_address TEXT)
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_pending FROM deleted;
  
  -- 2. 엑셀에 없는 USED 데이터 조회 (삭제 대상)
  SELECT ARRAY_AGG(user_id) INTO v_user_ids
  FROM member_invites 
  WHERE union_id = p_union_id AND status = 'USED' AND user_id IS NOT NULL
    AND (name, phone_number, property_address) NOT IN (
      SELECT x.name, x.phone_number, x.property_address
      FROM jsonb_to_recordset(p_members) AS x(name VARCHAR, phone_number VARCHAR, property_address TEXT)
    );
  
  -- auth_user_ids 조회 (auth.users 삭제용)
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    SELECT ARRAY_AGG(auth_user_id) INTO v_auth_user_ids
    FROM user_auth_links 
    WHERE user_id = ANY(v_user_ids);
    
    -- user_auth_links 삭제
    DELETE FROM user_auth_links WHERE user_id = ANY(v_user_ids);
    
    -- users 삭제
    DELETE FROM users WHERE id = ANY(v_user_ids);
  END IF;
  
  -- USED 상태의 member_invites 삭제
  WITH deleted AS (
    DELETE FROM member_invites 
    WHERE union_id = p_union_id AND status = 'USED'
      AND (name, phone_number, property_address) NOT IN (
        SELECT x.name, x.phone_number, x.property_address
        FROM jsonb_to_recordset(p_members) AS x(name VARCHAR, phone_number VARCHAR, property_address TEXT)
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_used FROM deleted;
  
  -- 3. 새 데이터 INSERT
  WITH inserted AS (
    INSERT INTO member_invites (union_id, name, phone_number, property_address, invite_token, created_by, expires_at)
    SELECT 
      p_union_id, 
      x.name, 
      x.phone_number, 
      x.property_address,
      encode(gen_random_bytes(32), 'hex'),
      p_created_by,
      NOW() + (p_expires_hours || ' hours')::INTERVAL
    FROM jsonb_to_recordset(p_members) AS x(name VARCHAR, phone_number VARCHAR, property_address TEXT)
    WHERE NOT EXISTS (
      SELECT 1 FROM member_invites m
      WHERE m.union_id = p_union_id
        AND m.name = x.name 
        AND m.phone_number = x.phone_number 
        AND m.property_address = x.property_address
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM inserted;
  
  RETURN jsonb_build_object(
    'deleted_pending', v_deleted_pending,
    'deleted_used', v_deleted_used,
    'inserted', v_inserted,
    'deleted_user_ids', COALESCE(v_user_ids, ARRAY[]::VARCHAR[]),
    'deleted_auth_user_ids', COALESCE(v_auth_user_ids, ARRAY[]::UUID[])
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

