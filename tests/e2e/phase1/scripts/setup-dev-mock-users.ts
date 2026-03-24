/**
 * dev mock 사용자를 DB에 등록 — FK 제약 해결
 * dev mock은 id: `dev-{role}-{unionId}` 형태의 사용자를 React context에만 생성하지만,
 * 브라우저 UI에서 글 작성/수정/삭제 시 FK 제약(notices.author_id → users.id)이 위반됨.
 * 이 스크립트로 dev mock 사용자를 users 테이블에도 INSERT하면 FK가 통과됨.
 */
import { adminClient } from '../helpers/supabase-admin';
import { getUnionId } from '../helpers/data-setup';

async function setupDevMockUsers() {
  const unionId = await getUnionId('test-union');
  console.log(`test-union ID: ${unionId}`);

  const devUsers = [
    {
      id: `dev-admin-${unionId}`,
      name: '테스트 관리자',
      role: 'ADMIN',
      union_id: unionId,
      user_status: 'APPROVED',
      email: 'dev-admin@localhost.dev',
      phone_number: '010-0000-0000',
      voting_weight: 1,
      is_blocked: false,
    },
    {
      id: `dev-user-${unionId}`,
      name: '테스트 조합원',
      role: 'USER',
      union_id: unionId,
      user_status: 'APPROVED',
      email: 'dev-user@localhost.dev',
      phone_number: '010-0000-0001',
      voting_weight: 1,
      is_blocked: false,
    },
  ];

  for (const user of devUsers) {
    const { error } = await adminClient.from('users').upsert(user);
    if (error) {
      console.error(`${user.id} 생성 실패: ${error.message}`);
    } else {
      console.log(`✅ ${user.name} (${user.role}) → id: ${user.id}`);
    }
  }

  // 검증
  const { data } = await adminClient
    .from('users')
    .select('id, name, role')
    .like('id', 'dev-%');
  console.log(`\nDB에 등록된 dev mock 사용자: ${data?.length}명`);
  data?.forEach(u => console.log(`  ${u.id} — ${u.name} (${u.role})`));
}

setupDevMockUsers().catch(console.error);
