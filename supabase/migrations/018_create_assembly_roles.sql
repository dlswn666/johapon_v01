-- Migration 018: assembly_roles 테이블 + 겸직 금지 트리거
-- 해소 갭: INFRA-08
-- SR-001: 동일 총회 내 핵심 역할(조합장/선관위원장/감사) 겸직 DB 레벨 강제

CREATE TABLE IF NOT EXISTS assembly_roles (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id  uuid        NOT NULL REFERENCES assemblies(id),
  union_id     uuid        NOT NULL,
  user_id      varchar     NOT NULL,
  role         text        NOT NULL CHECK (
    role IN (
      'UNION_PRESIDENT',
      'ELECTION_CHAIR',
      'AUDITOR',
      'OBSERVER_REP',
      'ONSITE_OPERATOR'
    )
  ),
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  assigned_by  varchar     NOT NULL,
  revoked_at   timestamptz,

  UNIQUE (assembly_id, user_id, role)
);

CREATE INDEX idx_assembly_roles_assembly ON assembly_roles(assembly_id, union_id);
CREATE INDEX idx_assembly_roles_user     ON assembly_roles(user_id);
CREATE INDEX idx_assembly_roles_active   ON assembly_roles(assembly_id, role)
  WHERE revoked_at IS NULL;

-- 겸직 금지 트리거: UNION_PRESIDENT / ELECTION_CHAIR / AUDITOR 간 겸직 불가 (SR-001)
CREATE OR REPLACE FUNCTION check_assembly_role_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_conflict_count integer;
  CORE_ROLES CONSTANT text[] := ARRAY['UNION_PRESIDENT', 'ELECTION_CHAIR', 'AUDITOR'];
BEGIN
  IF NEW.role = ANY(CORE_ROLES) THEN
    SELECT COUNT(*) INTO v_conflict_count
      FROM assembly_roles
     WHERE assembly_id = NEW.assembly_id
       AND user_id     = NEW.user_id
       AND role        = ANY(CORE_ROLES)
       AND revoked_at  IS NULL
       AND id          IS DISTINCT FROM NEW.id;

    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION
        'SR-001 위반: 핵심 역할 겸직 금지 — 동일 조합원이 조합장/선관위원장/감사를 겸직할 수 없습니다. (user_id: %, 요청 역할: %)',
        NEW.user_id, NEW.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assembly_role_conflict ON assembly_roles;
CREATE TRIGGER trg_assembly_role_conflict
  BEFORE INSERT OR UPDATE ON assembly_roles
  FOR EACH ROW
  EXECUTE FUNCTION check_assembly_role_conflict();

ALTER TABLE assembly_roles ENABLE ROW LEVEL SECURITY;

-- 관리자 SELECT
CREATE POLICY "assembly_roles_admin_select"
  ON assembly_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM user_auth_links ual
        JOIN users u ON u.id = ual.user_id
       WHERE ual.auth_user_id = auth.uid()
         AND u.union_id       = assembly_roles.union_id
         AND u.role IN ('ADMIN', 'SYSTEM_ADMIN')
    )
  );

-- 관리자 INSERT (역할 배정)
CREATE POLICY "assembly_roles_admin_insert"
  ON assembly_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM user_auth_links ual
        JOIN users u ON u.id = ual.user_id
       WHERE ual.auth_user_id = auth.uid()
         AND u.union_id       = assembly_roles.union_id
         AND u.role IN ('ADMIN', 'SYSTEM_ADMIN')
    )
  );

-- 관리자 UPDATE (역할 해제: revoked_at 설정)
CREATE POLICY "assembly_roles_admin_update"
  ON assembly_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM user_auth_links ual
        JOIN users u ON u.id = ual.user_id
       WHERE ual.auth_user_id = auth.uid()
         AND u.union_id       = assembly_roles.union_id
         AND u.role IN ('ADMIN', 'SYSTEM_ADMIN')
    )
  );

COMMENT ON TABLE assembly_roles IS
  '총회별 역할 배정 테이블. 핵심 역할(조합장/선관위원장/감사) 겸직 금지를 DB 트리거로 강제.';
