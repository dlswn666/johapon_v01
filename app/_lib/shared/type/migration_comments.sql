-- =============================================
-- 댓글 시스템 마이그레이션
-- =============================================

-- 댓글 통합 테이블 생성
-- 주의: users.id는 VARCHAR 타입 (Supabase Auth 기반)
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,                                    -- 'notice', 'board' 등
  entity_id BIGINT NOT NULL,                                    -- 댓글 대상 ID
  parent_id BIGINT REFERENCES public.comments(id) ON DELETE CASCADE,  -- 답글용 (NULL이면 일반 댓글)
  author_id VARCHAR NOT NULL REFERENCES public.users(id),       -- 작성자 (users.id는 VARCHAR 타입)
  content TEXT NOT NULL,                                        -- 댓글 내용
  union_id UUID REFERENCES public.unions(id),                   -- 조합 ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 검색 성능 향상을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_union_id ON public.comments(union_id);

-- RLS 활성화
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 댓글 조회 가능
CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT USING (true);

-- RLS 정책: 인증된 사용자만 댓글 작성 가능
-- auth.uid()는 UUID를 반환하므로 TEXT로 캐스팅하여 비교
CREATE POLICY "Authenticated users can insert comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid()::text = author_id);

-- RLS 정책: 본인 댓글만 수정 가능
CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid()::text = author_id);

-- RLS 정책: 본인 댓글만 삭제 가능
CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid()::text = author_id);

