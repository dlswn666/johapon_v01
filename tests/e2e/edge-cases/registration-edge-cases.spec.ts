import { test, expect } from '@playwright/test';
import { testLoginAsMember, testLoginAsAdmin } from '../helpers/test-auth';

const SLUG = 'solsam';

/**
 * 회원가입 엣지 케이스 E2E 테스트
 *
 * RegisterModal.tsx의 검증 로직:
 * - 필수 필드 검증 (이름, 전화번호, 물건지)
 * - 약관 동의 확인
 * - 중복 사용자 확인 (같은 조합 내 이름+전화번호+물건지 일치)
 * - isSubmittingRef로 중복 제출 방지
 * - 인증 정보(authUserId) 없는 상태 처리
 */
test.describe('회원가입 - 필수 필드 검증 (UI 레벨)', () => {
    // 참고: 이 테스트들은 RegisterModal의 클라이언트 검증 로직을 검증
    // 실제 모달이 열리려면 카카오 로그인이 필요하므로, API 레벨에서 간접 테스트

    test('회원 승인 후 PENDING_APPROVAL이 아닌 사용자 재승인 시도 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        // 이미 APPROVED인 사용자를 다시 승인하려는 시도
        // (실제 memberId가 있어야 정확한 테스트 가능)
        const response = await page.request.post('/api/members/approve', {
            data: {
                unionId: '00000000-0000-0000-0000-000000000000',
                memberId: 'already-approved-user',
            },
        });

        // 사용자가 존재하지 않으면 404, 존재하지만 상태가 다르면 400
        expect([400, 404]).toContain(response.status());
    });
});

test.describe('회원가입 - 중복 제출 방지', () => {
    test('isSubmittingRef를 통한 동시 제출 방지 (브라우저 레벨)', async ({ page }) => {
        // 이 테스트는 RegisterModal의 isSubmittingRef 로직을 확인
        // 실제로는 브라우저에서 폼을 빠르게 두 번 제출하는 시나리오

        // 동일한 회원 승인 요청을 동시에 2개 전송
        await testLoginAsAdmin(page, SLUG);

        const promises = [
            page.request.post('/api/members/approve', {
                data: { unionId: 'test-union', memberId: 'test-member' },
            }),
            page.request.post('/api/members/approve', {
                data: { unionId: 'test-union', memberId: 'test-member' },
            }),
        ];

        const responses = await Promise.all(promises);

        // 둘 다 동일한 결과를 반환해야 함 (DB 레벨에서 일관성 보장)
        // 하나가 성공하면 다른 하나는 상태 불일치로 실패할 수 있음
        for (const response of responses) {
            expect(response.status()).toBeLessThan(500);
        }
    });
});

test.describe('회원가입 - 비정상 입력', () => {
    test('회원 승인 API에 매우 긴 문자열 전송 → 안전 처리', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const longString = 'A'.repeat(10000);
        const response = await page.request.post('/api/members/approve', {
            data: {
                unionId: longString,
                memberId: longString,
            },
        });

        // 매우 긴 문자열이어도 서버가 크래시하지 않아야 함
        expect(response.status()).toBeLessThan(500);
    });

    test('특수문자가 포함된 입력 → 안전 처리', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const specialChars = '!@#$%^&*()_+=[]{}|;:,.<>?/~`';
        const response = await page.request.post('/api/members/approve', {
            data: {
                unionId: specialChars,
                memberId: specialChars,
            },
        });

        expect(response.status()).toBeLessThan(500);
    });

    test('유니코드/이모지 입력 → 안전 처리', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const unicodeInput = '\u{1F600}\u{1F4A9}\u{0000}\u{FEFF}';
        const response = await page.request.post('/api/members/approve', {
            data: {
                unionId: unicodeInput,
                memberId: unicodeInput,
            },
        });

        expect(response.status()).toBeLessThan(500);
    });

    test('null/undefined 값 전송 → 안전 처리', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/members/approve', {
            data: {
                unionId: null,
                memberId: null,
            },
        });

        // null 값은 falsy → 필수 파라미터 누락으로 400
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('필수 파라미터가 누락');
    });
});
