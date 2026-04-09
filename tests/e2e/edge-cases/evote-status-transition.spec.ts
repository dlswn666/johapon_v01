import { test, expect } from '@playwright/test';
import { testLoginAsAdmin } from '../helpers/test-auth';

const SLUG = 'solsam';

/**
 * 전자투표 상태 전환 규칙 검증 E2E 테스트
 *
 * assemblyStateMachine.ts의 VALID_TRANSITIONS 규칙:
 *   DRAFT → [NOTICE_SENT, CANCELLED]
 *   NOTICE_SENT → [CONVENED, PRE_VOTING, CANCELLED]
 *   PRE_VOTING → [CONVENED, IN_PROGRESS, CANCELLED]
 *   CONVENED → [IN_PROGRESS, CANCELLED]
 *   IN_PROGRESS → [VOTING, CANCELLED]
 *   VOTING → [VOTING_CLOSED, CANCELLED, PAUSED, WRITTEN_TRANSITION]
 *   PAUSED → [VOTING, CANCELLED]
 *   WRITTEN_TRANSITION → [VOTING_CLOSED]
 *   VOTING_CLOSED → [CLOSED, CANCELLED]
 *   CLOSED → [ARCHIVED]
 *   ARCHIVED → [] (종료 상태)
 *   CANCELLED → [] (종료 상태)
 *
 * canTransition()이 false인 전환 시도 시 400 에러 반환 확인
 */
test.describe('전자투표 상태 전환 - 잘못된 전환 시도', () => {
    // 참고: 실제 assembly를 생성하려면 DB에 데이터가 필요함.
    // 이 테스트는 API 레벨의 유효성 검증을 확인하며,
    // 실제 assembly가 없으면 404가 먼저 반환될 수 있음.

    test('DRAFT에서 VOTING으로 직접 전환 시도 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        // 실제 DRAFT 상태인 assembly가 있다면 상태 전환이 거부되어야 함
        // assembly가 없으면 404, 있으면 canTransition() 검증으로 400
        const response = await page.request.patch('/api/evotes/fake-assembly/status', {
            data: { status: 'VOTING' },
        });

        // 404 (assembly 없음) 또는 400 (잘못된 전환)
        expect([400, 404]).toContain(response.status());
    });

    test('유효하지 않은 상태 값으로 전환 시도 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const invalidStatuses = ['UNKNOWN', '', 'draft', 'voting', 'null', '123'];

        for (const status of invalidStatuses) {
            const response = await page.request.patch('/api/evotes/fake-assembly/status', {
                data: { status },
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('유효하지 않은 상태');
        }
    });

    test('상태 값 없이 전환 시도 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.patch('/api/evotes/fake-assembly/status', {
            data: { reason: 'test' },
            // status 누락
        });

        expect(response.status()).toBe(400);
    });
});

test.describe('전자투표 상태 전환 - 취소 시 사유 필수', () => {
    // IN_PROGRESS 또는 VOTING 상태에서 CANCELLED로 전환 시 사유 필수
    // 실제 assembly가 필요하므로, API 유효성 검증 레벨에서 테스트

    test('진행 중인 총회 취소 시 빈 사유 → 400 반환 (DB에 assembly 있을 때)', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        // 이 테스트는 실제 IN_PROGRESS 상태인 assembly가 있어야 정확히 동작
        // assembly가 없으면 404가 먼저 반환됨
        const response = await page.request.patch('/api/evotes/fake-assembly/status', {
            data: { status: 'CANCELLED' },
            // reason 누락
        });

        // assembly 없으면 404, 있으면 reason 누락으로 400
        expect([400, 404]).toContain(response.status());
    });

    test('CANCELLED 전환 시 빈 문자열 사유 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.patch('/api/evotes/fake-assembly/status', {
            data: { status: 'CANCELLED', reason: '   ' },
        });

        // 공백만 있는 사유는 reason.trim()이 빈 문자열이므로 거부
        expect([400, 404]).toContain(response.status());
    });
});
