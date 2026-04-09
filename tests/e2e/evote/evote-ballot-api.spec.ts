/**
 * 전자투표 투표용지 조회 및 투표 제출 API E2E 테스트
 *
 * 시나리오:
 * - GET /api/evotes/[id]/ballot: 투표용지 조회
 * - POST /api/evotes/[id]/submit: 투표 제출
 * - 권한 검증 (스냅샷 없는 사용자, 본인인증 미완료)
 * - dev 모드에서 auth_nonce 자동 우회
 */
import { test, expect } from '@playwright/test';
import { testLoginAsAdmin, testLoginAsMember } from '../helpers/test-auth';

const SLUG = 'solsam';
const BASE_URL = 'http://localhost:3000';

test.describe('투표용지 조회 API (GET /api/evotes/[id]/ballot)', () => {
  test('비인증 사용자 접근 시 인증 에러', async ({ page }) => {
    // 로그인 없이 투표용지 조회 시도
    const response = await page.request.get(`${BASE_URL}/api/evotes/nonexistent-id/ballot`);

    // 401 또는 403 응답
    expect([401, 403]).toContain(response.status());
  });

  test('존재하지 않는 투표 ID로 조회 시 404 또는 403 에러', async ({ page }) => {
    await testLoginAsMember(page, SLUG);

    const response = await page.request.get(`${BASE_URL}/api/evotes/nonexistent-id/ballot`);

    // 총회를 찾을 수 없거나 (404), 스냅샷 없음 (403)
    expect([403, 404]).toContain(response.status());
  });
});

test.describe('투표 제출 API (POST /api/evotes/[id]/submit)', () => {
  test('비인증 사용자 제출 시 인증 에러', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/evotes/nonexistent-id/submit`, {
      data: {
        authNonce: '0'.repeat(64),
        votes: [{ pollId: 'poll-1', optionId: 'opt-1' }],
      },
    });

    expect([401, 403]).toContain(response.status());
  });

  test('투표 항목이 빈 배열이면 400 에러', async ({ page }) => {
    await testLoginAsMember(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes/some-assembly-id/submit`, {
      data: {
        authNonce: '0'.repeat(64),
        votes: [],
      },
    });

    // 빈 votes 배열 -> 400
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('투표 항목이 누락되었습니다.');
  });

  test('votes 필드 누락 시 400 에러', async ({ page }) => {
    await testLoginAsMember(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes/some-assembly-id/submit`, {
      data: {
        authNonce: '0'.repeat(64),
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('투표 항목이 누락되었습니다.');
  });

  test('스냅샷이 없는 사용자가 투표 제출 시 403 에러', async ({ page }) => {
    await testLoginAsMember(page, SLUG);

    // 실제 assembly ID가 아닌 랜덤 ID로 제출 시도
    // -> 스냅샷 조회 실패 -> 403
    const response = await page.request.post(`${BASE_URL}/api/evotes/nonexistent-assembly/submit`, {
      data: {
        authNonce: '0'.repeat(64),
        votes: [{ pollId: 'poll-1', optionId: 'opt-1' }],
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('투표 권한이 없습니다');
  });
});

test.describe('투표 대상자 목록 API (GET /api/evotes/[id]/voters)', () => {
  test('비인증 사용자 접근 시 인증 에러', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/evotes/some-id/voters`);

    expect([401, 403]).toContain(response.status());
  });

  test('비관리자 접근 시 403 에러', async ({ page }) => {
    await testLoginAsMember(page, SLUG);

    const response = await page.request.get(`${BASE_URL}/api/evotes/some-id/voters`);

    // 관리자 권한 필요
    expect([401, 403]).toContain(response.status());
  });

  test('관리자가 존재하지 않는 투표 조회 시 404 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.get(`${BASE_URL}/api/evotes/nonexistent-id/voters`);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('전자투표를 찾을 수 없습니다.');
  });

  test('잘못된 filter 값 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.get(
      `${BASE_URL}/api/evotes/some-id/voters?filter=INVALID`
    );

    // filter 검증은 투표 존재 확인 이전에 수행되므로 400 또는 404
    expect([400, 404]).toContain(response.status());
  });

  test('유효한 filter 값 (ALL, VOTED, NOT_VOTED) 허용', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    // 존재하지 않는 ID이므로 404이지만, filter 값 자체는 유효
    for (const filter of ['ALL', 'VOTED', 'NOT_VOTED']) {
      const response = await page.request.get(
        `${BASE_URL}/api/evotes/nonexistent-id/voters?filter=${filter}`
      );
      // filter는 유효하므로 400이 아닌 404
      expect(response.status()).toBe(404);
    }
  });
});

test.describe('전자투표 목록 API (GET /api/evotes)', () => {
  test('비인증 사용자 접근 시 인증 에러', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/evotes`);

    expect([401, 403]).toContain(response.status());
  });

  test('비관리자 접근 시 403 에러', async ({ page }) => {
    await testLoginAsMember(page, SLUG);

    const response = await page.request.get(`${BASE_URL}/api/evotes`);

    expect([401, 403]).toContain(response.status());
  });

  test('관리자 접근 시 200 응답 및 배열 반환', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.get(`${BASE_URL}/api/evotes`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('status 필터링 동작', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.get(`${BASE_URL}/api/evotes?status=DRAFT`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBeTruthy();

    // 반환된 모든 항목의 status가 DRAFT인지 확인
    for (const item of body.data) {
      expect(item.status).toBe('DRAFT');
    }
  });

  test('search 필터링 동작', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.get(`${BASE_URL}/api/evotes?search=테스트`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBeTruthy();
  });
});
