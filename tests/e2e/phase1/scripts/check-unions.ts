import { adminClient } from '../helpers/supabase-admin';

async function checkUnions() {
  const { data: unions, error } = await adminClient
    .from('unions')
    .select('id, slug, name')
    .in('slug', ['test-union', 'solsam']);

  if (error) {
    console.error('조회 실패:', error.message);
    return;
  }

  console.log('조합 목록:');
  for (const u of unions || []) {
    console.log(`  slug=${u.slug}, id=${u.id}, name=${u.name}`);
  }

  if (!unions?.find(u => u.slug === 'test-union')) {
    console.log('\n⚠️ test-union이 존재하지 않습니다. 생성이 필요합니다.');
  }
  if (!unions?.find(u => u.slug === 'solsam')) {
    console.log('\n⚠️ solsam이 존재하지 않습니다.');
  }
}

checkUnions().catch(console.error);
