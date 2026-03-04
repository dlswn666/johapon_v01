-- ============================================================
-- 조합원 충돌 해결 E2E 테스트 시드 데이터
-- 대상 조합: test-union (id: 42b9d4c7-e7b1-4769-bc61-82fbf576a941)
--
-- 사용법:
--   1) Supabase SQL Editor 또는 MCP execute_sql 로 실행
--   2) E2E 테스트 실행: npx playwright test member-conflict-resolution.spec.ts
--   3) 정리: 하단 CLEANUP 섹션 실행
--
-- 주의:
--   - buildings 테이블: id, building_name, building_type (union_id/address 없음)
--   - building_units 테이블: id, building_id, dong, ho
--   - users.id = VARCHAR, auth.uid() = UUID (다름)
--   - 각 시나리오는 별도 building_unit 사용 (시나리오 간 상태 간섭 방지)
-- ============================================================

-- ============================================================
-- 0. 공통 인프라: buildings + building_units
-- ============================================================

INSERT INTO buildings (id, building_name, building_type)
VALUES
  ('aaaabbbb-0001-0001-0001-000000000001'::uuid, 'E2E 테스트아파트', 'APARTMENT'),
  ('aaaabbbb-0001-0001-0001-000000000002'::uuid, 'E2E 테스트빌라',   'VILLA')
ON CONFLICT (id) DO NOTHING;

INSERT INTO building_units (id, building_id, dong, ho)
VALUES
  -- 시나리오 A용: PRE_REGISTERED 충돌 (building_unit 기반)
  ('ccccdddd-0001-0001-0001-000000000001'::uuid, 'aaaabbbb-0001-0001-0001-000000000001'::uuid, '101', '101'),
  -- 시나리오 C용: 소유권 이전
  ('ccccdddd-0001-0001-0001-000000000002'::uuid, 'aaaabbbb-0001-0001-0001-000000000001'::uuid, '101', '201'),
  -- 시나리오 D용: 공동소유 2인
  ('ccccdddd-0001-0001-0001-000000000003'::uuid, 'aaaabbbb-0001-0001-0001-000000000001'::uuid, '102', '101'),
  -- 시나리오 E용: 공동소유 3인
  ('ccccdddd-0001-0001-0001-000000000004'::uuid, 'aaaabbbb-0001-0001-0001-000000000001'::uuid, '102', '201'),
  -- 시나리오 F용: 가족/대리인
  ('ccccdddd-0001-0001-0001-000000000005'::uuid, 'aaaabbbb-0001-0001-0001-000000000002'::uuid, '1', '101'),
  -- 시나리오 G/H용: 차단/역할 (충돌 불필요)
  ('ccccdddd-0001-0001-0001-000000000006'::uuid, 'aaaabbbb-0001-0001-0001-000000000002'::uuid, '1', '201')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 1. [P1] 시나리오 A: PRE_REGISTERED 충돌 → 사전등록자 본인 처리
--    기존: PRE_REGISTERED 홍길동 (test_pre_hong_001)
--    신규: PENDING_APPROVAL 홍길동 (test_pending_hong_001)
--    충돌 조건: 동일 building_unit_id
-- ============================================================
INSERT INTO users (id, name, phone_number, union_id, user_status, role)
VALUES
  ('test_pre_hong_001', '홍길동', '010-1111-0001',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'PRE_REGISTERED', 'USER'),
  ('test_pending_hong_001', '홍길동', '010-1111-0002',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'PENDING_APPROVAL', 'USER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_property_units (id, user_id, building_unit_id, ownership_type,
  land_ownership_ratio, building_ownership_ratio, property_address_jibun)
VALUES
  (gen_random_uuid(), 'test_pre_hong_001',
   'ccccdddd-0001-0001-0001-000000000001'::uuid,
   'OWNER', 100, 100, '서울시 강북구 미아동 1234 101동 101호'),
  (gen_random_uuid(), 'test_pending_hong_001',
   'ccccdddd-0001-0001-0001-000000000001'::uuid,
   'OWNER', 100, 100, '서울시 강북구 미아동 1234 101동 101호');

