import { Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

interface TestLoginOptions {
    slug: string;
    role?: 'admin' | 'member';
    email?: string;
}

/**
 * 테스트 로그인 수행
 * /api/test/login 호출 후 세션 쿠키가 설정된 상태로 리다이렉트
 */
export async function testLogin(page: Page, options: TestLoginOptions): Promise<{
    authUserId: string;
    email: string;
}> {
    const { slug, role = 'member', email } = options;

    const response = await page.request.post(`${BASE_URL}/api/test/login`, {
        data: { slug, role, email },
    });

    if (!response.ok()) {
        const body = await response.json();
        throw new Error(`테스트 로그인 실패: ${body.error}`);
    }

    const data = await response.json();

    await page.goto(`${BASE_URL}/${slug}`);

    return {
        authUserId: data.authUserId,
        email: data.email,
    };
}

export async function testLoginAsAdmin(page: Page, slug: string) {
    return testLogin(page, { slug, role: 'admin' });
}

export async function testLoginAsMember(page: Page, slug: string) {
    return testLogin(page, { slug, role: 'member' });
}
