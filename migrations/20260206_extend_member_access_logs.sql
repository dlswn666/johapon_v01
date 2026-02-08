-- Migration: Extend member_access_logs for TASK-S002 and TASK-S004
-- Purpose: Support batch operations, duration tracking, and audit logging
-- Date: 2026-02-06

-- 1. 새 컬럼 추가
ALTER TABLE member_access_logs
ADD COLUMN IF NOT EXISTS batch_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS duration_ms INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS request_size INTEGER DEFAULT NULL;

-- 2. 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_member_access_logs_batch_id
ON member_access_logs(batch_id);

CREATE INDEX IF NOT EXISTS idx_member_access_logs_action
ON member_access_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_access_logs_status
ON member_access_logs(status, created_at DESC);

-- 3. 코멘트: 새 액션 타입 (documentation only)
COMMENT ON TABLE member_access_logs IS
'Audit log for member access and operations.
New action types:
- BULK_INVITE_START: 대량 초대 시작
- BULK_INVITE_COMPLETE: 대량 초대 완료 (전체 성공)
- BULK_INVITE_PARTIAL_FAILURE: 대량 초대 부분 실패
- BULK_INVITE_FAILED: 대량 초대 완전 실패
- APPROVE_MEMBER: 멤버 승인
- REJECT_MEMBER: 멤버 반려
- CANCEL_REJECTION: 반려 취소
- BLOCK_MEMBER: 멤버 차단
- SET_PRIMARY_UNIT: 대표 물건지 변경
- DELETE_PROPERTY_UNIT: 물건지 삭제';

COMMENT ON COLUMN member_access_logs.batch_id IS
'배치 ID (같은 대량 작업의 관련 로그들을 묶기 위한 UUID)';

COMMENT ON COLUMN member_access_logs.duration_ms IS
'작업 소요 시간 (밀리초)';

COMMENT ON COLUMN member_access_logs.request_size IS
'요청 데이터 크기 (바이트)';
