-- ============================================
-- 로그인 및 회원 관리 기능을 위한 스키마 변경
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- ============================================
-- Phase 1: users 테이블 컬럼 추가
-- ============================================

-- 신규 컬럼 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_status VARCHAR(20) DEFAULT 'PENDING_PROFILE';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS property_address_detail TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- user_status CHECK 제약조건 추가
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_status_check 
  CHECK (user_status IN ('PENDING_PROFILE', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'));

-- role CHECK 제약조건 업데이트 (APPLICANT 추가)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('SYSTEM_ADMIN', 'ADMIN', 'USER', 'APPLICANT'));

-- 기존 사용자들의 user_status를 APPROVED로 설정 (이미 승인된 사용자)
UPDATE public.users SET user_status = 'APPROVED' WHERE user_status = 'PENDING_PROFILE';

-- ============================================
-- Phase 2: user_auth_links 테이블 생성 (1:N 연결)
-- 하나의 public.users가 여러 소셜 계정(auth.users)과 연결됨
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_auth_links (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL, -- 'kakao', 'naver'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(auth_user_id) -- 하나의 auth.users는 하나의 public.users에만 연결
);

-- 테이블 코멘트
COMMENT ON TABLE public.user_auth_links IS '소셜 계정(auth.users)과 애플리케이션 사용자(public.users) 연결 테이블';
COMMENT ON COLUMN public.user_auth_links.user_id IS 'public.users 테이블의 ID';
COMMENT ON COLUMN public.user_auth_links.auth_user_id IS 'auth.users 테이블의 UUID';
COMMENT ON COLUMN public.user_auth_links.provider IS '소셜 로그인 제공자 (kakao, naver)';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_auth_links_user_id ON public.user_auth_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_links_auth_user_id ON public.user_auth_links(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_links_provider ON public.user_auth_links(provider);

-- users 테이블에 인덱스 추가 (동일 회원 검색용)
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_user_status ON public.users(user_status);
CREATE INDEX IF NOT EXISTS idx_users_property_address ON public.users(property_address);

-- ============================================
-- users 테이블 컬럼 코멘트 추가
-- ============================================
COMMENT ON COLUMN public.users.user_status IS '사용자 상태: PENDING_PROFILE(프로필 미입력), PENDING_APPROVAL(승인 대기), APPROVED(승인됨), REJECTED(거부됨)';
COMMENT ON COLUMN public.users.birth_date IS '생년월일';
COMMENT ON COLUMN public.users.property_address IS '물건지(권리소재지) 주소';
COMMENT ON COLUMN public.users.property_address_detail IS '물건지 상세주소';
COMMENT ON COLUMN public.users.rejected_reason IS '승인 거부 사유';
COMMENT ON COLUMN public.users.approved_at IS '승인 일시';
COMMENT ON COLUMN public.users.rejected_at IS '거부 일시';
COMMENT ON COLUMN public.users.updated_at IS '수정 일시';




