-- 마이그레이션: admin_invites 테이블의 email 컬럼을 nullable로 변경
-- 날짜: 2024-12-15
-- 목적: 관리자 초대 시 이메일을 선택 사항으로 변경

-- email 컬럼을 nullable로 변경
ALTER TABLE admin_invites ALTER COLUMN email DROP NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN admin_invites.email IS '초대 대상자 이메일 (선택 사항)';

