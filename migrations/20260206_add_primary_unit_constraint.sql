-- Migration: Add UNIQUE constraint for primary property units
-- Purpose: TASK-S003 - Prevent Race Condition in set_primary_property_unit
-- Date: 2026-02-06

-- 1. 기존 데이터 검증 (선택사항 - 문제 없으면 스킵)
-- 이 쿼리가 결과를 반환하면 데이터 정제 필요
SELECT user_id, COUNT(*) as primary_count
FROM user_property_units
WHERE is_primary = true
GROUP BY user_id
HAVING COUNT(*) > 1;
-- ↑ 이 쿼리 결과가 0이면 데이터 정상

-- 2. 유니크 제약 추가 (is_primary=true인 경우만 제약)
-- Partial unique index로 null값 처리
ALTER TABLE user_property_units
ADD CONSTRAINT one_primary_per_user
UNIQUE (user_id) WHERE is_primary = true;

-- 3. 조회 성능 향상 인덱스
CREATE INDEX IF NOT EXISTS idx_user_property_units_primary
ON user_property_units(user_id, is_primary)
WHERE is_primary = true;

-- 4. RLS 정책 유지 (기존 정책이 있다면)
-- 추가 정책 불필요
