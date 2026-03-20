-- Migration 033: 전자투표 스키마 통합 보완
-- 6명 전문가(비즈니스×2, 아키텍처×2, DB×2) 토론 결과 반영
-- 기존 028~032 마이그레이션의 누락/보안/성능 이슈 일괄 해결

-- ============================================================
-- 1. assemblies 테이블 보완
-- ============================================================

-- 1-1. 총회 기본 정족수 유형 (biz-expert-a: QuorumType 기본값 컬럼 누락)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS quorum_type VARCHAR(30)
  DEFAULT 'GENERAL'
  CHECK (quorum_type IN ('GENERAL', 'SPECIAL', 'SPECIAL_TWO_THIRDS', 'CONTRACTOR'));
COMMENT ON COLUMN assemblies.quorum_type IS '총회 기본 정족수 유형: GENERAL(10%)/SPECIAL(20%)/SPECIAL_TWO_THIRDS(2/3)/CONTRACTOR(과반)';

-- 1-2. 봉인 시각 (db-expert-a: closed_at 누락)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
COMMENT ON COLUMN assemblies.closed_at IS '투표 마감 봉인 시각 (VOTING_CLOSED→CLOSED 전이 시점)';

-- 1-3. 실제 통지 발송 완료 시각 (biz-expert-b: 14일 기산점 명확화)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS notice_actually_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN assemblies.notice_actually_sent_at IS '소집통지 실제 발송 완료 시각 (14일 기산점, announcement_date와 별개)';

