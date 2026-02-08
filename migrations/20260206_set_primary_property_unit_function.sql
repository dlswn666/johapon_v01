-- Migration: Create RPC function for atomic set_primary_property_unit
-- Purpose: TASK-S003 - Solve Race Condition in property unit primary assignment
-- Date: 2026-02-06
--
-- This function ensures that exactly one property unit per user can have is_primary=true
-- by performing the operation atomically within a single database transaction

CREATE OR REPLACE FUNCTION set_primary_property_unit(
    p_user_id UUID,
    p_property_unit_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. 해당 property_unit이 존재하고 사용자에게 속하는지 확인
    IF NOT EXISTS (
        SELECT 1 FROM user_property_units
        WHERE id = p_property_unit_id AND user_id = p_user_id
    ) THEN
        RETURN QUERY SELECT false::BOOLEAN, 'Property unit not found or does not belong to this user'::TEXT;
        RETURN;
    END IF;

    -- 2. 원자적 UPDATE (CASE 문 사용)
    -- 한 번의 UPDATE로 모든 물건지 처리
    -- is_primary = (id = p_property_unit_id) → 선택된 것만 true, 나머지는 false
    UPDATE user_property_units
    SET
        is_primary = (id = p_property_unit_id),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 3. 성공 반환
    RETURN QUERY SELECT true::BOOLEAN, NULL::TEXT;
END;
$$;

-- 함수 권한 설정 (authenticated 사용자와 anon 모두 가능하도록)
GRANT EXECUTE ON FUNCTION set_primary_property_unit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_primary_property_unit(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION set_primary_property_unit(UUID, UUID) TO service_role;

-- 함수 설명 추가
COMMENT ON FUNCTION set_primary_property_unit(UUID, UUID) IS
'Atomically sets a specific property unit as primary and others as non-primary for a user.
Prevents race conditions by using a single UPDATE statement with CASE logic.';
