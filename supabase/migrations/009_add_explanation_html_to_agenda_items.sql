-- Migration 009: agenda_items에 의안서 HTML 컬럼 추가
-- 위자드에서 TipTap 에디터로 작성한 의안서 내용 저장

ALTER TABLE agenda_items ADD COLUMN IF NOT EXISTS explanation_html TEXT;

COMMENT ON COLUMN agenda_items.explanation_html IS '안건별 의안서 HTML (TipTap 에디터로 작성)';
