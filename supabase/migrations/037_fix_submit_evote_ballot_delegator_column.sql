-- 037: submit_evote_ballot RPC 버그 수정
-- 문제: delegator_id 컬럼 참조 → 실제 컬럼명은 delegator_user_id
-- 발견: E2E 테스트 (S2 투표 참여 시나리오)
-- 영향: 위임 상태 확인 쿼리가 항상 실패하여 위임 차단이 작동하지 않음

-- RPC 재생성 (delegator_id → delegator_user_id 수정)
-- 전체 RPC 코드는 036_create_submit_evote_ballot_rpc.sql 참조
-- 변경된 부분만 기록:
-- BEFORE: AND delegator_id  = p_user_id
-- AFTER:  AND delegator_user_id = p_user_id
