-- ============================================================
-- 완전한 마이그레이션 스크립트
-- 기존 프로젝트: bhudsxvvvahfixvxhxiz (미국)
-- 새 프로젝트: bpdjashtxqrcgxfequgf (Asia-Pacific)
-- 생성일: 2025-12-15
-- ============================================================

-- ============================================================
-- PART 1: 확장 기능 활성화
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ============================================================
-- PART 2: 테이블 생성 (DDL)
-- ============================================================

-- 2.1 unions 테이블
CREATE TABLE IF NOT EXISTS public.unions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    phone TEXT,
    address TEXT,
    email TEXT,
    business_hours TEXT,
    logo_url TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    kakao_channel_id VARCHAR(100) DEFAULT '조합온',
    vault_sender_key_id UUID
);

COMMENT ON COLUMN public.unions.phone IS '전화번호';
COMMENT ON COLUMN public.unions.address IS '주소';
COMMENT ON COLUMN public.unions.email IS '이메일';
COMMENT ON COLUMN public.unions.business_hours IS '운영시간 (예: 평일 09:00~18:00, 주말 휴무)';
COMMENT ON COLUMN public.unions.logo_url IS '조합 로고 이미지 URL';
COMMENT ON COLUMN public.unions.description IS '조합 소개';
COMMENT ON COLUMN public.unions.is_active IS '조합 활성화 여부 (비활성화 시 홈페이지 접근 차단)';
COMMENT ON COLUMN public.unions.kakao_channel_id IS '카카오 채널 ID (예: @조합온)';
COMMENT ON COLUMN public.unions.vault_sender_key_id IS 'Vault에 저장된 Sender Key의 secret UUID 참조';

-- 2.2 users 테이블
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE,
    phone_number VARCHAR,
    role VARCHAR NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    union_id UUID REFERENCES public.unions(id) ON DELETE SET NULL,
    user_status VARCHAR DEFAULT 'PENDING_PROFILE',
    birth_date DATE,
    property_address TEXT,
    property_address_detail TEXT,
    rejected_reason TEXT,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT users_role_check CHECK (role IN ('SYSTEM_ADMIN', 'ADMIN', 'USER', 'APPLICANT')),
    CONSTRAINT users_status_check CHECK (user_status IN ('PENDING_PROFILE', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'))
);

COMMENT ON COLUMN public.users.user_status IS '사용자 상태: PENDING_PROFILE(프로필 미입력), PENDING_APPROVAL(승인 대기), APPROVED(승인됨), REJECTED(거부됨)';
COMMENT ON COLUMN public.users.birth_date IS '생년월일';
COMMENT ON COLUMN public.users.property_address IS '물건지(권리소재지) 주소';
COMMENT ON COLUMN public.users.property_address_detail IS '물건지 상세주소';
COMMENT ON COLUMN public.users.rejected_reason IS '승인 거부 사유';
COMMENT ON COLUMN public.users.approved_at IS '승인 일시';
COMMENT ON COLUMN public.users.rejected_at IS '거부 일시';
COMMENT ON COLUMN public.users.updated_at IS '수정 일시';

-- 2.3 notices 테이블
CREATE TABLE IF NOT EXISTS public.notices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR NOT NULL REFERENCES public.users(id),
    is_popup BOOLEAN NOT NULL DEFAULT false,
    end_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    union_id UUID REFERENCES public.unions(id) ON DELETE CASCADE
);