-- 1-4. assembly_type에 DELEGATE(대의원회) 추가 (biz-expert-a)
-- 기존 CHECK 제약 드롭 후 재생성
DO $$
BEGIN
  ALTER TABLE assemblies DROP CONSTRAINT IF EXISTS assemblies_assembly_type_check;
  ALTER TABLE assemblies ADD CONSTRAINT assemblies_assembly_type_check
    CHECK (assembly_type IN ('REGULAR', 'EXTRAORDINARY', 'ONLINE_ONLY', 'DELEGATE'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 1-5. 날짜 순서 CHECK 강화 (db-expert-a)
ALTER TABLE assemblies DROP CONSTRAINT IF EXISTS chk_prevote_date_order;
ALTER TABLE assemblies ADD CONSTRAINT chk_prevote_date_order
  CHECK (
    (announcement_date IS NULL OR pre_vote_start_date IS NULL OR announcement_date <= pre_vote_start_date) AND
    (pre_vote_start_date IS NULL OR pre_vote_end_date IS NULL OR pre_vote_start_date < pre_vote_end_date)
  );

-- ============================================================
-- 2. agenda_items 테이블 보완
-- ============================================================

-- 2-1. 투표 유형 (db-expert-a: polls JOIN 없이 안건 수준 조회 가능)
ALTER TABLE agenda_items ADD COLUMN IF NOT EXISTS vote_type VARCHAR(20)
  CHECK (vote_type IN ('APPROVE', 'ELECT', 'SELECT'));
COMMENT ON COLUMN agenda_items.vote_type IS '투표 유형: APPROVE(찬반)/ELECT(선출)/SELECT(시공사). polls.vote_type과 동기화';

-- 2-2. 정족수 오버라이드 (biz-expert-a)
ALTER TABLE agenda_items ADD COLUMN IF NOT EXISTS quorum_type_override VARCHAR(30)
  CHECK (quorum_type_override IN ('GENERAL', 'SPECIAL', 'SPECIAL_TWO_THIRDS', 'CONTRACTOR'));
COMMENT ON COLUMN agenda_items.quorum_type_override IS '안건별 정족수 유형 오버라이드 (NULL이면 총회 기본 설정 따름)';

-- 2-3. 개표 결과 판정 (biz-expert-a, db-expert-a)
ALTER TABLE agenda_items ADD COLUMN IF NOT EXISTS decision_result VARCHAR(10)
  CHECK (decision_result IN ('PASSED', 'REJECTED', 'VOID'));
ALTER TABLE agenda_items ADD COLUMN IF NOT EXISTS decision_note TEXT;
COMMENT ON COLUMN agenda_items.decision_result IS '의결 결과: PASSED(가결)/REJECTED(부결)/VOID(유찰)';
COMMENT ON COLUMN agenda_items.decision_note IS '관리자 메모 (동률 처리 사유 등)';

-- ============================================================
-- 3. polls 테이블 보완
-- ============================================================

-- 3-1. elect_count 무결성 CHECK (db-expert-a)
DO $$
BEGIN
  ALTER TABLE polls ADD CONSTRAINT chk_elect_count
    CHECK (
      (vote_type = 'APPROVE' AND elect_count IS NULL) OR
      (vote_type IN ('ELECT', 'SELECT') AND elect_count IS NOT NULL AND elect_count > 0)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3-2. 인덱스 개선: 단독 vote_type → 복합 (db-expert-a)
DROP INDEX IF EXISTS idx_polls_vote_type;
CREATE INDEX IF NOT EXISTS idx_polls_assembly_vote_type ON polls(assembly_id, vote_type);

-- ============================================================
-- 4. assembly_documents 테이블 신규 (arch-expert-a, db-expert-a)
-- 총회 레벨 문서 (공고문, 소집장, 의결서 등)
-- ============================================================

CREATE TABLE IF NOT EXISTS assembly_documents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id     UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  union_id        UUID NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  original_file_name VARCHAR(255),
  file_url        TEXT NOT NULL,
  file_type       VARCHAR(20),
  file_size        INT,
  doc_category    VARCHAR(50) DEFAULT 'ETC'
    CHECK (doc_category IN ('CONVOCATION_NOTICE', 'MINUTES', 'RESULT', 'ETC')),
  uploaded_by     VARCHAR NOT NULL,
  uploaded_at     TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assembly_documents_assembly ON assembly_documents(assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_documents_union ON assembly_documents(union_id);

ALTER TABLE assembly_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_assembly_documents"
  ON assembly_documents FOR ALL
  TO authenticated
  USING (
    get_user_role_in_union(assembly_documents.union_id) IN ('ADMIN', 'SUPER_ADMIN')
    OR is_system_admin()
  );

CREATE POLICY "member_read_assembly_documents"
  ON assembly_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assembly_member_snapshots ams
      JOIN user_auth_links ual ON ual.user_id = ams.user_id
      WHERE ual.auth_user_id = auth.uid()
        AND ams.assembly_id = assembly_documents.assembly_id
        AND ams.union_id = assembly_documents.union_id
    )
  );

COMMENT ON TABLE assembly_documents IS '총회 레벨 문서 (공고문, 소집장, 의결서 등). agenda_documents(안건별)와 별개';

-- ============================================================
-- 5. proxy_registrations 법정 관계 컬럼 (biz-expert-b)
-- 시행령 제42조: 대리인은 배우자/직계존비속/형제자매로 제한
-- ============================================================

ALTER TABLE proxy_registrations
  ADD COLUMN IF NOT EXISTS relation VARCHAR(30)
    CHECK (relation IN ('SPOUSE', 'LINEAL_ASCENDANT', 'LINEAL_DESCENDANT', 'SIBLING')),
  ADD COLUMN IF NOT EXISTS relation_document_url TEXT,
  ADD COLUMN IF NOT EXISTS relation_verified_by VARCHAR,
  ADD COLUMN IF NOT EXISTS relation_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN proxy_registrations.relation IS '대리인 법정 자격: SPOUSE(배우자)/LINEAL_ASCENDANT(직계존속)/LINEAL_DESCENDANT(직계비속)/SIBLING(형제자매)';
COMMENT ON COLUMN proxy_registrations.relation_document_url IS '위임장·가족관계증명서 스캔본 Storage URL';

-- ============================================================
-- 6. audit_logs 해시 체인 순서 보장 (biz-expert-b)
-- ============================================================

ALTER TABLE assembly_audit_logs
  ADD COLUMN IF NOT EXISTS seq BIGINT GENERATED ALWAYS AS IDENTITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_seq
  ON assembly_audit_logs(assembly_id, union_id, seq);

COMMENT ON COLUMN assembly_audit_logs.seq IS '해시 체인 순서 보장용 시퀀스 (created_at 대신 seq DESC로 prev_hash 조회)';

-- ============================================================
-- 7. notification_logs 보안 수정 (db-expert-a)
-- ============================================================

-- 7-1. RLS INSERT 정책: authenticated → service_role 전용
DROP POLICY IF EXISTS "service_role_insert_notification_logs" ON notification_logs;
CREATE POLICY "service_role_only_insert_notification_logs"
  ON notification_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 7-2. 복합 인덱스 추가 (db-expert-a)
CREATE INDEX IF NOT EXISTS idx_notification_logs_union_assembly
  ON notification_logs(union_id, assembly_id);

-- ============================================================
-- 8. 성능 인덱스 추가 (db-expert-b)
-- ============================================================

-- 8-1. vote_ballots 집계 최적화 (P0)
CREATE INDEX IF NOT EXISTS idx_vote_ballots_tally
  ON vote_ballots(poll_id, assembly_id)
  WHERE is_superseded = false;

-- 8-2. participation_records 중복 방지 + 검색 (P0)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_participation_active
  ON participation_records(assembly_id, user_id, poll_id)
  WHERE is_superseded = false;

-- 8-3. proxy_registrations 위임 상태 조회 (P1)
CREATE INDEX IF NOT EXISTS idx_proxy_reg_delegator
  ON proxy_registrations(assembly_id, delegator_id)
  WHERE status IN ('pending', 'confirmed');

-- 8-4. assembly_member_snapshots 스냅샷 조회 (P2)
CREATE INDEX IF NOT EXISTS idx_ams_union_assembly
  ON assembly_member_snapshots(union_id, assembly_id);

-- 8-5. vote_tally_results 집계 결과 조회 (P2)
CREATE INDEX IF NOT EXISTS idx_vote_tally_poll
  ON vote_tally_results(poll_id);
