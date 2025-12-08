-- 조합 정보 공유 게시판 테이블 생성
-- Supabase Dashboard SQL Editor에서 실행해주세요.
--
-- [참고] 파일 첨부는 다형성 연관 관계(Polymorphic Association) 패턴을 사용합니다.
-- files 테이블의 attachable_type = 'union_info', attachable_id = union_info.id 로 조회합니다.
-- attachable 컬럼 관련 마이그레이션은 별도 파일을 참고하세요.

-- 1. union_info 테이블 생성
CREATE TABLE public.union_info (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    union_id UUID NULL,
    thumbnail_url TEXT NULL,
    has_attachments BOOLEAN NOT NULL DEFAULT FALSE,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT union_info_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id),
    CONSTRAINT union_info_union_id_fkey FOREIGN KEY (union_id) REFERENCES public.unions(id)
);

-- 2. union_info 테이블 인덱스 생성
CREATE INDEX idx_union_info_union_id ON public.union_info(union_id);
CREATE INDEX idx_union_info_author_id ON public.union_info(author_id);
CREATE INDEX idx_union_info_created_at ON public.union_info(created_at DESC);

-- 3. union_info 조회수 증가 함수 생성
CREATE OR REPLACE FUNCTION public.increment_union_info_views(p_union_info_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.union_info
    SET views = views + 1
    WHERE id = p_union_info_id;
END;
$$ LANGUAGE plpgsql;

-- 4. 테이블 코멘트
COMMENT ON TABLE public.union_info IS '조합 정보 공유 게시판';
COMMENT ON COLUMN public.union_info.thumbnail_url IS '리스트 썸네일 이미지 URL';
COMMENT ON COLUMN public.union_info.has_attachments IS '첨부파일 존재 여부 (files 테이블에서 attachable_type=union_info로 조회)';
COMMENT ON COLUMN public.union_info.views IS '조회수';

