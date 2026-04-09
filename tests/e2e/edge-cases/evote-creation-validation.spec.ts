import { test, expect } from '@playwright/test';
import { testLoginAsAdmin } from '../helpers/test-auth';

const SLUG = 'solsam';

/**
 * 전자투표 생성 검증 E2E 테스트
 *
 * POST /api/evotes API의 필수 필드 및 비즈니스 규칙 검증:
 * - 제목 누락/공백
 * - 총회 일시 누락
 * - 안건 없음
 * - 투표 대상자 없음
 * - 사전투표 기간 누락/역전
 * - 안건별 세부 검증 (선출/선정 인원수, 후보자/업체)
 */
test.describe('전자투표 생성 - 필수 필드 검증', () => {
    test('제목 없이 생성 시도 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '',
                scheduled_at: new Date().toISOString(),
                agendas: [{ title: '안건1' }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('총회 제목을 입력');
    });

    test('공백만 있는 제목으로 생성 시도 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '   ',
                scheduled_at: new Date().toISOString(),
                agendas: [{ title: '안건1' }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('총회 제목을 입력');
    });

    test('총회 일시 없이 생성 시도 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                // scheduled_at 누락
                agendas: [{ title: '안건1' }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('총회 일시를 설정');
    });

    test('안건 없이 생성 시도 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('최소 1개 이상의 안건');
    });

    test('투표 대상자 없이 생성 시도 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [{ title: '안건1' }],
                selected_voter_ids: [],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('최소 1명 이상의 투표 대상자');
    });

    test('사전투표 기간 누락 시 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [{ title: '안건1' }],
                selected_voter_ids: ['test-id'],
                // pre_vote_start_at, pre_vote_end_at 누락
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('사전투표 기간');
    });
});

test.describe('전자투표 생성 - 날짜 순서 검증', () => {
    test('사전투표 시작일이 마감일보다 늦을 때 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [{ title: '안건1' }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-10T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z', // 시작일보다 이전
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('사전투표 시작일은 마감일보다');
    });

    test('사전투표 마감일이 총회일 이후일 때 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-04-10T10:00:00Z',
                agendas: [{ title: '안건1' }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-15T00:00:00Z', // 총회일 이후
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('사전투표 마감일은 총회일 이전');
    });

    test('사전투표 시작일과 마감일이 동일할 때 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const sameDate = '2026-04-05T00:00:00Z';
        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [{ title: '안건1' }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: sameDate,
                pre_vote_end_at: sameDate,
            },
        });

        // pre_vote_start_at >= pre_vote_end_at → 400
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('사전투표 시작일은 마감일보다');
    });
});

test.describe('전자투표 생성 - 안건별 세부 검증', () => {
    test('안건 제목이 비어있을 때 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [{ title: '' }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('안건 제목은 필수');
    });

    test('선출 안건에 elect_count가 0일 때 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [{
                    title: '임원 선출',
                    vote_type: 'ELECT',
                    elect_count: 0,
                    candidates: [{ name: '후보1', info: '' }],
                }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('선출 인원수를 1명 이상');
    });

    test('선출 안건에 후보자가 없을 때 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [{
                    title: '임원 선출',
                    vote_type: 'ELECT',
                    elect_count: 2,
                    candidates: [],
                }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('후보자를 1명 이상');
    });

    test('선정 안건에 업체가 없을 때 → 400 반환', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '테스트 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [{
                    title: '시공사 선정',
                    vote_type: 'SELECT',
                    companies: [],
                }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('업체를 1개 이상');
    });
});