-- 2.4 hero_slides 테이블
CREATE TABLE IF NOT EXISTS public.hero_slides (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    union_id UUID NOT NULL REFERENCES public.unions(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    link_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.hero_slides IS 'Hero Section 슬라이드 이미지 관리';
COMMENT ON COLUMN public.hero_slides.image_url IS 'Storage에 저장된 이미지 URL';
COMMENT ON COLUMN public.hero_slides.link_url IS '클릭 시 이동할 URL (nullable)';
COMMENT ON COLUMN public.hero_slides.display_order IS '표시 순서 (낮을수록 먼저, 동일 시 created_at DESC)';
COMMENT ON COLUMN public.hero_slides.is_active IS '활성화 여부';

-- 2.5 files 테이블
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    size BIGINT NOT NULL,
    type TEXT NOT NULL,
    bucket_id TEXT NOT NULL,
    union_id UUID REFERENCES public.unions(id) ON DELETE SET NULL,
    uploader_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    attachable_type VARCHAR,
    attachable_id BIGINT
);

-- 2.6 comments 테이블
CREATE TABLE IF NOT EXISTS public.comments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id BIGINT NOT NULL,
    parent_id BIGINT REFERENCES public.comments(id) ON DELETE CASCADE,
    author_id VARCHAR NOT NULL REFERENCES public.users(id),
    content TEXT NOT NULL,
    union_id UUID REFERENCES public.unions(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.7 questions 테이블
CREATE TABLE IF NOT EXISTS public.questions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR NOT NULL REFERENCES public.users(id),
    union_id UUID REFERENCES public.unions(id),
    is_secret BOOLEAN DEFAULT false,
    answer_content TEXT,
    answer_author_id VARCHAR REFERENCES public.users(id),
    answered_at TIMESTAMPTZ,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.8 free_boards 테이블
CREATE TABLE IF NOT EXISTS public.free_boards (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR NOT NULL REFERENCES public.users(id),
    union_id UUID REFERENCES public.unions(id),
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.free_boards IS '자유 게시판';
COMMENT ON COLUMN public.free_boards.views IS '조회수';

-- 2.9 union_info 테이블
CREATE TABLE IF NOT EXISTS public.union_info (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR NOT NULL REFERENCES public.users(id),
    union_id UUID REFERENCES public.unions(id),
    thumbnail_url TEXT,
    has_attachments BOOLEAN NOT NULL DEFAULT false,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.union_info IS '조합 정보 공유 게시판';
COMMENT ON COLUMN public.union_info.thumbnail_url IS '리스트 썸네일 이미지 URL';
COMMENT ON COLUMN public.union_info.has_attachments IS '첨부파일 존재 여부 (files 테이블에서 attachable_type=union_info로 조회)';
COMMENT ON COLUMN public.union_info.views IS '조회수';

-- 2.10 user_auth_links 테이블
CREATE TABLE IF NOT EXISTS public.user_auth_links (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_auth_links_provider_check CHECK (provider IN ('kakao', 'naver', 'email'))
);

COMMENT ON TABLE public.user_auth_links IS '소셜 계정(auth.users)과 애플리케이션 사용자(public.users) 연결 테이블';
COMMENT ON COLUMN public.user_auth_links.user_id IS 'public.users 테이블의 ID';
COMMENT ON COLUMN public.user_auth_links.auth_user_id IS 'auth.users 테이블의 UUID';
COMMENT ON COLUMN public.user_auth_links.provider IS '소셜 로그인 제공자 (kakao, naver)';

-- 2.11 admin_invites 테이블
CREATE TABLE IF NOT EXISTS public.admin_invites (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    union_id UUID NOT NULL REFERENCES public.unions(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    phone_number VARCHAR NOT NULL,
    email VARCHAR,
    invite_token VARCHAR NOT NULL UNIQUE,
    status VARCHAR DEFAULT 'PENDING',
    created_by VARCHAR NOT NULL REFERENCES public.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT admin_invites_status_check CHECK (status IN ('PENDING', 'USED', 'EXPIRED'))
);

COMMENT ON COLUMN public.admin_invites.email IS '초대 대상자 이메일 (선택 사항)';

-- 2.12 member_invites 테이블
CREATE TABLE IF NOT EXISTS public.member_invites (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    union_id UUID NOT NULL REFERENCES public.unions(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    phone_number VARCHAR NOT NULL,
    property_address TEXT NOT NULL,
    invite_token VARCHAR NOT NULL UNIQUE,
    status VARCHAR DEFAULT 'PENDING',
    user_id VARCHAR REFERENCES public.users(id) ON DELETE SET NULL,
    created_by VARCHAR NOT NULL REFERENCES public.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT member_invites_status_check CHECK (status IN ('PENDING', 'USED', 'EXPIRED')),
    UNIQUE(union_id, name, phone_number, property_address)
);

-- 2.13 alimtalk_logs 테이블
CREATE TABLE IF NOT EXISTS public.alimtalk_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    notice_id BIGINT REFERENCES public.notices(id),
    sender_id VARCHAR NOT NULL REFERENCES public.users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    cost_per_msg DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    union_id UUID REFERENCES public.unions(id),
    template_code VARCHAR(50),
    template_name VARCHAR(100),
    sender_channel_name VARCHAR(100) DEFAULT '조합온',
    kakao_success_count INTEGER DEFAULT 0,
    sms_success_count INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10, 2) DEFAULT 0,
    recipient_details JSONB,
    aligo_response JSONB
);

COMMENT ON COLUMN public.alimtalk_logs.union_id IS '발송 조합 ID';
COMMENT ON COLUMN public.alimtalk_logs.template_code IS '사용된 템플릿 코드';
COMMENT ON COLUMN public.alimtalk_logs.template_name IS '템플릿 이름 (발송 시점 기록)';
COMMENT ON COLUMN public.alimtalk_logs.sender_channel_name IS '발송에 사용된 채널명';
COMMENT ON COLUMN public.alimtalk_logs.kakao_success_count IS '카카오톡 발송 성공 건수';
COMMENT ON COLUMN public.alimtalk_logs.sms_success_count IS '대체 문자 발송 건수';
COMMENT ON COLUMN public.alimtalk_logs.estimated_cost IS '예상 비용 (원)';
COMMENT ON COLUMN public.alimtalk_logs.recipient_details IS '수신자 상세 정보 (JSON)';
COMMENT ON COLUMN public.alimtalk_logs.aligo_response IS '알리고 API 응답 원본 (JSON)';

-- 2.14 alimtalk_templates 테이블
CREATE TABLE IF NOT EXISTS public.alimtalk_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(50) NOT NULL UNIQUE,
    template_name VARCHAR(100) NOT NULL,
    template_content TEXT,
    status VARCHAR(10),
    insp_status VARCHAR(10),
    buttons JSONB,
    synced_at TIMESTAMPTZ
);

COMMENT ON TABLE public.alimtalk_templates IS '알리고 알림톡 템플릿 정보 (동기화)';
COMMENT ON COLUMN public.alimtalk_templates.template_code IS '알리고 템플릿 코드 (예: P000004)';
COMMENT ON COLUMN public.alimtalk_templates.template_name IS '템플릿 이름';
COMMENT ON COLUMN public.alimtalk_templates.template_content IS '템플릿 내용';
COMMENT ON COLUMN public.alimtalk_templates.status IS '알리고 상태 (S: 중단, A: 정상, R: 대기)';
COMMENT ON COLUMN public.alimtalk_templates.insp_status IS '승인상태 (REG, REQ, APR, REJ)';
COMMENT ON COLUMN public.alimtalk_templates.buttons IS '버튼 정보 (JSON)';
COMMENT ON COLUMN public.alimtalk_templates.synced_at IS '마지막 알리고 동기화 시간';

-- 2.15 alimtalk_pricing 테이블
CREATE TABLE IF NOT EXISTS public.alimtalk_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_type VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.alimtalk_pricing IS '알림톡 발송 단가 관리';
COMMENT ON COLUMN public.alimtalk_pricing.message_type IS '메시지 유형 (KAKAO, SMS, LMS)';
COMMENT ON COLUMN public.alimtalk_pricing.unit_price IS '건당 단가 (원)';
COMMENT ON COLUMN public.alimtalk_pricing.effective_from IS '적용 시작일';

-- ============================================================
-- PART 3: 인덱스 생성
-- ============================================================

-- hero_slides 인덱스
CREATE INDEX IF NOT EXISTS idx_hero_slides_union_id ON public.hero_slides(union_id);
CREATE INDEX IF NOT EXISTS idx_hero_slides_order ON public.hero_slides(union_id, display_order, created_at DESC);

-- free_boards 인덱스
CREATE INDEX IF NOT EXISTS idx_free_boards_union_id ON public.free_boards(union_id);
CREATE INDEX IF NOT EXISTS idx_free_boards_author_id ON public.free_boards(author_id);
CREATE INDEX IF NOT EXISTS idx_free_boards_created_at ON public.free_boards(created_at DESC);

-- union_info 인덱스
CREATE INDEX IF NOT EXISTS idx_union_info_union_id ON public.union_info(union_id);
CREATE INDEX IF NOT EXISTS idx_union_info_author_id ON public.union_info(author_id);
CREATE INDEX IF NOT EXISTS idx_union_info_created_at ON public.union_info(created_at DESC);

-- user_auth_links 인덱스
CREATE INDEX IF NOT EXISTS idx_user_auth_links_user_id ON public.user_auth_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_links_auth_user_id ON public.user_auth_links(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_links_provider ON public.user_auth_links(provider);

-- users 인덱스
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_user_status ON public.users(user_status);
CREATE INDEX IF NOT EXISTS idx_users_property_address ON public.users(property_address);

-- member_invites 인덱스
CREATE INDEX IF NOT EXISTS idx_member_invites_union_id ON public.member_invites(union_id);
CREATE INDEX IF NOT EXISTS idx_member_invites_status ON public.member_invites(status);
CREATE INDEX IF NOT EXISTS idx_member_invites_invite_token ON public.member_invites(invite_token);

-- alimtalk 인덱스
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_union_id ON public.alimtalk_logs(union_id);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_sent_at ON public.alimtalk_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_template_code ON public.alimtalk_logs(template_code);
CREATE INDEX IF NOT EXISTS idx_alimtalk_pricing_effective ON public.alimtalk_pricing(message_type, effective_from DESC);

-- ============================================================
-- PART 4: 함수 생성
-- ============================================================

-- 4.1 조회수 증가 함수들
CREATE OR REPLACE FUNCTION public.increment_notice_views(notice_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE notices
    SET views = views + 1
    WHERE id = notice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_free_board_views(free_board_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.free_boards
    SET views = views + 1
    WHERE id = free_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_union_info_views(p_union_info_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.union_info
    SET views = views + 1
    WHERE id = p_union_info_id;
END;
$$ LANGUAGE plpgsql;

-- 4.2 updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_hero_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_free_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.3 현재 단가 조회 함수
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

-- 4.4 Sender Key 등록 함수
CREATE OR REPLACE FUNCTION register_union_sender_key(
    p_union_id UUID,
    p_sender_key TEXT,
    p_channel_name TEXT
) RETURNS UUID AS $$
DECLARE
    v_secret_id UUID;
    v_old_secret_id UUID;
BEGIN
    SELECT vault_sender_key_id INTO v_old_secret_id
    FROM unions
    WHERE id = p_union_id;
    
    IF v_old_secret_id IS NOT NULL THEN
        NULL;
    END IF;
    
    SELECT vault.create_secret(
        p_sender_key,
        'union_' || p_union_id::TEXT || '_sender_key',
        p_channel_name || ' 알림톡 Sender Key'
    ) INTO v_secret_id;
    
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

-- 4.5 member_invites 동기화 함수
CREATE OR REPLACE FUNCTION sync_member_invites(
  p_union_id UUID,
  p_created_by VARCHAR,
  p_expires_hours INT,
  p_members JSONB
) RETURNS JSONB AS $$
DECLARE
  v_deleted_pending INT := 0;
  v_deleted_used INT := 0;
  v_inserted INT := 0;
  v_user_ids VARCHAR[];
BEGIN
  DELETE FROM member_invites 
  WHERE union_id = p_union_id AND status = 'PENDING'
    AND (name, phone_number, property_address) NOT IN (
      SELECT x.name, x.phone_number, x.property_address
      FROM jsonb_to_recordset(p_members) AS x(name VARCHAR, phone_number VARCHAR, property_address TEXT)
    );
  GET DIAGNOSTICS v_deleted_pending = ROW_COUNT;
  
  SELECT ARRAY_AGG(user_id) INTO v_user_ids
  FROM member_invites 
  WHERE union_id = p_union_id AND status = 'USED' AND user_id IS NOT NULL
    AND (name, phone_number, property_address) NOT IN (
      SELECT x.name, x.phone_number, x.property_address
      FROM jsonb_to_recordset(p_members) AS x(name VARCHAR, phone_number VARCHAR, property_address TEXT)
    );
  
  DELETE FROM user_auth_links WHERE user_id = ANY(v_user_ids);
  DELETE FROM users WHERE id = ANY(v_user_ids);
  
  DELETE FROM member_invites 
  WHERE union_id = p_union_id AND status = 'USED'
    AND (name, phone_number, property_address) NOT IN (
      SELECT x.name, x.phone_number, x.property_address
      FROM jsonb_to_recordset(p_members) AS x(name VARCHAR, phone_number VARCHAR, property_address TEXT)
    );
  GET DIAGNOSTICS v_deleted_used = ROW_COUNT;
  
  INSERT INTO member_invites (union_id, name, phone_number, property_address, invite_token, created_by, expires_at)
  SELECT 
    p_union_id, x.name, x.phone_number, x.property_address,
    encode(gen_random_bytes(32), 'hex'),
    p_created_by,
    NOW() + (p_expires_hours || ' hours')::INTERVAL
  FROM jsonb_to_recordset(p_members) AS x(name VARCHAR, phone_number VARCHAR, property_address TEXT)
  WHERE NOT EXISTS (
    SELECT 1 FROM member_invites m
    WHERE m.union_id = p_union_id
      AND m.name = x.name AND m.phone_number = x.phone_number AND m.property_address = x.property_address
  );
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'deleted_pending', v_deleted_pending,
    'deleted_used', v_deleted_used,
    'inserted', v_inserted,
    'deleted_user_ids', v_user_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 5: 트리거 생성
-- ============================================================

DROP TRIGGER IF EXISTS trigger_hero_slides_updated_at ON hero_slides;
CREATE TRIGGER trigger_hero_slides_updated_at
    BEFORE UPDATE ON hero_slides
    FOR EACH ROW
    EXECUTE FUNCTION update_hero_slides_updated_at();

DROP TRIGGER IF EXISTS trigger_free_boards_updated_at ON public.free_boards;
CREATE TRIGGER trigger_free_boards_updated_at
    BEFORE UPDATE ON public.free_boards
    FOR EACH ROW
    EXECUTE FUNCTION update_free_boards_updated_at();

-- ============================================================
-- PART 6: Storage Bucket 생성
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PART 7: 데이터 삽입 (INSERT)
-- ============================================================

-- 7.1 unions 데이터
INSERT INTO public.unions (id, name, slug, created_at, updated_at, phone, address, email, business_hours, logo_url, description, is_active, kakao_channel_id, vault_sender_key_id)
VALUES
    ('7c35ee21-34fc-4597-84db-ee63e5b0d351', '삼양동 재개발', 'solsam', '2025-11-27 12:22:35.994075+00', '2025-11-27 12:22:35.994075+00', NULL, NULL, NULL, NULL, NULL, NULL, true, '조합온', NULL),
    ('20cc4f6d-3a60-4cb5-9409-44d9b66ae65b', '미아동 재개발', 'mia', '2025-11-27 13:52:04.433193+00', '2025-12-04 08:45:45.066+00', NULL, NULL, NULL, NULL, NULL, NULL, false, '조합온', NULL),
    ('abcae52c-986c-4a33-b5ba-ca8907f9f211', '미아 2구역', 'mia2', '2025-12-01 23:57:49.566324+00', '2025-12-01 23:57:49.566324+00', NULL, NULL, NULL, NULL, NULL, NULL, true, '조합온', NULL),
    ('42b9d4c7-e7b1-4769-bc61-82fbf576a941', '테스트 재개발 조합', 'test-union', '2025-12-01 23:57:55.493104+00', '2025-12-12 09:54:17.949+00', '010-000-0000', 'test1', 'test@example.com', '평일 오전 9시 ~ 평일 오후 6기', NULL, 'test', true, '조합온', NULL)
ON CONFLICT (id) DO NOTHING;

-- 7.2 users 데이터
INSERT INTO public.users (id, name, email, phone_number, role, created_at, union_id, user_status, birth_date, property_address, property_address_detail, rejected_reason, approved_at, rejected_at, updated_at)
VALUES
    ('systemAdmin', '시스템 관리자', 'system@example.com', '010-0000-0000', 'SYSTEM_ADMIN', '2025-11-26 06:23:03.194821+00', NULL, 'PENDING_PROFILE', NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-12 05:44:35.508957+00'),
    ('admin', '관리자', 'admin@example.com', '010-1111-1111', 'ADMIN', '2025-11-26 06:23:03.194821+00', NULL, 'PENDING_PROFILE', NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-12 05:44:35.508957+00'),
    ('user', '일반 사용자', 'user@example.com', '010-3504-8164', 'USER', '2025-11-26 06:23:03.194821+00', NULL, 'PENDING_PROFILE', NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-12 05:44:35.508957+00'),
    ('b513ab6e-3f62-4edc-a17d-933f46294996', '시스템관리자', 'injostar@naver.com', '010-3504-8164', 'SYSTEM_ADMIN', '2025-12-12 08:02:18.502294+00', NULL, 'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-12 08:02:18.502294+00')
ON CONFLICT (id) DO NOTHING;

-- 7.3 notices 데이터 (IDENTITY 컬럼이므로 OVERRIDING SYSTEM VALUE 사용)
INSERT INTO public.notices (id, title, content, author_id, is_popup, end_date, views, created_at, updated_at, union_id, start_date)
OVERRIDING SYSTEM VALUE
VALUES
    (1, '서비스 점검 안내', '2025년 11월 30일 새벽 2시부터 4시까지 서비스 점검이 진행됩니다.', 'systemAdmin', true, '2025-11-30 23:59:59+00', 875, '2025-11-26 06:23:11.021346+00', '2025-11-28 14:47:21.809126+00', NULL, NULL),
    (2, '신규 기능 업데이트', '새로운 알림톡 기능이 추가되었습니다.', 'admin', false, NULL, 853, '2025-11-26 06:23:11.021346+00', '2025-11-30 12:13:49.774276+00', NULL, NULL),
    (11, '미아 2구역 조합 설립 인가 공고', '미아 2구역 조합 설립이 인가되었습니다. 자세한 내용은 첨부파일을 확인해주세요.', 'systemAdmin', false, NULL, 158, '2025-12-02 00:00:44.045721+00', '2025-12-05 10:52:38.258196+00', 'abcae52c-986c-4a33-b5ba-ca8907f9f211', NULL),
    (12, '테스트 조합 공지사항입니다.', '이것은 테스트 조합의 공지사항 내용입니다.', 'systemAdmin', false, NULL, 10, '2025-12-02 00:00:50.802612+00', '2025-12-02 00:00:50.802612+00', '42b9d4c7-e7b1-4769-bc61-82fbf576a941', NULL),
    (15, '테스트 재개발 조합', '123', 'systemAdmin', false, NULL, 0, '2025-12-02 01:49:50.960403+00', '2025-12-02 01:49:50.960403+00', '42b9d4c7-e7b1-4769-bc61-82fbf576a941', NULL),
    (18, 'Test Title 1234', '<p>Test Content 1234</p>', 'systemAdmin', false, NULL, 1, '2025-12-02 07:55:01.661761+00', '2025-12-02 07:55:29.28268+00', '42b9d4c7-e7b1-4769-bc61-82fbf576a941', NULL),
    (21, 'AlimTalk Test Notice', '<p>Testing AlimTalk integration.</p>', 'systemAdmin', false, NULL, 2, '2025-12-04 01:38:04.288637+00', '2025-12-04 01:38:53.392478+00', '42b9d4c7-e7b1-4769-bc61-82fbf576a941', NULL),
    (29, 'test', '<p>test</p>', 'systemAdmin', true, NULL, 25, '2025-12-04 03:32:07.365478+00', '2025-12-09 22:37:55.291225+00', 'abcae52c-986c-4a33-b5ba-ca8907f9f211', NULL)
ON CONFLICT (id) DO NOTHING;

-- notices 시퀀스 재설정
SELECT setval('notices_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM notices), false);

-- 7.4 hero_slides 데이터
-- ⚠️ 주의: image_url에 있는 기존 프로젝트 URL을 새 프로젝트 URL로 변경해야 합니다
INSERT INTO public.hero_slides (id, union_id, image_url, link_url, display_order, is_active, created_at, updated_at)
VALUES
    ('3bee3f74-1253-4ac3-bc03-cb28344747c2', 'abcae52c-986c-4a33-b5ba-ca8907f9f211', 'https://bpdjashtxqrcgxfequgf.supabase.co/storage/v1/object/public/files/unions/mia2/hero-slides/1765277691742.png', NULL, 2, true, '2025-12-09 10:54:55.303298+00', '2025-12-09 10:54:55.303298+00'),
    ('5183b88f-e73d-407d-9330-6c1afd3e437f', 'abcae52c-986c-4a33-b5ba-ca8907f9f211', 'https://bpdjashtxqrcgxfequgf.supabase.co/storage/v1/object/public/files/unions/mia2/hero-slides/1765277997705.png', NULL, 1, true, '2025-12-09 11:00:01.204892+00', '2025-12-09 11:00:01.204892+00')
ON CONFLICT (id) DO NOTHING;

-- 7.5 files 데이터
INSERT INTO public.files (id, name, path, size, type, bucket_id, union_id, uploader_id, created_at, updated_at, attachable_type, attachable_id)
VALUES
    ('7282599a-f497-49d0-8028-584f5f638436', '재개발.png', 'unions/mia2/notices/17/1764661155273_70086.png', 1340512, 'image/png', 'files', NULL, 'systemAdmin', '2025-12-02 07:39:21.208367+00', '2025-12-02 07:39:21.208367+00', NULL, NULL),
    ('c2cd7da7-a8bc-42ed-8624-e051e6f7caee', 'test.txt', 'unions/mia2/notices/29/1764819124682_90875.txt', 0, 'text/plain', 'files', NULL, 'systemAdmin', '2025-12-04 03:32:07.923477+00', '2025-12-04 03:32:07.923477+00', 'notice', 29)
ON CONFLICT (id) DO NOTHING;

-- 7.6 comments 데이터
INSERT INTO public.comments (id, entity_type, entity_id, parent_id, author_id, content, union_id, created_at, updated_at)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 'notice', 29, NULL, 'systemAdmin', '테스트 댓글 - 수정됨! (수정 기능 테스트 완료)', 'abcae52c-986c-4a33-b5ba-ca8907f9f211', '2025-12-04 05:32:06.301868+00', '2025-12-04 05:33:18.132+00'),
    (5, 'notice', 11, NULL, 'systemAdmin', 'ㄴㄹㄷㅇ', 'abcae52c-986c-4a33-b5ba-ca8907f9f211', '2025-12-05 10:51:58.227449+00', '2025-12-05 10:51:58.227449+00')
ON CONFLICT (id) DO NOTHING;

-- comments 시퀀스 재설정
SELECT setval('comments_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM comments), false);

-- 7.7 questions 데이터
INSERT INTO public.questions (id, title, content, author_id, union_id, is_secret, answer_content, answer_author_id, answered_at, views, created_at, updated_at)
OVERRIDING SYSTEM VALUE
VALUES
    (2, '테스트 질문입니다', '<p>테스트 질문 내용입니다.</p>', 'systemAdmin', '42b9d4c7-e7b1-4769-bc61-82fbf576a941', false, '<p>안녕하세요. 테스트 답변입니다. 문의 감사합니다.</p>', 'systemAdmin', '2025-12-05 12:02:44.006+00', 2, '2025-12-05 12:01:37.563407+00', '2025-12-05 12:01:37.563407+00')
ON CONFLICT (id) DO NOTHING;

-- questions 시퀀스 재설정
SELECT setval('questions_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM questions), false);

-- 7.8 free_boards 데이터
INSERT INTO public.free_boards (id, title, content, author_id, union_id, views, created_at, updated_at)
OVERRIDING SYSTEM VALUE
VALUES
    (1, '테스트 게시글 - 자유 게시판 첫 글입니다', '<p>안녕하세요! 자유 게시판 테스트 글입니다. 자유롭게 의견을 나눠주세요.</p>', 'systemAdmin', 'abcae52c-986c-4a33-b5ba-ca8907f9f211', 5, '2025-12-08 08:28:42.394024+00', '2025-12-09 11:35:49.565433+00')
ON CONFLICT (id) DO NOTHING;

-- free_boards 시퀀스 재설정
SELECT setval('free_boards_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM free_boards), false);

-- 7.9 alimtalk_logs 데이터
INSERT INTO public.alimtalk_logs (id, notice_id, sender_id, title, content, recipient_count, success_count, fail_count, cost_per_msg, sent_at, union_id, template_code, template_name, sender_channel_name, kakao_success_count, sms_success_count, estimated_cost, recipient_details, aligo_response)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 'systemAdmin', '서비스 점검 안내', '2025년 11월 30일 새벽 2시부터 4시까지 서비스 점검이 진행됩니다.', 1000, 995, 5, 15.00, '2025-11-26 06:23:25.112047+00', NULL, NULL, NULL, '조합온', 0, 0, 0.00, NULL, NULL),
    (2, 2, 'admin', '신규 기능 업데이트', '새로운 알림톡 기능이 추가되었습니다.', 500, 498, 2, 15.00, '2025-11-26 06:23:25.112047+00', NULL, NULL, NULL, '조합온', 0, 0, 0.00, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- alimtalk_logs 시퀀스 재설정
SELECT setval('alimtalk_logs_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM alimtalk_logs), false);

-- 7.10 alimtalk_pricing 데이터
INSERT INTO public.alimtalk_pricing (id, message_type, unit_price, effective_from, created_at)
VALUES
    ('9992b0d5-2c2d-4944-9dad-f03d0f0c87d8', 'KAKAO', 15.00, '2023-12-31 15:00:00+00', '2025-12-15 03:27:16.974526+00'),
    ('ae9aecbd-28b0-4ff7-90a9-41cad944a4ab', 'SMS', 20.00, '2023-12-31 15:00:00+00', '2025-12-15 03:27:16.974526+00'),
    ('2b6871b7-7da4-46f3-8f69-8bc2eea91477', 'LMS', 50.00, '2023-12-31 15:00:00+00', '2025-12-15 03:27:16.974526+00')
ON CONFLICT (id) DO NOTHING;

-- 7.11 admin_invites 데이터
INSERT INTO public.admin_invites (id, union_id, name, phone_number, email, invite_token, status, created_by, expires_at, used_at, created_at)
VALUES
    ('e08ed7d6-daa8-4172-bd82-9ef5eb9686a1', '42b9d4c7-e7b1-4769-bc61-82fbf576a941', '정인주', '010-3504-8164', NULL, '4dbda8b42beeeeffdd40f90cbc96cd8e6b7aa07374d2ec23a4e2956b7c06c8ef', 'PENDING', 'b513ab6e-3f62-4edc-a17d-933f46294996', '2025-12-16 06:47:00.727+00', NULL, '2025-12-15 06:47:00.869871+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PART 8: 마이그레이션 완료 확인
-- ============================================================

-- 테이블별 데이터 카운트 확인
SELECT 'unions' as table_name, COUNT(*) as count FROM unions
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'notices', COUNT(*) FROM notices
UNION ALL SELECT 'hero_slides', COUNT(*) FROM hero_slides
UNION ALL SELECT 'files', COUNT(*) FROM files
UNION ALL SELECT 'comments', COUNT(*) FROM comments
UNION ALL SELECT 'questions', COUNT(*) FROM questions
UNION ALL SELECT 'free_boards', COUNT(*) FROM free_boards
UNION ALL SELECT 'alimtalk_logs', COUNT(*) FROM alimtalk_logs
UNION ALL SELECT 'alimtalk_pricing', COUNT(*) FROM alimtalk_pricing
UNION ALL SELECT 'admin_invites', COUNT(*) FROM admin_invites;

-- ============================================================
-- 마이그레이션 완료!
-- ============================================================

