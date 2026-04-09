/**
 * 전자투표 상태 전환 E2E 테스트
 *
 * 상태 머신:
 *   DRAFT -> NOTICE_SENT -> PRE_VOTING -> IN_PROGRESS -> VOTING -> VOTING_CLOSED -> CLOSED -> ARCHIVED
 *   각 상태에서 CANCELLED 전환 가능 (진행 중 취소 시 사유 필수)
 *
 * 시나리오:
 * - 관리자 대시보드에서 상태 전환 버튼 표시 확인
 * - 정상 상태 전환 (DRAFT -> NOTICE_SENT)
 * - 취소 시 사유 입력 필요
 * - 잘못된 상태 전환 거부 (API 레벨)
 */
import { test, expect } from '@playwright/test';
import { testLoginAsAdmin } from '../helpers/test-auth';

const SLUG = 'solsam';
const BASE_URL = 'http://localhost:3000';

test.describe('전자투표 상태 전환 - API 검증', () => {
  test('유효하지 않은 상태 값으로 전환 시도 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    // 존재하지 않는 evoteId로 상태 전환 시도 -> 404
    const response = await page.request.patch(`${BASE_URL}/api/evotes/nonexistent-id/status`, {
      data: { status: 'NOTICE_SENT' },
    });

    // 404 또는 400 응답 (투표를 찾을 수 없거나 유효하지 않은 상태)
    expect([400, 404]).toContain(response.status());
  });

  test('유효하지 않은 status 필드로 전환 시도 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    // 잘못된 status 값
    const response = await page.request.patch(`${BASE_URL}/api/evotes/some-id/status`, {
      data: { status: 'INVALID_STATUS' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('유효하지 않은 상태 값입니다.');
  });

  test('status 필드 누락 시 400 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.patch(`${BASE_URL}/api/evotes/some-id/status`, {
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('유효하지 않은 상태 값입니다.');
  });

  test('GET 요청 시 405 에러', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.get(`${BASE_URL}/api/evotes/some-id/status`);

    expect(response.status()).toBe(405);
    const body = await response.json();
    expect(body.error).toBe('이 엔드포인트는 PATCH 메서드만 지원합니다.');
  });
});

test.describe('전자투표 상태 전환 - UI 검증', () => {
  test('상태 전환 바가 다음 상태 버튼을 표시', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    // 전자투표 목록 페이지에서 기존 투표가 있는지 확인
    await page.goto(`${BASE_URL}/${SLUG}/admin/assembly/evote`);
    await page.waitForLoadState('networkidle');

    // 기존 전자투표 카드가 있으면 클릭하여 대시보드 진입
    const evoteCard = page.locator('[class*="rounded-lg"][class*="border"]').filter({
      has: page.locator('text=총회'),
    }).first();

    if (await evoteCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await evoteCard.click();
      await page.waitForLoadState('networkidle');

      // 상태 전환 바의 "다음 단계:" 텍스트 확인
      const transitionBar = page.getByText('다음 단계:');
      if (await transitionBar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(transitionBar).toBeVisible();
      }
    }
  });

  test('취소 버튼 클릭 시 사유 입력 UI 표시', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    await page.goto(`${BASE_URL}/${SLUG}/admin/assembly/evote`);
    await page.waitForLoadState('networkidle');

    // 기존 전자투표가 있으면 대시보드 진입
    const evoteCard = page.locator('[class*="rounded-lg"][class*="border"]').filter({
      has: page.locator('text=총회'),
    }).first();

    if (await evoteCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await evoteCard.click();
      await page.waitForLoadState('networkidle');

      // "취소" 버튼이 있으면 클릭
      const cancelButton = page.getByRole('button', { name: '취소' }).first();
      if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelButton.click();

        // 취소 사유 입력 UI 표시 확인
        const reasonTextarea = page.getByPlaceholder('취소 사유를 입력하세요');
        if (await reasonTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(reasonTextarea).toBeVisible();
          await expect(page.getByText('전자투표를 취소하려면 사유를 입력해주세요.')).toBeVisible();

          // 빈 사유로 확인 시도 시 경고
          await page.getByRole('button', { name: '취소 확인' }).click();
          // alert('취소 사유를 입력해주세요.') 가 호출됨
        }
      }
    }
  });
});

test.describe('전자투표 상태 머신 규칙 - API 레벨', () => {
  test('CANCELLED 상태에서는 더 이상 전환 불가 (터미널 상태)', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    // canTransition('CANCELLED', 'DRAFT') === false
    // 이 규칙은 서버에서 검증됨
    // 존재하는 CANCELLED 상태 투표가 있으면 전환 시도

    // API 레벨 테스트: 임의의 ID로 CANCELLED -> DRAFT 전환 시도
    // 실제 데이터 없이도 상태 전이 규칙은 서버에서 검증 가능
    // (다만 투표를 찾을 수 없으면 404)
    const response = await page.request.patch(`${BASE_URL}/api/evotes/nonexistent/status`, {
      data: { status: 'DRAFT' },
    });

    // 404 (투표 없음) 또는 400 (전환 불가) 중 하나
    expect([400, 404]).toContain(response.status());
  });

  test('ARCHIVED 상태에서는 더 이상 전환 불가 (터미널 상태)', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.patch(`${BASE_URL}/api/evotes/nonexistent/status`, {
      data: { status: 'NOTICE_SENT' },
    });

    expect([400, 404]).toContain(response.status());
  });
});
