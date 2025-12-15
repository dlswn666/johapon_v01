-- ============================================================
-- Multi-Tenant Alimtalk System Migration
-- 조합별 카카오 알림톡 발송 시스템 스키마 확장
-- ============================================================

-- 1. Vault 확장 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ============================================================
-- 2. unions 테이블에 알림톡 관련 컬럼 추가
-- ============================================================
ALTER TABLE unions
ADD COLUMN IF NOT EXISTS kakao_channel_id VARCHAR(100) DEFAULT '조합온',
ADD COLUMN IF NOT EXISTS vault_sender_key_id UUID;

COMMENT ON COLUMN unions.kakao_channel_id IS '카카오 채널 ID (예: @조합온)';
COMMENT ON COLUMN unions.vault_sender_key_id IS 'Vault에 저장된 Sender Key의 secret UUID 참조';

-- ============================================================
-- 3. alimtalk_templates 테이블 생성 (템플릿 관리)
-- ============================================================
CREATE TABLE IF NOT EXISTS alimtalk_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(50) NOT NULL UNIQUE,
    template_name VARCHAR(100) NOT NULL,
    template_content TEXT,
    status VARCHAR(10),
    insp_status VARCHAR(10),
    buttons JSONB,
    synced_at TIMESTAMPTZ
);

COMMENT ON TABLE alimtalk_templates IS '알리고 알림톡 템플릿 정보 (동기화)';
COMMENT ON COLUMN alimtalk_templates.template_code IS '알리고 템플릿 코드 (예: P000004)';
COMMENT ON COLUMN alimtalk_templates.template_name IS '템플릿 이름';
COMMENT ON COLUMN alimtalk_templates.template_content IS '템플릿 내용';
COMMENT ON COLUMN alimtalk_templates.status IS '알리고 상태 (S: 중단, A: 정상, R: 대기)';
COMMENT ON COLUMN alimtalk_templates.insp_status IS '승인상태 (REG, REQ, APR, REJ)';
COMMENT ON COLUMN alimtalk_templates.buttons IS '버튼 정보 (JSON)';
COMMENT ON COLUMN alimtalk_templates.synced_at IS '마지막 알리고 동기화 시간';

-- ============================================================
-- 4. alimtalk_pricing 테이블 생성 (단가 관리)
-- ============================================================
CREATE TABLE IF NOT EXISTS alimtalk_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_type VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE alimtalk_pricing IS '알림톡 발송 단가 관리';
COMMENT ON COLUMN alimtalk_pricing.message_type IS '메시지 유형 (KAKAO, SMS, LMS)';
COMMENT ON COLUMN alimtalk_pricing.unit_price IS '건당 단가 (원)';
COMMENT ON COLUMN alimtalk_pricing.effective_from IS '적용 시작일';

-- 기본 단가 데이터 삽입
INSERT INTO alimtalk_pricing (message_type, unit_price, effective_from)
VALUES 
    ('KAKAO', 15.00, '2024-01-01 00:00:00+09'),
    ('SMS', 20.00, '2024-01-01 00:00:00+09'),
    ('LMS', 50.00, '2024-01-01 00:00:00+09')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. alimtalk_logs 테이블 확장
-- ============================================================
ALTER TABLE alimtalk_logs
ADD COLUMN IF NOT EXISTS union_id UUID REFERENCES unions(id),
ADD COLUMN IF NOT EXISTS template_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS template_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS sender_channel_name VARCHAR(100) DEFAULT '조합온',
ADD COLUMN IF NOT EXISTS kakao_success_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_success_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS recipient_details JSONB,
ADD COLUMN IF NOT EXISTS aligo_response JSONB;

COMMENT ON COLUMN alimtalk_logs.union_id IS '발송 조합 ID';
COMMENT ON COLUMN alimtalk_logs.template_code IS '사용된 템플릿 코드';
COMMENT ON COLUMN alimtalk_logs.template_name IS '템플릿 이름 (발송 시점 기록)';
COMMENT ON COLUMN alimtalk_logs.sender_channel_name IS '발송에 사용된 채널명';
COMMENT ON COLUMN alimtalk_logs.kakao_success_count IS '카카오톡 발송 성공 건수';
COMMENT ON COLUMN alimtalk_logs.sms_success_count IS '대체 문자 발송 건수';
COMMENT ON COLUMN alimtalk_logs.estimated_cost IS '예상 비용 (원)';
COMMENT ON COLUMN alimtalk_logs.recipient_details IS '수신자 상세 정보 (JSON)';
COMMENT ON COLUMN alimtalk_logs.aligo_response IS '알리고 API 응답 원본 (JSON)';

