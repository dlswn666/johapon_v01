/**
 * E2E 테스트 공통 헬퍼
 * - solsam 조합 대상
 * - localhost:3000 dev 환경 (RLS 우회, SYSTEM_ADMIN 자동 로그인)
 */
import { Page, expect } from '@playwright/test';

export const BASE_URL = 'http://localhost:3000';
export const UNION_SLUG = 'solsam';
export const UNION_ID = '7c35ee21-34fc-4597-84db-ee63e5b0d351';
export const TEST_PREFIX = '[E2E-TEST]';

/** 조합 페이지로 이동 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(`${BASE_URL}/${UNION_SLUG}${path}`, { waitUntil: 'networkidle' });
}

/** 페이지 로딩 대기 (로딩 스피너 사라질 때까지) */
export async function waitForPageLoad(page: Page) {
  // 로딩 인디케이터가 있으면 사라질 때까지 대기
  await page.waitForLoadState('networkidle');
  // 추가 렌더링 시간
  await page.waitForTimeout(1000);
}

/** 테스트 데이터 생성용 유니크 ID */
export function uniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 테스트 제목 생성 */
export function testTitle(board: string) {
  return `${TEST_PREFIX} ${board} 테스트 ${uniqueId()}`;
}

/** 테스트 내용 생성 */
export function testContent(board: string) {
  return `${TEST_PREFIX} ${board} 테스트 본문입니다. 자동화 테스트에서 생성되었습니다. ID: ${uniqueId()}`;
}

/** 스크린샷 저장 */
export async function saveScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `tests/e2e/screenshots/${name}.png`, fullPage: true });
}

/** 요소가 보일 때까지 대기 후 클릭 */
export async function waitAndClick(page: Page, selector: string, options?: { timeout?: number }) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: options?.timeout ?? 10000 });
  await el.click();
}

/** 텍스트를 포함하는 요소 찾기 */
export async function findByText(page: Page, text: string) {
  return page.locator(`text=${text}`).first();
}

/**
 * Radix Dialog 확인 버튼 클릭
 *
 * Radix UI Dialog는 dev 환경(React StrictMode)에서 2개의 [role="dialog"] DOM을 렌더링함:
 *   - 첫 번째: 이벤트 핸들러가 있는 실제 다이얼로그 (aria-hidden으로 가려짐)
 *   - 두 번째: 보이지만 핸들러가 없는 복사본
 * force: true로 첫 번째(핸들러 있는) 버튼을 클릭
 */
export async function clickDialogButton(page: Page, buttonText: string, timeout = 30000) {
  // 다이얼로그가 나타날 때까지 대기
  const btn = page.locator(`[role="dialog"] button`, { hasText: buttonText }).first();
  await btn.waitFor({ state: 'attached', timeout });
  await page.waitForTimeout(500); // 애니메이션 안정화
  await btn.click({ force: true });
}

/** 다이얼로그 텍스트 확인 */
export async function expectDialogText(page: Page, text: string, timeout = 30000) {
  await expect(page.locator(`[role="dialog"]`).locator(`text=${text}`).first()).toBeVisible({ timeout });
}
