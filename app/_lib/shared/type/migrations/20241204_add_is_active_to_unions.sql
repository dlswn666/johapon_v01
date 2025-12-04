-- unions 테이블에 is_active 컬럼 추가
ALTER TABLE public.unions 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN public.unions.is_active IS '조합 활성화 여부 (비활성화 시 홈페이지 접근 차단)';

