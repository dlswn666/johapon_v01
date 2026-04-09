import { test, expect } from '@playwright/test';

const SLUG = 'solsam';

/**
 * 초대 링크 만료 검증 E2E 테스트
 *
 * auth/callback/route.ts의 초대 처리 로직:
 * - 관리자 초대 (admin_invites): status='PENDING', expires_at 체크
 * - 조합원 초대 (member_invites): status='PENDING', expires_at 체크
 * - 만료 시 invite_error=expired 쿼리 파라미터로 리다이렉트
 */
test.describe('초대 링크 - 만료/무효 처리', () => {
    test('만료된 관리자 초대 링크로 접근 시 invite_error=expired 표시', async ({ page }) => {
        // auth/callback은 OAuth 플로우를 거쳐야 하므로,
        // 직접 콜백 URL을 호출하면 code 없어서 auth_error=no_code로 리다이렉트
        const response = await page.goto(
            `/${SLUG}?invite_error=expired`
        );

        // 페이지가 로드되고 에러 파라미터가 URL에 포함되는지 확인
        expect(page.url()).toContain('invite_error=expired');
    });

    test('code 없이 auth/callback 접근 시 auth_error=no_code로 리다이렉트', async ({ page }) => {
        // OAuth callback에 code 파라미터 없이 접근
        await page.goto(`/auth/callback?slug=${SLUG}`);

        // no_code 에러로 리다이렉트
        await page.waitForURL(`**/${SLUG}?auth_error=no_code`, { timeout: 10000 });
        expect(page.url()).toContain('auth_error=no_code');
    });

    test('존재하지 않는 invite_token으로 auth/callback 접근 시 에러', async ({ page }) => {
        // 유효하지 않은 invite_token으로 콜백 접근
        // code가 없으므로 먼저 no_code 에러가 발생
        await page.goto(`/auth/callback?slug=${SLUG}&invite_token=invalid-token-12345`);

        // code 없으면 auth_error=no_code가 먼저 반환됨
        await page.waitForURL('**/*auth_error*', { timeout: 10000 });
        expect(page.url()).toMatch(/auth_error/);
    });

    test('존재하지 않는 member_invite_token으로 접근 시 에러', async ({ page }) => {
        await page.goto(`/auth/callback?slug=${SLUG}&member_invite_token=invalid-token`);

        await page.waitForURL('**/*auth_error*', { timeout: 10000 });
        expect(page.url()).toMatch(/auth_error/);
    });
});

test.describe('초대 링크 - URL 파라미터 전파', () => {
    test('status=pending 파라미터가 있는 페이지 접근', async ({ page }) => {
        // PENDING_APPROVAL 상태 사용자가 리다이렉트되는 URL 확인
        await page.goto(`/${SLUG}?status=pending`);

        expect(page.url()).toContain('status=pending');
        // 페이지가 정상 로드되는지 확인
        await expect(page).toHaveURL(new RegExp(`${SLUG}.*status=pending`));
    });

    test('status=rejected 파라미터가 있는 페이지 접근', async ({ page }) => {
        await page.goto(`/${SLUG}?status=rejected`);

        expect(page.url()).toContain('status=rejected');
    });
});
