-- Phase 5 Migration 006: 결과 공개 테이블
-- Workstream D: 결과 공개 시스템
-- CRITICAL: published_by는 VARCHAR (users.id, NOT uuid)

CREATE TABLE IF NOT EXISTS assembly_result_publications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id          uuid NOT NULL,
  assembly_id       uuid NOT NULL,
  published_by      varchar NOT NULL,
  published_at      timestamptz NOT NULL DEFAULT now(),
  result_json       jsonb NOT NULL,
  result_hash       text NOT NULL,
  source_tally_hash text NOT NULL
);

ALTER TABLE assembly_result_publications ENABLE ROW LEVEL SECURITY;

-- 총회당 1건 (중복 공개 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_result_publications_assembly
  ON assembly_result_publications(assembly_id, union_id);

-- RLS: 조합원이면 조회 가능
CREATE POLICY "member_read_result_publications"
  ON assembly_result_publications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_auth_links ual
      JOIN users u ON ual.user_id = u.id
      WHERE ual.auth_user_id = auth.uid()
        AND u.union_id = assembly_result_publications.union_id
    )
  );

-- INSERT: ADMIN만
CREATE POLICY "admin_insert_result_publications"
  ON assembly_result_publications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_auth_links ual
      JOIN users u ON ual.user_id = u.id
      WHERE ual.auth_user_id = auth.uid()
        AND u.union_id = assembly_result_publications.union_id
        AND u.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
