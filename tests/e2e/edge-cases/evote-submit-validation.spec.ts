import { test, expect } from '@playwright/test';
import { testLoginAsMember } from '../helpers/test-auth';

const SLUG = 'solsam';

/**
 * 전자투표 제출 검증 E2E 테스트
 *
 * /api/evotes/[id]/submit 및 /api/votes/cast API의 엣지 케이스:
 * - 투표 데이터 누락 / 빈 배열
 * - authNonce 누락 / 형식 오류
 * - assembly_member_snapshots에 없는 사용자의 투표
 * - 본인확인 미완료 사용자의 투표
 * - 개인정보 동의 미완료 사용자의 투표
 * - 위임 상태인 사용자의 투표 (RPC 레벨)
 * - 이미 투표한 사용자의 재투표 (RPC 레벨)
 */
test.describe('투표 제출 - 입력 검증', () => {
    test('투표 항목 누락 시 400 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const response = await page.request.post('/api/evotes/fake-assembly-id/submit', {
            data: {
                authNonce: '0'.repeat(64),
                // votes 누락
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('투표 항목이 누락');
    });

    test('투표 항목이 빈 배열일 때 400 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const response = await page.request.post('/api/evotes/fake-assembly-id/submit', {
            data: {
                authNonce: '0'.repeat(64),
                votes: [],
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('투표 항목이 누락');
    });

    test('votes가 배열이 아닐 때 400 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const response = await page.request.post('/api/evotes/fake-assembly-id/submit', {
            data: {
                authNonce: '0'.repeat(64),
                votes: 'not-an-array',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('투표 항목이 누락');
    });
});

test.describe('투표 제출 - 인증 토큰(authNonce) 검증', () => {
    // 참고: localhost(dev 모드)에서는 nonce 검증이 우회될 수 있음
    // 이 테스트는 프로덕션 모드의 검증 로직을 확인

    test('/api/votes/cast에서 authNonce 누락 시 400 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const response = await page.request.post('/api/votes/cast', {
            data: {
                pollId: 'fake-poll',
                assemblyId: 'fake-assembly',
                optionId: 'fake-option',
                // authNonce 누락
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('본인인증이 필요합니다');
    });

    test('/api/votes/cast에서 잘못된 형식의 authNonce → 400 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const invalidNonces = [
            'short-nonce',                    // 64자 미만
            'x'.repeat(64),                   // hex가 아닌 문자
            '0'.repeat(63),                   // 63자 (1자 부족)
            '0'.repeat(65),                   // 65자 (1자 초과)
            '<script>alert(1)</script>',      // XSS 시도
            "'; DROP TABLE auth_nonces; --",  // SQL 인젝션 시도
        ];

        for (const nonce of invalidNonces) {
            const response = await page.request.post('/api/votes/cast', {
                data: {
                    pollId: 'fake-poll',
                    assemblyId: 'fake-assembly',
                    optionId: 'fake-option',
                    authNonce: nonce,
                },
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('인증 토큰 형식이 올바르지 않습니다');
        }
    });

    test('/api/votes/cast에서 필수 파라미터 누락 시 400 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        // pollId 누락
        const response1 = await page.request.post('/api/votes/cast', {
            data: {
                assemblyId: 'fake-assembly',
                optionId: 'fake-option',
                authNonce: '0'.repeat(64),
            },
        });
        expect(response1.status()).toBe(400);
        const body1 = await response1.json();
        expect(body1.error).toContain('필수 파라미터가 누락');

        // assemblyId 누락
        const response2 = await page.request.post('/api/votes/cast', {
            data: {
                pollId: 'fake-poll',
                optionId: 'fake-option',
                authNonce: '0'.repeat(64),
            },
        });
        expect(response2.status()).toBe(400);

        // optionId 누락
        const response3 = await page.request.post('/api/votes/cast', {
            data: {
                pollId: 'fake-poll',
                assemblyId: 'fake-assembly',
                authNonce: '0'.repeat(64),
            },
        });
        expect(response3.status()).toBe(400);
    });
});

test.describe('투표 제출 - 스냅샷 기반 투표 자격 검증', () => {
    test('assembly_member_snapshots에 없는 사용자의 투표 → 403 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        // 존재하지 않는 assembly에 투표 시도
        // → snapshot 조회 실패 → '투표 권한이 없습니다' 403
        const response = await page.request.post('/api/evotes/00000000-0000-0000-0000-000000000000/submit', {
            data: {
                authNonce: '0'.repeat(64),
                votes: [{ pollId: 'fake-poll', optionId: 'fake-option' }],
            },
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.error).toContain('투표 권한이 없습니다');
    });

    test('/api/votes/cast에서 스냅샷 없는 사용자 투표 → 403 반환', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const response = await page.request.post('/api/votes/cast', {
            data: {
                pollId: '00000000-0000-0000-0000-000000000000',
                assemblyId: '00000000-0000-0000-0000-000000000000',
                optionId: '00000000-0000-0000-0000-000000000000',
                authNonce: '0'.repeat(64),
            },
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.error).toContain('투표 권한이 없습니다');
    });
});

test.describe('투표 제출 - 비인증 사용자', () => {
    test('비인증 사용자의 투표 제출 → 401 반환', async ({ request }) => {
        const response = await request.post('/api/evotes/fake-assembly/submit', {
            data: {
                authNonce: '0'.repeat(64),
                votes: [{ pollId: 'fake-poll', optionId: 'fake-option' }],
            },
        });

        expect(response.status()).toBe(401);
    });

    test('비인증 사용자의 개별 투표 → 401 반환', async ({ request }) => {
        const response = await request.post('/api/votes/cast', {
            data: {
                pollId: 'fake-poll',
                assemblyId: 'fake-assembly',
                optionId: 'fake-option',
                authNonce: '0'.repeat(64),
            },
        });

        expect(response.status()).toBe(401);
    });
});