-- ============================================================
-- 6. Sender Key 등록 함수 (RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION register_union_sender_key(
    p_union_id UUID,
    p_sender_key TEXT,
    p_channel_name TEXT
) RETURNS UUID AS $$
DECLARE
    v_secret_id UUID;
    v_old_secret_id UUID;
BEGIN
    -- 기존 Sender Key 확인
    SELECT vault_sender_key_id INTO v_old_secret_id
    FROM unions
    WHERE id = p_union_id;
    
    -- 기존 secret이 있으면 삭제
    IF v_old_secret_id IS NOT NULL THEN
        -- Vault에서 기존 secret 삭제는 별도 처리 필요
        -- (Vault API 제한으로 직접 삭제 어려울 수 있음)
        NULL;
    END IF;
    
    -- Vault에 Sender Key 저장
    SELECT vault.create_secret(
        p_sender_key,
        'union_' || p_union_id::TEXT || '_sender_key',
        p_channel_name || ' 알림톡 Sender Key'
    ) INTO v_secret_id;
    
    -- unions 테이블 업데이트
    UPDATE unions
    SET
        vault_sender_key_id = v_secret_id,
        kakao_channel_id = p_channel_name,
        updated_at = now()
    WHERE id = p_union_id;
    
    RETURN v_secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_union_sender_key IS '조합별 Sender Key를 Vault에 저장하고 unions 테이블 업데이트';

-- ============================================================
-- 7. 현재 단가 조회 함수 (RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_pricing()
RETURNS TABLE (
    message_type VARCHAR(20),
    unit_price DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (p.message_type)
        p.message_type,
        p.unit_price
    FROM alimtalk_pricing p
    WHERE p.effective_from <= now()
    ORDER BY p.message_type, p.effective_from DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_current_pricing IS '현재 적용 중인 발송 단가 조회';

-- ============================================================
-- 8. RLS 정책 설정
-- ============================================================
-- NOTE: RLS 정책은 1.0 버전 테스트 완료 후 활성화 예정
-- 테스트 환경에서 RLS가 활성화되면 테스트가 어려울 수 있음

/*
-- alimtalk_templates RLS
ALTER TABLE alimtalk_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alimtalk_templates_select_all" ON alimtalk_templates
    FOR SELECT USING (true);

CREATE POLICY "alimtalk_templates_insert_admin" ON alimtalk_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'SYSTEM_ADMIN'
        )
    );

CREATE POLICY "alimtalk_templates_update_admin" ON alimtalk_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'SYSTEM_ADMIN'
        )
    );

CREATE POLICY "alimtalk_templates_delete_admin" ON alimtalk_templates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'SYSTEM_ADMIN'
        )
    );

-- alimtalk_pricing RLS
ALTER TABLE alimtalk_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alimtalk_pricing_select_all" ON alimtalk_pricing
    FOR SELECT USING (true);

CREATE POLICY "alimtalk_pricing_insert_admin" ON alimtalk_pricing
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'SYSTEM_ADMIN'
        )
    );

CREATE POLICY "alimtalk_pricing_update_admin" ON alimtalk_pricing
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'SYSTEM_ADMIN'
        )
    );

-- alimtalk_logs RLS 정책 추가 (조합별 필터링)
-- 기존 RLS 정책이 있을 수 있으므로 DROP 후 재생성
DROP POLICY IF EXISTS "alimtalk_logs_select_union" ON alimtalk_logs;
DROP POLICY IF EXISTS "alimtalk_logs_select_admin" ON alimtalk_logs;

CREATE POLICY "alimtalk_logs_select_union" ON alimtalk_logs
    FOR SELECT USING (
        -- 조합 관리자는 자기 조합 로그만 조회 가능
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'ADMIN'
            AND users.union_id = alimtalk_logs.union_id
        )
    );

CREATE POLICY "alimtalk_logs_select_admin" ON alimtalk_logs
    FOR SELECT USING (
        -- 시스템 관리자는 모든 로그 조회 가능
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'SYSTEM_ADMIN'
        )
    );
*/

-- ============================================================
-- 9. 인덱스 생성
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_union_id ON alimtalk_logs(union_id);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_sent_at ON alimtalk_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_template_code ON alimtalk_logs(template_code);
CREATE INDEX IF NOT EXISTS idx_alimtalk_pricing_effective ON alimtalk_pricing(message_type, effective_from DESC);

