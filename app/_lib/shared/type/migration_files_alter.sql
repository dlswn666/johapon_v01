
-- files 테이블에 notice_id 컬럼 추가
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS notice_id BIGINT REFERENCES public.notices(id) ON DELETE SET NULL;

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

