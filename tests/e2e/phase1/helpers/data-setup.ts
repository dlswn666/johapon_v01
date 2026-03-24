import { adminClient } from './supabase-admin';

// test-union의 UUID 조회
export async function getUnionId(slug: string): Promise<string> {
  const { data, error } = await adminClient
    .from('unions')
    .select('id')
    .eq('slug', slug)
    .single();
  if (error || !data) throw new Error(`Union '${slug}' not found: ${error?.message}`);
  return data.id;
}

// 사용자 생성 (Service Role — RLS bypass)
export async function createUser(params: {
  id: string;
  name: string;
  role: string;
  union_id: string;
  user_status?: string;
  entity_type?: string | null;
  representative_name?: string | null;
  property_type?: string | null;
  is_blocked?: boolean;
}) {
  const { error } = await adminClient.from('users').upsert({
    id: params.id,
    name: params.name,
    role: params.role,
    union_id: params.union_id,
    user_status: params.user_status || 'APPROVED',
    entity_type: params.entity_type || null,
    representative_name: params.representative_name || null,
    property_type: params.property_type || null,
    is_blocked: params.is_blocked || false,
    email: `${params.id}@test.johapon.kr`,
    phone_number: '010-0000-0000',
    voting_weight: 1,
  });
  if (error) throw new Error(`User '${params.id}' 생성 실패: ${error.message}`);
}

// 물건지 생성
export async function createPropertyUnit(params: {
  user_id: string;
  dong?: string | null;
  ho?: string | null;
  ownership_ratio?: number;
  ownership_type?: string;
  is_primary?: boolean;
  property_address_jibun?: string;
}) {
  const { error } = await adminClient.from('user_property_units').insert({
    user_id: params.user_id,
    dong: params.dong || null,
    ho: params.ho || null,
    ownership_ratio: params.ownership_ratio || 100,
    ownership_type: params.ownership_type || 'OWNER',
    is_primary: params.is_primary ?? true,
    is_active: true,
    property_address_jibun: params.property_address_jibun || '서울 강북구 미아동 745-8',
  });
  if (error) throw new Error(`PropertyUnit for '${params.user_id}' 생성 실패: ${error.message}`);
}

// 사용자 관계 생성 (대리인/후견인)
export async function createRelationship(params: {
  user_id: string;
  related_user_id: string;
  relationship_type: string;
}) {
  const { error } = await adminClient.from('user_relationships').insert(params);
  if (error) throw new Error(`Relationship 생성 실패: ${error.message}`);
}

// 초대 레코드 생성 (사전등록)
export async function createMemberInvite(params: {
  union_id: string;
  created_by: string;
  name: string;
  phone_number: string;
  property_address: string;
  invite_token: string;
}) {
  const { error } = await adminClient.from('member_invites').insert({
    ...params,
    status: 'PENDING',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error(`MemberInvite 생성 실패: ${error.message}`);
}

// 테스트 데이터 정리 (test_ 접두사 데이터만 삭제)
export async function cleanupTestData(unionId: string) {
  // user_property_units (user_id로 연결)
  await adminClient.from('user_property_units').delete().like('user_id', 'test_%');
  // user_relationships
  await adminClient.from('user_relationships').delete().like('user_id', 'test_%');
  // member_invites
  await adminClient.from('member_invites').delete().eq('union_id', unionId);
  // comments (author_id)
  await adminClient.from('comments').delete().like('author_id', 'test_%');
  // notices, free_boards, questions, union_info (author_id)
  await adminClient.from('notices').delete().like('author_id', 'test_%');
  await adminClient.from('free_boards').delete().like('author_id', 'test_%');
  await adminClient.from('questions').delete().like('author_id', 'test_%');
  await adminClient.from('union_info').delete().like('author_id', 'test_%');
  // users
  await adminClient.from('users').delete().like('id', 'test_%');
}
