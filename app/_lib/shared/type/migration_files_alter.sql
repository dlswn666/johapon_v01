-- ============================================
-- files 테이블 다형성 연관 관계(Polymorphic Association) 설정
-- ============================================
-- 
-- 기존 방식: 각 게시판마다 별도 컬럼 추가 (notice_id, union_info_id, ...)
-- 새 방식: attachable_type + attachable_id 두 컬럼으로 모든 게시판 관리
--
-- 사용 예시:
--   - 공지사항 파일: attachable_type = 'notice', attachable_id = notice.id
--   - 조합정보 파일: attachable_type = 'union_info', attachable_id = union_info.id
--   - 향후 추가: attachable_type = 'board', attachable_id = board.id (스키마 변경 불필요)

-- 1. files 테이블에 다형성 컬럼 추가
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS attachable_type VARCHAR(50);
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS attachable_id BIGINT;

-- 2. 복합 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_files_attachable ON public.files(attachable_type, attachable_id);

-- ============================================
-- Storage Bucket 및 Policy 설정
-- ============================================

-- Storage Bucket 생성 (이미 존재할 수 있음)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('johapon-storage', 'johapon-storage', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy (temp 폴더: 인증된 사용자 업로드/삭제 허용)
CREATE POLICY "Temp folder access" ON storage.objects
    FOR ALL TO authenticated USING (bucket_id = 'johapon-storage' AND (storage.foldername(name))[1] = 'temp');

-- Storage Policy (unions 폴더: 읽기는 전체 허용, 쓰기는 인증된 사용자)
CREATE POLICY "Public Read Access" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'johapon-storage');

CREATE POLICY "Authenticated Write Access" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'johapon-storage');

CREATE POLICY "Authenticated Update Access" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'johapon-storage');

CREATE POLICY "Authenticated Delete Access" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'johapon-storage');
