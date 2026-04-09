/**
 * 전자투표 생성 API E2E 테스트
 *
 * POST /api/evotes 의 유효성 검증을 테스트
 *
 * 시나리오:
 * - 필수 필드 누락 시 에러 메시지 확인
 * - 날짜 순서 검증 (사전투표 시작 > 마감, 마감 > 총회일)
 * - 안건별 유효성 (ELECT에 후보자 필요, SELECT에 업체 필요)
 * - 비인증 사용자 접근 거부
 */
import { test, expect } from '@playwright/test';
import { testLoginAsAdmin, testLoginAsMember } from '../helpers/test-auth';

const SLUG = 'solsam';
const BASE_URL = 'http://localhost:3000';

// 유효한 기본 요청 바디 팩토리
function validEvoteBody(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  const preVoteStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const preVoteEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const scheduledAt = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString();

  return {
    title: 'E2E 테스트 투표',
    assembly_type: 'REGULAR',
    quorum_type: 'GENERAL',
    scheduled_at: scheduledAt,
    pre_vote_start_at: preVoteStart,
    pre_vote_end_at: preVoteEnd,
    publish_mode: 'IMMEDIATE',
    agendas: [
      {
        title: '제1호 안건: 사업계획 승인',
        description: 'E2E 테스트 안건',
        vote_type: 'APPROVE',
      },
    ],
    selected_voter_ids: ['test_u01'], // 실제 존재하는 사용자 ID 필요
    ...overrides,
  };
}

test.describe('전자투표 생성 API - 필수 필드 검증', () => {
  test('제목 누락 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({ title: '' }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('총회 제목을 입력해주세요.');
  });

  test('총회 일시 누락 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({ scheduled_at: null }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('총회 일시를 설정해주세요.');
  });

  test('안건 누락 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({ agendas: [] }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('최소 1개 이상의 안건이 필요합니다.');
  });

  test('투표 대상자 누락 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({ selected_voter_ids: [] }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('최소 1명 이상의 투표 대상자를 선택해주세요.');
  });

  test('사전투표 기간 누락 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({ pre_vote_start_at: null }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('사전투표 기간을 설정해주세요.');
  });
});

test.describe('전자투표 생성 API - 날짜 순서 검증', () => {
  test('사전투표 시작일이 마감일보다 늦으면 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const lateStart = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString();
    const earlyEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({
        scheduled_at: scheduledAt,
        pre_vote_start_at: lateStart,
        pre_vote_end_at: earlyEnd,
      }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('사전투표 시작일은 마감일보다 빨라야 합니다.');
  });

  test('사전투표 마감일이 총회일 이후이면 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const preVoteStart = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const preVoteEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(); // 총회일 이후

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({
        scheduled_at: scheduledAt,
        pre_vote_start_at: preVoteStart,
        pre_vote_end_at: preVoteEnd,
      }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('사전투표 마감일은 총회일 이전이어야 합니다.');
  });
});

test.describe('전자투표 생성 API - 안건별 검증', () => {
  test('안건 제목 빈 문자열 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({
        agendas: [{ title: '', vote_type: 'APPROVE' }],
      }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('안건 제목은 필수입니다.');
  });

  test('ELECT 유형에 후보자 없으면 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({
        agendas: [{
          title: '임원 선출',
          vote_type: 'ELECT',
          elect_count: 1,
          candidates: [],
        }],
      }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('후보자를 1명 이상 등록해주세요.');
  });

  test('ELECT 유형에 elect_count 0이면 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({
        agendas: [{
          title: '임원 선출',
          vote_type: 'ELECT',
          elect_count: 0,
          candidates: [{ name: '홍길동', info: '현직 감사' }],
        }],
      }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('선출 인원수를 1명 이상 설정해주세요.');
  });

  test('SELECT 유형에 업체 없으면 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({
        agendas: [{
          title: '시공사 선정',
          vote_type: 'SELECT',
          companies: [],
        }],
      }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('업체를 1개 이상 등록해주세요.');
  });
});

test.describe('전자투표 생성 API - 게시 방식 검증', () => {
  test('SCHEDULED 모드에서 예약 시각 누락 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody({
        publish_mode: 'SCHEDULED',
        publish_at: null,
      }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('예약 게시 시각을 설정해주세요.');
  });
});

test.describe('전자투표 생성 API - 권한 검증', () => {
  test('비인증 사용자 접근 시 401 에러', async ({ page }) => {
    // 로그인 없이 API 호출
    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody(),
    });

    // 인증 실패 (401 또는 403)
    expect([401, 403]).toContain(response.status());
  });

  test('조합원 (비관리자) 접근 시 403 에러', async ({ page }) => {
    await testLoginAsMember(page, SLUG);

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: validEvoteBody(),
    });

    // 관리자 권한 필요 (403)
    expect([401, 403]).toContain(response.status());
  });
});
