-- ============================================
-- 조합 홈페이지 스키마 마이그레이션
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- 1. unions 테이블에 기본 정보 컬럼 추가
ALTER TABLE unions ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE unions ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE unions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE unions ADD COLUMN IF NOT EXISTS business_hours TEXT;
ALTER TABLE unions ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE unions ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN unions.phone IS '전화번호';
COMMENT ON COLUMN unions.address IS '주소';
COMMENT ON COLUMN unions.email IS '이메일';
COMMENT ON COLUMN unions.business_hours IS '운영시간 (예: 평일 09:00~18:00, 주말 휴무)';
COMMENT ON COLUMN unions.logo_url IS '조합 로고 이미지 URL';
COMMENT ON COLUMN unions.description IS '조합 소개';

-- 2. hero_slides 테이블 생성
CREATE TABLE IF NOT EXISTS hero_slides (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    union_id UUID NOT NULL REFERENCES unions(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    link_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE hero_slides IS 'Hero Section 슬라이드 이미지 관리';
COMMENT ON COLUMN hero_slides.image_url IS 'Storage에 저장된 이미지 URL';
COMMENT ON COLUMN hero_slides.link_url IS '클릭 시 이동할 URL (nullable)';
COMMENT ON COLUMN hero_slides.display_order IS '표시 순서 (낮을수록 먼저, 동일 시 created_at DESC)';
COMMENT ON COLUMN hero_slides.is_active IS '활성화 여부';

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_hero_slides_union_id ON hero_slides(union_id);
CREATE INDEX IF NOT EXISTS idx_hero_slides_order ON hero_slides(union_id, display_order, created_at DESC);

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_hero_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hero_slides_updated_at ON hero_slides;
CREATE TRIGGER trigger_hero_slides_updated_at
    BEFORE UPDATE ON hero_slides
    FOR EACH ROW
    EXECUTE FUNCTION update_hero_slides_updated_at();


