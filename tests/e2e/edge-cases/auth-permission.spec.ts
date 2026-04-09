import { test, expect } from '@playwright/test';
import { testLogin, testLoginAsAdmin, testLoginAsMember } from '../helpers/test-auth';

const SLUG = 'solsam';

/**
 * 권한 및 인증 검증 E2E 테스트
 *
 * authenticateApiRequest()의 4단계 검증 로직을 테스트:
 * 1. Supabase Auth 세션 확인 → 401
 * 2. user_auth_links 매핑 확인 → 403 (PROFILE_NOT_FOUND)
 * 3. users 테이블 조회 → 403 (USER_NOT_FOUND)
 * 4. 관리자 권한 검사 → 403 (FORBIDDEN)
 * 5. 조합 접근 권한 검사 → 403 (UNION_ACCESS_DENIED)
 * 6. 차단 사용자 접근 → 403 (USER_BLOCKED)
 */
test.describe('권한 검증 - 관리자 API 보호', () => {
    test('비인증 사용자가 회원 승인 API 호출 시 401 반환', async ({ request }) => {
        // 세션 없이 직접 API 호출
        const response = await request.post('/api/members/approve', {
            data: { unionId: 'test-union', memberId: 'test-member' },
        });

        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.error).toContain('인증이 필요합니다');
        expect(body.code).toBe('UNAUTHORIZED');
    });

    test('비인증 사용자가 전자투표 목록 API 호출 시 401 반환', async ({ request }) => {
        const response = await request.get('/api/evotes');

        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.code).toBe('UNAUTHORIZED');
    });

    test('비인증 사용자가 전자투표 상태 변경 API 호출 시 401 반환', async ({ request }) => {
        const response = await request.patch('/api/evotes/fake-id/status', {
            data: { status: 'VOTING' },
        });

        expect(response.status()).toBe(401);
    });

    test('비관리자(일반 조합원)가 회원 승인 API 호출 시 403 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const response = await page.request.post('/api/members/approve', {
            data: { unionId: 'test-union', memberId: 'test-member' },
        });

        // authenticateApiRequest({ requireAdmin: true }) → 403 FORBIDDEN
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.code).toBe('FORBIDDEN');
        expect(body.error).toContain('관리자 권한이 필요합니다');
    });

    test('비관리자가 전자투표 생성 API 호출 시 403 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 투표',
                scheduled_at: new Date().toISOString(),
                agendas: [{ title: '테스트 안건' }],
                selected_voter_ids: ['test'],
                pre_vote_start_at: new Date().toISOString(),
                pre_vote_end_at: new Date().toISOString(),
            },
        });

        expect(response.status()).toBe(403);
    });

    test('비관리자가 전자투표 상태 변경 API 호출 시 403 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const response = await page.request.patch('/api/evotes/fake-assembly-id/status', {
            data: { status: 'VOTING' },
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.code).toBe('FORBIDDEN');
    });

    test('전자투표 상태 API에 GET 요청 시 405 반환', async ({ request }) => {
        const response = await request.get('/api/evotes/fake-id/status');

        expect(response.status()).toBe(405);
        const body = await response.json();
        expect(body.error).toContain('PATCH 메서드만 지원');
    });
});

test.describe('권한 검증 - 필수 파라미터 누락', () => {
    test('회원 승인 API에 unionId 누락 시 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/members/approve', {
            data: { memberId: 'test-member' },
            // unionId 누락
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('필수 파라미터가 누락');
    });

    test('회원 승인 API에 memberId 누락 시 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/members/approve', {
            data: { unionId: 'test-union' },
            // memberId 누락
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('필수 파라미터가 누락');
    });

    test('전자투표 상태 변경 시 유효하지 않은 상태 값 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.patch('/api/evotes/fake-id/status', {
            data: { status: 'INVALID_STATUS' },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('유효하지 않은 상태');
    });

    test('전자투표 상태 변경 시 빈 요청 본문 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.patch('/api/evotes/fake-id/status', {
            headers: { 'Content-Type': 'text/plain' },
            data: 'invalid json',
        });

        expect(response.status()).toBe(400);
    });
});

test.describe('권한 검증 - 존재하지 않는 리소스', () => {
    test('존재하지 않는 사용자 승인 시도 → 404 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        // 실제 unionId가 필요하지만 memberId가 존재하지 않음
        const response = await page.request.post('/api/members/approve', {
            data: {
                unionId: '00000000-0000-0000-0000-000000000000',
                memberId: 'nonexistent-user-id',
            },
        });

        // 관리자 인증은 통과하지만 사용자를 찾을 수 없음
        expect(response.status()).toBe(404);
        const body = await response.json();
        expect(body.error).toContain('사용자를 찾을 수 없습니다');
    });

    test('존재하지 않는 전자투표 상태 변경 시도 → 404 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.patch('/api/evotes/00000000-0000-0000-0000-000000000000/status', {
            data: { status: 'VOTING' },
        });

        expect(response.status()).toBe(404);
        const body = await response.json();
        expect(body.error).toContain('전자투표를 찾을 수 없습니다');
    });
});