-- ============================================================
-- 2. [P1] 시나리오 B: PRE_REGISTERED 충돌 → 별도 인물 처리 (PNU 기반)
--    기존: PRE_REGISTERED 김철수 (test_pre_kim_001)
--    신규: PENDING_APPROVAL 김철수 (test_pending_kim_001)
--    충돌 조건: 동일 pnu
-- ============================================================
INSERT INTO users (id, name, phone_number, union_id, user_status, role)
VALUES
  ('test_pre_kim_001', '김철수', '010-2222-0001',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'PRE_REGISTERED', 'USER'),
  ('test_pending_kim_001', '김철수', '010-2222-0002',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'PENDING_APPROVAL', 'USER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_property_units (id, user_id, pnu, ownership_type,
  land_ownership_ratio, building_ownership_ratio, property_address_jibun)
VALUES
  (gen_random_uuid(), 'test_pre_kim_001',
   '1165010900100010001',
   'OWNER', 100, 100, '서울시 강북구 미아동 90-1'),
  (gen_random_uuid(), 'test_pending_kim_001',
   '1165010900100010001',
   'OWNER', 100, 100, '서울시 강북구 미아동 90-1');

-- ============================================================
-- 3. [P1] 시나리오 C: 소유권 이전 (매매)
--    기존: APPROVED 이박사 (test_approved_lee_001) — 단독소유 100%
--    신규: PENDING_APPROVAL 이순신 (test_pending_lee_001)
--    충돌 조건: 동일 building_unit_id
-- ============================================================
INSERT INTO users (id, name, phone_number, union_id, user_status, role, approved_at)
VALUES
  ('test_approved_lee_001', '이박사', '010-3333-0001',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'APPROVED', 'USER', now()),
  ('test_pending_lee_001', '이순신', '010-3333-0002',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'PENDING_APPROVAL', 'USER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_property_units (id, user_id, building_unit_id, ownership_type,
  land_ownership_ratio, building_ownership_ratio, property_address_jibun)
VALUES
  (gen_random_uuid(), 'test_approved_lee_001',
   'ccccdddd-0001-0001-0001-000000000002'::uuid,
   'OWNER', 100, 100, '서울시 강북구 미아동 1234 101동 201호'),
  (gen_random_uuid(), 'test_pending_lee_001',
   'ccccdddd-0001-0001-0001-000000000002'::uuid,
   'OWNER', 100, 100, '서울시 강북구 미아동 1234 101동 201호');

-- ============================================================
-- 4. [P1] 시나리오 D: 공동소유자 추가 (2인, 50:50)
--    기존: APPROVED 김부부 (test_approved_couple_a) — 단독소유 100%
--    신규: PENDING_APPROVAL 이부부 (test_pending_couple_b)
--    충돌 조건: 동일 building_unit_id
-- ============================================================
INSERT INTO users (id, name, phone_number, union_id, user_status, role, approved_at)
VALUES
  ('test_approved_couple_a', '김부부', '010-4444-0001',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'APPROVED', 'USER', now()),
  ('test_pending_couple_b', '이부부', '010-4444-0002',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'PENDING_APPROVAL', 'USER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_property_units (id, user_id, building_unit_id, ownership_type,
  land_ownership_ratio, building_ownership_ratio, property_address_jibun)
VALUES
  (gen_random_uuid(), 'test_approved_couple_a',
   'ccccdddd-0001-0001-0001-000000000003'::uuid,
   'OWNER', 100, 100, '서울시 강북구 미아동 1234 102동 101호'),
  (gen_random_uuid(), 'test_pending_couple_b',
   'ccccdddd-0001-0001-0001-000000000003'::uuid,
   'OWNER', 100, 100, '서울시 강북구 미아동 1234 102동 101호');

-- ============================================================
-- 5. [P2] 시나리오 E: 공동소유 3인 (기존 공동소유자 있을 때)
--    기존 A: APPROVED 박공동A (test_co3_a) — CO_OWNER 40%
--    기존 B: APPROVED 박공동B (test_co3_b) — CO_OWNER 60%
--    신규 C: PENDING_APPROVAL 박공동C (test_co3_c)
--    충돌 조건: 동일 building_unit_id (신규가 기존A 또는 기존B와 충돌)
--    기대: otherCoOwners 조회 시 박공동B(60%) 표시됨
-- ============================================================
INSERT INTO users (id, name, phone_number, union_id, user_status, role, approved_at)
VALUES
  ('test_co3_a', '박공동A', '010-5555-0001',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'APPROVED', 'USER', now()),
  ('test_co3_b', '박공동B', '010-5555-0002',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'APPROVED', 'USER', now()),
  ('test_co3_c', '박공동C', '010-5555-0003',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'PENDING_APPROVAL', 'USER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_property_units (id, user_id, building_unit_id, ownership_type,
  land_ownership_ratio, building_ownership_ratio, property_address_jibun)
