-- 1. Unions 생성 (미아 2구역)
insert into public.unions (name, slug)
values ('미아 2구역', 'mia2')
on conflict (slug) do nothing;

-- 2. Unions 생성 (테스트 조합)
insert into public.unions (name, slug)
values ('테스트 재개발 조합', 'test-union')
on conflict (slug) do nothing;

-- 3. Notices 생성 (미아 2구역)
with union_data as (select id from public.unions where slug = 'mia2')
insert into public.notices (title, content, author_id, union_id, views)
select 
  '미아 2구역 조합 설립 인가 공고', 
  '미아 2구역 조합 설립이 인가되었습니다. 자세한 내용은 첨부파일을 확인해주세요.', 
  'system-admin', 
  id, 
  150
from union_data;

-- 4. Notices 생성 (테스트 조합)
with union_data as (select id from public.unions where slug = 'test-union')
insert into public.notices (title, content, author_id, union_id, views)
select 
  '테스트 조합 공지사항입니다.', 
  '이것은 테스트 조합의 공지사항 내용입니다.', 
  'system-admin', 
  id, 
  10
from union_data;

