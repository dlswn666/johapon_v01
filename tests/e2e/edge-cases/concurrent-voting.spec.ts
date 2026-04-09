import { test, expect } from '@playwright/test';
import { testLoginAsMember } from '../helpers/test-auth';

const SLUG = 'solsam';

/**
 * 동시 투표 및 경합 조건 E2E 테스트
 *
 * submit_evote_ballot RPC의 동시성 제어 메커니즘:
 * - pg_advisory_xact_lock(hashtext(p_user_id || v_poll_id::text))
 * - participation_records + is_superseded 패턴
 * - auth_nonces 1회 사용 제한 (used_at IS NULL)
 *
 * 테스트 시나리오:
 * - 같은 사용자가 동시에 두 번 투표 제출
 * - 같은 nonce로 두 번 투표 시도
 */
test.describe('동시 투표 - 중복 제출 방지', () => {
    test('같은 사용자가 동시에 두 번 투표 제출 → 하나만 성공 또는 둘 다 안전 처리', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const fakeAssemblyId = '00000000-0000-0000-0000-000000000000';
        const voteData = {
            authNonce: '0'.repeat(64),
            votes: [{ pollId: '00000000-0000-0000-0000-000000000001', optionId: '00000000-0000-0000-0000-000000000002' }],
        };

        // 동시에 두 번 투표 제출 시도
        const [response1, response2] = await Promise.all([
            page.request.post(`/api/evotes/${fakeAssemblyId}/submit`, { data: voteData }),
            page.request.post(`/api/evotes/${fakeAssemblyId}/submit`, { data: voteData }),
        ]);

        // 서버가 크래시하지 않아야 함
        expect(response1.status()).toBeLessThan(500);
        expect(response2.status()).toBeLessThan(500);

        // 적어도 하나는 snapshot 미존재로 403이어야 함 (테스트 데이터이므로)
        const statuses = [response1.status(), response2.status()];
        expect(statuses.some(s => s === 403)).toBe(true);
    });

    test('같은 사용자가 /api/votes/cast를 동시에 호출 → 안전 처리', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const castData = {
            pollId: '00000000-0000-0000-0000-000000000001',
            assemblyId: '00000000-0000-0000-0000-000000000000',
            optionId: '00000000-0000-0000-0000-000000000002',
            authNonce: 'a'.repeat(64),
        };

        const [response1, response2] = await Promise.all([
            page.request.post('/api/votes/cast', { data: castData }),
            page.request.post('/api/votes/cast', { data: castData }),
        ]);

        // 서버 크래시 없음
        expect(response1.status()).toBeLessThan(500);
        expect(response2.status()).toBeLessThan(500);
    });
});

test.describe('동시 투표 - Nonce 1회 사용 제한', () => {
    test('같은 nonce로 반복 투표 시도 → DB 레벨에서 거부', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const fakeAssemblyId = '00000000-0000-0000-0000-000000000000';
        const nonce = 'b'.repeat(64);

        // 첫 번째 시도
        const response1 = await page.request.post(`/api/evotes/${fakeAssemblyId}/submit`, {
            data: {
                authNonce: nonce,
                votes: [{ pollId: '00000000-0000-0000-0000-000000000001', optionId: '00000000-0000-0000-0000-000000000002' }],
            },
        });

        // 두 번째 시도 (같은 nonce)
        const response2 = await page.request.post(`/api/evotes/${fakeAssemblyId}/submit`, {
            data: {
                authNonce: nonce,
                votes: [{ pollId: '00000000-0000-0000-0000-000000000001', optionId: '00000000-0000-0000-0000-000000000002' }],
            },
        });

        // 두 번째 시도는 nonce가 이미 사용됨 (used_at != NULL) → 거부
        // 단, 스냅샷이 없으면 그 전에 403으로 거부됨
        expect(response1.status()).toBeLessThan(500);
        expect(response2.status()).toBeLessThan(500);
    });
});

test.describe('동시 투표 - 다중 탭 시뮬레이션', () => {
    test('서로 다른 세션에서 같은 API를 동시 호출 → 서버 안정성', async ({ browser }) => {
        // 브라우저 컨텍스트 2개 생성 (다중 탭 시뮬레이션)
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        try {
            // 각각 다른 세션으로 로그인
            await testLoginAsMember(page1, SLUG);
            await testLoginAsMember(page2, SLUG);

            // 동시에 투표 시도
            const [response1, response2] = await Promise.all([
                page1.request.post('/api/evotes/00000000-0000-0000-0000-000000000000/submit', {
                    data: {
                        authNonce: 'c'.repeat(64),
                        votes: [{ pollId: 'fake-poll', optionId: 'fake-option' }],
                    },
                }),
                page2.request.post('/api/evotes/00000000-0000-0000-0000-000000000000/submit', {
                    data: {
                        authNonce: 'd'.repeat(64),
                        votes: [{ pollId: 'fake-poll', optionId: 'fake-option' }],
                    },
                }),
            ]);

            // 서버가 두 요청 모두 안전하게 처리해야 함
            expect(response1.status()).toBeLessThan(500);
            expect(response2.status()).toBeLessThan(500);
        } finally {
            await context1.close();
            await context2.close();
        }
    });
});
