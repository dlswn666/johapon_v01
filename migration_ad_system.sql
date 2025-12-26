-- 광고 유형 Enum 생성
CREATE TYPE ad_type AS ENUM ('MAIN', 'SUB', 'BOARD');

-- 광고 테이블 생성
CREATE TABLE advertisements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
  type ad_type NOT NULL,
  
  -- 공통 관리 필드
  business_name TEXT NOT NULL,         -- 업체명
  contract_start_date DATE NOT NULL,   -- 계약 시작일
  contract_end_date DATE NOT NULL,     -- 계약 종료일
  price BIGINT DEFAULT 0,              -- 단가
  contract_file_url TEXT,              -- 계약서 파일 경로
  is_payment_completed BOOLEAN DEFAULT false, -- 입금 완료 여부
  
  -- 유형별 가변 필드
  image_url TEXT,                      -- 메인/서브용 이미지
  link_url TEXT,                       -- 메인/서브용 이동 링크
  title TEXT,                          -- 게시판용 제목
  content TEXT,                        -- 게시판용 본문 (Rich Text)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 설정 (필요시)
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 조회 가능 (공개 광고)
CREATE POLICY "Allow public read access for active ads" ON advertisements
  FOR SELECT USING (
    contract_start_date <= CURRENT_DATE AND 
    contract_end_date >= CURRENT_DATE
  );

-- 시스템 어드민 및 조합 어드민은 모든 권한 (별도 정책 필요시 추가)
CREATE POLICY "Admins can do everything" ON advertisements
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
