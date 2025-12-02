-- [1] Supabase Storage 권한 설정
-- 주의: 'ALTER TABLE storage.objects ...' 명령은 권한 부족 오류(42501)를 유발하므로 제외합니다. (기본적으로 활성화되어 있음)

-- 1. 'files' 버킷 설정
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Temp 폴더 권한 (작성 중인 파일)
DROP POLICY IF EXISTS "Public Access to Temp Folder" ON storage.objects;
CREATE POLICY "Public Access to Temp Folder"
ON storage.objects FOR ALL
USING ( bucket_id = 'files' AND (storage.foldername(name))[1] = 'temp' )
WITH CHECK ( bucket_id = 'files' AND (storage.foldername(name))[1] = 'temp' );

-- 3. Unions 폴더 권한 (저장된 파일)
DROP POLICY IF EXISTS "Public Access to Unions Folder" ON storage.objects;
CREATE POLICY "Public Access to Unions Folder"
ON storage.objects FOR ALL
USING ( bucket_id = 'files' AND (storage.foldername(name))[1] = 'unions' )
WITH CHECK ( bucket_id = 'files' AND (storage.foldername(name))[1] = 'unions' );


-- [2] DB 테이블 권한 설정 (public.files)
-- 실제 파일 정보가 저장되는 DB 테이블에 대한 권한입니다.

-- 1. RLS 활성화 (혹시 안 되어 있을 경우를 대비해 실행하되, 에러가 나면 무시해도 됩니다)
-- ALTER TABLE public.files ENABLE ROW LEVEL SECURITY; -- 이 줄도 소유권 문제 가능성이 있으면 제외하거나, 본인 소유 테이블이므로 보통 가능합니다.
-- 일단 안전하게 정책만 추가합니다.

-- 2. 조회 권한
DROP POLICY IF EXISTS "Files Viewable by Everyone" ON public.files;
CREATE POLICY "Files Viewable by Everyone"
ON public.files FOR SELECT
USING (true);

-- 3. 쓰기 권한 (로그인된 사용자)
DROP POLICY IF EXISTS "Files Modifiable by Authenticated" ON public.files;
CREATE POLICY "Files Modifiable by Authenticated"
ON public.files FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
