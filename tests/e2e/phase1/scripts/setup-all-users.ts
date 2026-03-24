import { adminClient } from '../helpers/supabase-admin';
import {
  getUnionId, createUser, createPropertyUnit,
  createRelationship, createMemberInvite, cleanupTestData
} from '../helpers/data-setup';
import { ADMIN_ID, USER_IDS } from '../helpers/test-constants';

async function setupAllUsers() {
  const unionId = await getUnionId('test-union');
  console.log(`test-union ID: ${unionId}`);

  // 1. 기존 테스트 데이터 정리
  console.log('기존 테스트 데이터 정리 중...');
  await cleanupTestData(unionId);

  // 2. 관리자 A1
  await createUser({ id: ADMIN_ID, name: '김관리', role: 'ADMIN', union_id: unionId });
  console.log('✅ A1 김관리 (ADMIN) 생성');

  // 3. 기본 물건지 유형별 — 개인 소유주 (U01~U06)
  const basicUsers = [
    { id: USER_IDS.U01, name: '김아파트', property_type: 'APARTMENT', dong: '101', ho: '501' },
    { id: USER_IDS.U02, name: '이빌라', property_type: 'VILLA', dong: null, ho: '201' },
    { id: USER_IDS.U03, name: '박주상', property_type: 'MIXED', dong: 'A', ho: '1201' },
    { id: USER_IDS.U04, name: '최다가구', property_type: 'MULTI_FAMILY', dong: null, ho: 'B301' },
    { id: USER_IDS.U05, name: '정단독', property_type: 'DETACHED_HOUSE', dong: null, ho: null },
    { id: USER_IDS.U06, name: '한상가', property_type: 'COMMERCIAL', dong: null, ho: null },
  ];

  for (const u of basicUsers) {
    await createUser({ id: u.id, name: u.name, role: 'USER', union_id: unionId, property_type: u.property_type });
    await createPropertyUnit({ user_id: u.id, dong: u.dong, ho: u.ho });
    console.log(`✅ ${u.name} (${u.property_type}) 생성`);
  }

  // 4. 공동소유 2인 — 아파트 102동 801호 (U07, U08)
  for (const u of [
    { id: USER_IDS.U07, name: '강대표', ratio: 50 },
    { id: USER_IDS.U08, name: '강배우자', ratio: 50 },
  ]) {
    await createUser({ id: u.id, name: u.name, role: 'USER', union_id: unionId, property_type: 'APARTMENT' });
    await createPropertyUnit({
      user_id: u.id, dong: '102', ho: '801',
      ownership_ratio: u.ratio, ownership_type: 'CO_OWNER',
    });
    console.log(`✅ ${u.name} (공동소유2인, ${u.ratio}%) 생성`);
  }

  // 5. 공동소유 3인 — 빌라 301호 (U09, U10, U11)
  for (const u of [
    { id: USER_IDS.U09, name: '오대표', ratio: 40 },
    { id: USER_IDS.U10, name: '오형제', ratio: 30 },
    { id: USER_IDS.U11, name: '오자매', ratio: 30 },
  ]) {
    await createUser({ id: u.id, name: u.name, role: 'USER', union_id: unionId, property_type: 'VILLA' });
    await createPropertyUnit({
      user_id: u.id, dong: null, ho: '301',
      ownership_ratio: u.ratio, ownership_type: 'CO_OWNER',
    });
    console.log(`✅ ${u.name} (공동소유3인, ${u.ratio}%) 생성`);
  }

  // 6. 공동소유 4인 (부분) — 상가 (U12, U13)
  for (const u of [
    { id: USER_IDS.U12, name: '윤대표', ratio: 25 },
    { id: USER_IDS.U13, name: '윤파트너', ratio: 25 },
  ]) {
    await createUser({ id: u.id, name: u.name, role: 'USER', union_id: unionId, property_type: 'COMMERCIAL' });
    await createPropertyUnit({
      user_id: u.id, dong: null, ho: null,
      ownership_ratio: u.ratio, ownership_type: 'CO_OWNER',
    });
    console.log(`✅ ${u.name} (공동소유4인 부분, ${u.ratio}%) 생성`);
  }

  // 7. 법인/공공 (U14, U15, U16)
  await createUser({
    id: USER_IDS.U14, name: '(주)테스트건설', role: 'USER', union_id: unionId,
    property_type: 'APARTMENT', entity_type: 'CORPORATION', representative_name: '테스트대표',
  });
  await createPropertyUnit({ user_id: USER_IDS.U14, dong: '103', ho: '1501' });
  console.log('✅ U14 (주)테스트건설 (CORPORATION) 생성');

  await createUser({
    id: USER_IDS.U15, name: '테스트구청', role: 'USER', union_id: unionId,
    property_type: 'DETACHED_HOUSE', entity_type: 'GOVERNMENT',
  });
  await createPropertyUnit({ user_id: USER_IDS.U15 });
  console.log('✅ U15 테스트구청 (GOVERNMENT) 생성');

  await createUser({
    id: USER_IDS.U16, name: '테스트주택공사', role: 'USER', union_id: unionId,
    property_type: 'APARTMENT', entity_type: 'PUBLIC_CORP',
  });
  await createPropertyUnit({ user_id: USER_IDS.U16, dong: '104', ho: '201' });
  console.log('✅ U16 테스트주택공사 (PUBLIC_CORP) 생성');

  // 8. 특수 관계 (U17, U18) — U07(강대표)의 대리인/후견인
  await createUser({ id: USER_IDS.U17, name: '김대리', role: 'USER', union_id: unionId });
  await createRelationship({
    user_id: USER_IDS.U17, related_user_id: USER_IDS.U07, relationship_type: 'PROXY',
  });
  console.log('✅ U17 김대리 (PROXY → U07) 생성');

  await createUser({ id: USER_IDS.U18, name: '박후견', role: 'USER', union_id: unionId });
  await createRelationship({
    user_id: USER_IDS.U18, related_user_id: USER_IDS.U07, relationship_type: 'LEGAL_GUARDIAN',
  });
  console.log('✅ U18 박후견 (LEGAL_GUARDIAN → U07) 생성');

  // 9. 다주택 (U19) — 아파트 3채
  await createUser({
    id: USER_IDS.U19, name: '송부동산', role: 'USER', union_id: unionId, property_type: 'APARTMENT',
  });
  const multiProps = [
    { dong: '101', ho: '301', is_primary: true },
    { dong: '102', ho: '502', is_primary: false },
    { dong: '103', ho: '1001', is_primary: false },
  ];
  for (const p of multiProps) {
    await createPropertyUnit({ user_id: USER_IDS.U19, ...p });
  }
  console.log('✅ U19 송부동산 (다주택 3채) 생성');

  // 10. 사전등록 (U20) — PRE_REGISTERED + 초대 토큰
  await createUser({
    id: USER_IDS.U20, name: '이초대', role: 'USER', union_id: unionId,
    user_status: 'PRE_REGISTERED',
  });
  const inviteToken = `test-invite-${Date.now()}`;
  await createMemberInvite({
    union_id: unionId,
    created_by: ADMIN_ID,
    name: '이초대',
    phone_number: '010-0000-0020',
    property_address: '서울 강북구 미아동 745-8',
    invite_token: inviteToken,
  });
  console.log(`✅ U20 이초대 (PRE_REGISTERED, token: ${inviteToken}) 생성`);

  // 11. 검증
  const { count } = await adminClient
    .from('users')
    .select('*', { count: 'exact', head: true })
    .like('id', 'test_%');
  console.log(`\n✅ 총 ${count}명 사용자 생성 완료 (기대: 21명)`);

  const { count: propCount } = await adminClient
    .from('user_property_units')
    .select('*', { count: 'exact', head: true })
    .like('user_id', 'test_%');
  console.log(`✅ 총 ${propCount}개 물건지 생성 완료`);

  const { count: relCount } = await adminClient
    .from('user_relationships')
    .select('*', { count: 'exact', head: true })
    .like('user_id', 'test_%');
  console.log(`✅ 총 ${relCount}개 관계 생성 완료`);
}

setupAllUsers().catch(console.error);
