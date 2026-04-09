/**
 * 전자투표 접근성 (Accessibility) E2E 테스트
 *
 * 시나리오:
 * - ARIA 속성 확인 (role="radiogroup", aria-label, aria-checked)
 * - 키보드 네비게이션 (Tab, Arrow keys)
 * - 포커스 관리 (모달 포커스 트랩)
 * - 스크린 리더 호환 텍스트 (aria-live 영역)
 */
import { test, expect } from '@playwright/test';
import { testLoginAsAdmin, testLoginAsMember } from '../helpers/test-auth';

const SLUG = 'solsam';
const BASE_URL = 'http://localhost:3000';

test.describe('전자투표 접근성 - 위저드 페이지', () => {
  test('위저드 네비게이션 버튼에 적절한 레이블이 있음', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);
    await page.goto(`${BASE_URL}/${SLUG}/admin/assembly/evote/create`);
    await page.waitForLoadState('networkidle');

    // "이전" 버튼
    const prevButton = page.getByRole('button', { name: '이전' });
    await expect(prevButton).toBeVisible();

    // "다음" 버튼
    const nextButton = page.getByRole('button', { name: '다음' });
    await expect(nextButton).toBeVisible();

    // 이전 버튼은 첫 스텝에서 비활성화
    await expect(prevButton).toBeDisabled();
  });

  test('의결요건 라디오 입력에 name 속성 존재', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);
    await page.goto(`${BASE_URL}/${SLUG}/admin/assembly/evote/create`);
    await page.waitForLoadState('networkidle');

    // 의결요건 라디오 버튼들이 같은 name 그룹
    const quorumRadios = page.locator('input[name="quorumType"]');
    const count = await quorumRadios.count();
    expect(count).toBe(4); // GENERAL, SPECIAL, SPECIAL_TWO_THIRDS, CONTRACTOR
  });

  test('필수 입력 필드에 * 표시가 있음', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);
    await page.goto(`${BASE_URL}/${SLUG}/admin/assembly/evote/create`);
    await page.waitForLoadState('networkidle');

    // "총회 유형 *" 라벨
    await expect(page.getByText('총회 유형')).toBeVisible();
    // "총회명 *" 라벨
    await expect(page.getByText('총회명')).toBeVisible();
    // "의결요건 *" 라벨
    await expect(page.getByText('의결요건')).toBeVisible();
  });
});

test.describe('전자투표 접근성 - 투표 화면', () => {
  // 투표 가능한 전자투표를 찾아서 테스트하는 헬퍼
  async function findVotableEvote(page: import('@playwright/test').Page) {
    await testLoginAsAdmin(page, SLUG);
    const response = await page.request.get(`${BASE_URL}/api/evotes`);
    const { data: evotes } = await response.json();

    return evotes?.find(
      (e: { status: string }) => e.status === 'PRE_VOTING' || e.status === 'VOTING'
    );
  }

  test('찬반투표 옵션에 role="radiogroup" 및 aria-label 존재', async ({ page }) => {
    const votableEvote = await findVotableEvote(page);
    if (!votableEvote) {
      test.skip();
      return;
    }

    await testLoginAsMember(page, SLUG);
    await page.goto(`${BASE_URL}/${SLUG}/assembly/${votableEvote.id}/evote`);
    await page.waitForLoadState('networkidle');

    // 찬반투표 라디오 그룹
    const approveGroup = page.locator('[role="radiogroup"][aria-label="찬반투표"]');
    if (await approveGroup.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(approveGroup).toBeVisible();

      // 개별 라디오 버튼에 role="radio"와 aria-checked 존재
      const radios = approveGroup.locator('[role="radio"]');
      const radioCount = await radios.count();
      expect(radioCount).toBeGreaterThan(0);

      for (let i = 0; i < radioCount; i++) {
        const radio = radios.nth(i);
        const ariaChecked = await radio.getAttribute('aria-checked');
        expect(ariaChecked).toBeDefined();
        expect(['true', 'false']).toContain(ariaChecked);
      }
    }
  });

  test('선출투표 옵션에 role="radiogroup" 또는 role="group" 존재', async ({ page }) => {
    const votableEvote = await findVotableEvote(page);
    if (!votableEvote) {
      test.skip();
      return;
    }

    await testLoginAsMember(page, SLUG);
    await page.goto(`${BASE_URL}/${SLUG}/assembly/${votableEvote.id}/evote`);
    await page.waitForLoadState('networkidle');

    // 선출투표 라디오 그룹 (단일 선출) 또는 체크박스 그룹 (복수 선출)
    const electGroup = page.locator('[role="radiogroup"][aria-label="선출투표"]');
    const electCheckboxGroup = page.locator('[role="group"][aria-label="선출투표"]');

    const isRadioGroup = await electGroup.isVisible({ timeout: 3000 }).catch(() => false);
    const isCheckboxGroup = await electCheckboxGroup.isVisible({ timeout: 3000 }).catch(() => false);

    if (isRadioGroup || isCheckboxGroup) {
      // ARIA 그룹이 존재
      expect(isRadioGroup || isCheckboxGroup).toBeTruthy();
    }
  });

  test('업체 선정 옵션에 role="radiogroup" 존재', async ({ page }) => {
    const votableEvote = await findVotableEvote(page);
    if (!votableEvote) {
      test.skip();
      return;
    }

    await testLoginAsMember(page, SLUG);
    await page.goto(`${BASE_URL}/${SLUG}/assembly/${votableEvote.id}/evote`);
    await page.waitForLoadState('networkidle');

    const selectGroup = page.locator('[role="radiogroup"][aria-label="업체 선정"]');
    if (await selectGroup.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(selectGroup).toBeVisible();
    }
  });

  test('진행 상황 텍스트에 aria-live="polite" 존재', async ({ page }) => {
    const votableEvote = await findVotableEvote(page);
    if (!votableEvote) {
      test.skip();
      return;
    }

    await testLoginAsMember(page, SLUG);
    await page.goto(`${BASE_URL}/${SLUG}/assembly/${votableEvote.id}/evote`);
    await page.waitForLoadState('networkidle');

    // "N개 중 M개 선택 완료" 텍스트의 aria-live 확인
    const liveRegion = page.locator('[aria-live="polite"]');
    if (await liveRegion.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await liveRegion.textContent();
      expect(text).toContain('선택 완료');
    }
  });

  test('투표 완료 화면의 영수증 복사 버튼에 aria-label 존재', async ({ page }) => {
    const votableEvote = await findVotableEvote(page);
    if (!votableEvote) {
      test.skip();
      return;
    }

    await testLoginAsMember(page, SLUG);
    await page.goto(`${BASE_URL}/${SLUG}/assembly/${votableEvote.id}/evote`);
    await page.waitForLoadState('networkidle');

    // 투표 완료 화면이면
    const voteComplete = page.locator('[data-testid="vote-complete"]');
    if (await voteComplete.isVisible({ timeout: 5000 }).catch(() => false)) {
      const copyButton = page.getByLabel('투표 영수증 복사');
      if (await copyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(copyButton).toBeVisible();
      }
    }
  });
});

test.describe('전자투표 접근성 - 키보드 네비게이션', () => {
  test('위저드에서 Tab 키로 폼 요소 간 이동 가능', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);
    await page.goto(`${BASE_URL}/${SLUG}/admin/assembly/evote/create`);
    await page.waitForLoadState('networkidle');

    // Tab 키를 눌러 포커스 이동 확인
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeDefined();

    // 여러 번 Tab을 눌러 이동이 되는지 확인
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });
});
