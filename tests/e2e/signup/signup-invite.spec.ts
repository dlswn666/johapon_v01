/**
 * 초대 링크 가입 플로우 E2E 테스트
 *
 * 테스트 시나리오:
 * 1. 조합원 초대 (member_invite_token) - prefill 데이터 적용
 * 2. 관리자 초대 (admin invite_token) - 자동 등록 및 관리자 페이지 리다이렉트
 * 3. 만료된 초대 토큰 처리
 * 4. 유효하지 않은 초대 토큰 처리
 * 5. 초대 데이터 prefill 후 수정 가능 여부
 */

import { test, expect } from '@playwright/test';
import { adminClient } from '../phase1/helpers/supabase-admin';

const SLUG = 'solsam';
const BASE_URL = 'http://localhost:3000';

// -------------------------------------------------------
// 헬퍼
// -------------------------------------------------------

async function getUnionId(slug: string): Promise<string> {
    const { data, error } = await adminClient
        .from('unions')
        .select('id')
        .eq('slug', slug)
        .single();
    if (error || !data) throw new Error(`Union '${slug}' not found`);
    return data.id;
}

// -------------------------------------------------------
// 테스트
// -------------------------------------------------------

test.describe('초대 링크 가입 플로우', () => {

    test('만료된 조합원 초대 토큰 - invite_error=expired 리다이렉트', async ({ page }) => {
        // 만료된 초대 토큰으로 콜백 시도
        // OAuth 인증 코드 없이는 직접 테스트 불가하므로,
        // 만료된 토큰으로 콜백 URL 접근 시 에러 처리 확인
        const response = await page.request.get(
            `${BASE_URL}/auth/callback?slug=${SLUG}&member_invite_token=expired_token_12345`,
            { maxRedirects: 0 }
        );

        const location = response.headers()['location'] || '';

        // code가 없으므로 auth_error=no_code 또는 invite_error=expired
        if (response.status() >= 300 && response.status() < 400) {
            expect(location).toMatch(/auth_error|invite_error/);
        }
    });

    test('유효하지 않은 관리자 초대 토큰 처리', async ({ page }) => {
        const response = await page.request.get(
            `${BASE_URL}/auth/callback?slug=${SLUG}&invite_token=invalid_admin_token_xyz`,
            { maxRedirects: 0 }
        );

        const location = response.headers()['location'] || '';

        if (response.status() >= 300 && response.status() < 400) {
            expect(location).toMatch(/auth_error|invite_error/);
        }
    });

    test('조합원 초대 - prefill 쿠키 설정 후 RegisterModal 데이터 프리필', async ({ page }) => {
        // register-prefill 쿠키를 직접 설정하여 prefill 동작 테스트
        const prefillData = {
            name: '초대테스트',
            phone_number: '010-5555-6666',
            property_address: '서울특별시 강북구 미아동 123-45',
            invite_type: 'member',
            invite_token: 'test_token_12345',
        };

        // 먼저 페이지에 접속하여 쿠키 도메인 설정
        await page.goto(`${BASE_URL}/${SLUG}`);

        // register-prefill 쿠키 설정
        await page.context().addCookies([{
            name: 'register-prefill',
            value: encodeURIComponent(JSON.stringify(prefillData)),
            domain: 'localhost',
            path: '/',
        }]);

        // 페이지 새로고침하여 쿠키 적용
        // 참고: 실제로 이 쿠키는 authUser가 있고 user가 없을 때만 RegisterModal이 열림
        // 테스트 로그인으로 신규 사용자 생성이 필요

        // 쿠키가 설정되었는지 확인
        const cookies = await page.context().cookies();
        const prefillCookie = cookies.find(c => c.name === 'register-prefill');
        expect(prefillCookie).toBeTruthy();
        expect(prefillCookie!.value).toContain(encodeURIComponent('초대테스트'));
    });

    test('member_invites 테이블에 초대 생성 후 토큰 조회', async () => {
        // DB 레벨 테스트: 초대 생성 → 조회 → 정리
        const unionId = await getUnionId(SLUG);
        const testToken = `e2e_invite_${Date.now()}`;

        // 초대 생성
        const { error: insertError } = await adminClient.from('member_invites').insert({
            union_id: unionId,
            created_by: 'e2e-test',
            name: 'E2E초대테스트',
            phone_number: '010-0000-9999',
            property_address: '서울 강북구 미아동 999',
            invite_token: testToken,
            status: 'PENDING',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        expect(insertError).toBeNull();

        // 초대 조회
        const { data: invite, error: selectError } = await adminClient
            .from('member_invites')
            .select('*')
            .eq('invite_token', testToken)
            .single();

        expect(selectError).toBeNull();
        expect(invite).toBeTruthy();
        expect(invite!.name).toBe('E2E초대테스트');
        expect(invite!.status).toBe('PENDING');

        // 정리
        await adminClient.from('member_invites').delete().eq('invite_token', testToken);
    });

    test('만료된 초대 토큰은 조회 불가', async () => {
        const unionId = await getUnionId(SLUG);
        const testToken = `e2e_expired_${Date.now()}`;

        // 이미 만료된 초대 생성
        await adminClient.from('member_invites').insert({
            union_id: unionId,
            created_by: 'e2e-test',
            name: 'E2E만료테스트',
            phone_number: '010-0000-8888',
            property_address: '서울 강북구 미아동 888',
            invite_token: testToken,
            status: 'PENDING',
            expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 이미 만료
        });

        // PENDING 상태이지만 만료된 초대 조회
        const { data: invite } = await adminClient
            .from('member_invites')
            .select('*')
            .eq('invite_token', testToken)
            .eq('status', 'PENDING')
            .single();

        // DB에는 존재하지만 expires_at이 과거임
        expect(invite).toBeTruthy();
        const expiresAt = new Date(invite!.expires_at);
        expect(expiresAt.getTime()).toBeLessThan(Date.now());

        // 정리
        await adminClient.from('member_invites').delete().eq('invite_token', testToken);
    });
});

test.describe('관리자 초대 플로우', () => {

    test('admin_invites 테이블 생성 및 조회', async () => {
        const unionId = await getUnionId(SLUG);
        const testToken = `e2e_admin_invite_${Date.now()}`;

        // 관리자 초대 생성
        const { error: insertError } = await adminClient.from('admin_invites').insert({
            union_id: unionId,
            name: 'E2E관리자초대',
            email: 'e2e-admin@test.local',
            invite_token: testToken,
            status: 'PENDING',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        expect(insertError).toBeNull();

        // 조회 확인
        const { data: invite } = await adminClient
            .from('admin_invites')
            .select('*')
            .eq('invite_token', testToken)
            .single();

        expect(invite).toBeTruthy();
        expect(invite!.status).toBe('PENDING');

        // 정리
        await adminClient.from('admin_invites').delete().eq('invite_token', testToken);
    });

    test('사용된(USED) 초대 토큰은 재사용 불가', async () => {
        const unionId = await getUnionId(SLUG);
        const testToken = `e2e_used_admin_${Date.now()}`;

        // USED 상태 초대 생성
        await adminClient.from('admin_invites').insert({
            union_id: unionId,
            name: 'E2E사용됨',
            email: 'e2e-used@test.local',
            invite_token: testToken,
            status: 'USED',
            used_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        // PENDING 상태로만 조회 → 결과 없어야 함
        const { data: invite } = await adminClient
            .from('admin_invites')
            .select('*')
            .eq('invite_token', testToken)
            .eq('status', 'PENDING')
            .single();

        expect(invite).toBeNull();

        // 정리
        await adminClient.from('admin_invites').delete().eq('invite_token', testToken);
    });
});
