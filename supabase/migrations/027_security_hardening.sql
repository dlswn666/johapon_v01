-- Migration 027: 보안 강화
-- SEC-H3: tally_votes RPC 접근 제어 (관리자만)
-- SEC-H4: assembly_audit_logs WORM 강화 (UPDATE/DELETE 차단)
-- BIZ-C1: 시공자 선정 총회 출석 정족수 경고 함수

-- ============================================================
-- 1. assembly_audit_logs WORM 강화
--    현재: 해시 체인 트리거만 존재
--    추가: UPDATE/DELETE를 완전 차단하는 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'assembly_audit_logs는 수정/삭제할 수 없습니다 (WORM 정책).';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_no_update ON assembly_audit_logs;
CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON assembly_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON assembly_audit_logs;
CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON assembly_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

COMMENT ON FUNCTION prevent_audit_log_modification() IS
  'WORM 정책: assembly_audit_logs의 UPDATE/DELETE를 차단합니다.';

-- ============================================================
-- 2. tally_votes RPC 접근 제어 — 관리자만 호출 가능하도록 래퍼
--    기존 tally_votes는 GRANT authenticated로 되어 있어 일반 조합원도 호출 가능
-- ============================================================

-- 기존 함수에 대한 일반 사용자 접근 권한 제거
REVOKE EXECUTE ON FUNCTION tally_votes(uuid, varchar) FROM authenticated;

-- service_role에게만 권한 부여 (API 라우트에서 관리자 검증 후 service_role로 호출)
GRANT EXECUTE ON FUNCTION tally_votes(uuid, varchar) TO service_role;

-- ============================================================
-- 3. vote_ballots에 대한 RLS 강화
--    현재: RLS가 없거나 약할 수 있음
--    추가: 모든 직접 접근 차단 (RPC를 통해서만 접근)
-- ============================================================

-- vote_ballots: RLS 활성화 (이미 되어 있을 수 있음)
ALTER TABLE vote_ballots ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "vote_ballots_no_direct_read" ON vote_ballots;
DROP POLICY IF EXISTS "vote_ballots_no_direct_write" ON vote_ballots;

-- authenticated 사용자의 직접 SELECT 차단 (RPC 내에서는 SECURITY DEFINER로 우회)
CREATE POLICY "vote_ballots_no_direct_read"
  ON vote_ballots FOR SELECT
  TO authenticated
  USING (false);

-- authenticated 사용자의 직접 INSERT/UPDATE/DELETE 차단
CREATE POLICY "vote_ballots_no_direct_write"
  ON vote_ballots FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- service_role은 모든 접근 허용 (API 라우트 + RPC에서 사용)
CREATE POLICY "vote_ballots_service_role_all"
  ON vote_ballots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE vote_ballots IS
  '투표 내용 저장 — user_id 없음 (비밀투표). 직접 접근 불가, RPC 통해서만 접근.';