VALUES
  (gen_random_uuid(), 'test_co3_a',
   'ccccdddd-0001-0001-0001-000000000004'::uuid,
   'CO_OWNER', 40, 40, '서울시 강북구 미아동 1234 102동 201호'),
  (gen_random_uuid(), 'test_co3_b',
   'ccccdddd-0001-0001-0001-000000000004'::uuid,
   'CO_OWNER', 60, 60, '서울시 강북구 미아동 1234 102동 201호'),
  (gen_random_uuid(), 'test_co3_c',
   'ccccdddd-0001-0001-0001-000000000004'::uuid,
   'OWNER', 100, 100, '서울시 강북구 미아동 1234 102동 201호');

-- ============================================================
-- 6. [P2] 시나리오 F: 가족/대리인 등록
--    기존: APPROVED 최노인 (test_approved_choi_a) — 단독소유 100%
--    신규: PENDING_APPROVAL 최효자 (test_pending_choi_b)
--    충돌 조건: 동일 building_unit_id
-- ============================================================
INSERT INTO users (id, name, phone_number, union_id, user_status, role, approved_at)
VALUES
  ('test_approved_choi_a', '최노인', '010-6666-0001',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'APPROVED', 'USER', now()),
  ('test_pending_choi_b', '최효자', '010-6666-0002',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'PENDING_APPROVAL', 'USER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_property_units (id, user_id, building_unit_id, ownership_type,
  land_ownership_ratio, building_ownership_ratio, property_address_jibun)
VALUES
  (gen_random_uuid(), 'test_approved_choi_a',
   'ccccdddd-0001-0001-0001-000000000005'::uuid,
   'OWNER', 100, 100, '서울시 강북구 미아동 5678 1동 101호'),
  (gen_random_uuid(), 'test_pending_choi_b',
   'ccccdddd-0001-0001-0001-000000000005'::uuid,
   'OWNER', 100, 100, '서울시 강북구 미아동 5678 1동 101호');

-- ============================================================
-- 7. [P1] 시나리오 G: 차단/해제
--    대상: APPROVED 문제조합원 (test_approved_block_a)
--    충돌 불필요 — 차단/해제 플로우만 테스트
-- ============================================================
INSERT INTO users (id, name, phone_number, union_id, user_status, role, approved_at)
VALUES
  ('test_approved_block_a', '문제조합원', '010-7777-0001',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'APPROVED', 'USER', now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. [P2] 시나리오 H: 역할/임원 변경
--    대상: APPROVED USER 임원후보자 (test_approved_exec_a)
-- ============================================================
INSERT INTO users (id, name, phone_number, union_id, user_status, role, approved_at)
VALUES
  ('test_approved_exec_a', '임원후보자', '010-8888-0001',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'APPROVED', 'USER', now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. [P1] 보안 시나리오용 사용자 (H2/H3)
--    비관리자 API 호출 시도 대상
-- ============================================================
INSERT INTO users (id, name, phone_number, union_id, user_status, role, approved_at)
VALUES
  ('test_user_nonadmin', '일반조합원', '010-9999-0001',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'APPROVED', 'USER', now()),
  ('test_pending_target', '승인대상자', '010-9999-0002',
   '42b9d4c7-e7b1-4769-bc61-82fbf576a941'::uuid, 'PENDING_APPROVAL', 'USER')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CLEANUP: 테스트 후 정리 (테스트 완료 후 수동 실행)
-- ============================================================
-- DELETE FROM property_ownership_history
--   WHERE from_user_id LIKE 'test_%' OR to_user_id LIKE 'test_%';
-- DELETE FROM user_relationships
--   WHERE user_id LIKE 'test_%' OR related_user_id LIKE 'test_%';
-- DELETE FROM user_property_units WHERE user_id LIKE 'test_%';
-- DELETE FROM users WHERE id LIKE 'test_%';
-- DELETE FROM building_units WHERE id::text LIKE 'ccccdddd%';
-- DELETE FROM buildings WHERE id::text LIKE 'aaaabbbb%';
