-- 자유 게시판 테이블 생성
CREATE TABLE IF NOT EXISTS public.free_boards (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(255) NOT NULL REFERENCES public.users(id),
    union_id UUID REFERENCES public.unions(id),
    views INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 테이블 코멘트
COMMENT ON TABLE public.free_boards IS '자유 게시판';
COMMENT ON COLUMN public.free_boards.views IS '조회수';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_free_boards_union_id ON public.free_boards(union_id);
CREATE INDEX IF NOT EXISTS idx_free_boards_author_id ON public.free_boards(author_id);
CREATE INDEX IF NOT EXISTS idx_free_boards_created_at ON public.free_boards(created_at DESC);

-- 조회수 증가 함수 생성
CREATE OR REPLACE FUNCTION public.increment_free_board_views(free_board_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.free_boards
    SET views = views + 1
    WHERE id = free_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_free_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_free_boards_updated_at ON public.free_boards;
CREATE TRIGGER trigger_free_boards_updated_at
    BEFORE UPDATE ON public.free_boards
    FOR EACH ROW
    EXECUTE FUNCTION update_free_boards_updated_at();




