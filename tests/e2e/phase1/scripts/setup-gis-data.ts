import { adminClient } from '../helpers/supabase-admin';
import { getUnionId } from '../helpers/data-setup';

async function setupGisData() {
  const testUnionId = await getUnionId('test-union');
  const solsamId = await getUnionId('solsam');

  console.log(`솔샘 ID: ${solsamId}`);
  console.log(`test-union ID: ${testUnionId}`);

  // 1. test-union의 기존 land_lots 수 확인
  const { count: testCount } = await adminClient
    .from('land_lots')
    .select('*', { count: 'exact', head: true })
    .eq('union_id', testUnionId);
  console.log(`test-union 기존 land_lots: ${testCount}건`);

  // 2. 솔샘 land_lots 수 확인
  const { count: solsamCount } = await adminClient
    .from('land_lots')
    .select('*', { count: 'exact', head: true })
    .eq('union_id', solsamId);
  console.log(`솔샘 land_lots: ${solsamCount}건`);

  if (testCount && testCount > 0) {
    console.log(`test-union에 이미 ${testCount}건의 land_lots가 있습니다. GIS 복제 스킵.`);
    return;
  }

  if (!solsamCount || solsamCount === 0) {
    console.log('솔샘에 land_lots가 없습니다. GIS 복제 불가.');
    return;
  }

  // 3. 솔샘 land_lots의 union_id를 test-union으로 변경 (이동 방식)
  // ⚠️ 이 방식은 솔샘의 데이터를 test-union으로 이동시킴
  // 테스트 후 원복: UPDATE land_lots SET union_id = solsamId WHERE union_id = testUnionId
  console.log(`\n솔샘 land_lots ${solsamCount}건을 test-union으로 이동 중...`);

  const { error: updateError } = await adminClient
    .from('land_lots')
    .update({ union_id: testUnionId })
    .eq('union_id', solsamId);

  if (updateError) {
    throw new Error(`land_lots union_id 변경 실패: ${updateError.message}`);
  }

  // 4. 검증
  const { count: newTestCount } = await adminClient
    .from('land_lots')
    .select('*', { count: 'exact', head: true })
    .eq('union_id', testUnionId);

  const { count: newSolsamCount } = await adminClient
    .from('land_lots')
    .select('*', { count: 'exact', head: true })
    .eq('union_id', solsamId);

  console.log(`✅ test-union land_lots: ${newTestCount}건`);
  console.log(`✅ 솔샘 land_lots: ${newSolsamCount}건 (이동 후 0이어야 함)`);
}

setupGisData().catch(console.error);
