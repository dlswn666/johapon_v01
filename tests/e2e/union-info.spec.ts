import { test, expect } from '@playwright/test';
import {
  UNION_SLUG,
  TEST_PREFIX,
  navigateTo,
  waitForPageLoad,
  uniqueId,
  saveScreenshot,
  clickDialogButton,
  expectDialogText,
} from './test-helpers';

const UNION_INFO_PATH = '/communication/union-info';
const TIMESTAMP = uniqueId();
const POST_TITLE = `${TEST_PREFIX} 조합정보 테스트 ${TIMESTAMP}`;
const POST_CONTENT = `${TEST_PREFIX} 조합정보 테스트 본문입니다. ID: ${TIMESTAMP}`;
const EDITED_SUFFIX = '(수정됨)';

test.describe.serial('조합정보 공유 게시판 E2E 테스트', () => {
  let createdPostUrl: string;

  test('1. 목록 조회', async ({ page }) => {
    await navigateTo(page, UNION_INFO_PATH);
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: '조합 정보 공유', exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button', { hasText: '글쓰기' })).toBeVisible();

    const listItems = page.locator('div.space-y-3 > div');
    expect(await listItems.count()).toBeGreaterThanOrEqual(1);

    await saveScreenshot(page, 'unioninfo-list');
  });

  test('2. 글 작성', async ({ page }) => {
    await navigateTo(page, `${UNION_INFO_PATH}/new`);
    await waitForPageLoad(page);

    const titleInput = page.locator('input[placeholder="제목을 입력해주세요"]');
    await titleInput.fill(POST_TITLE);

    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.fill(POST_CONTENT);

    await page.locator('button[type="submit"]', { hasText: '등록' }).click();

    await expectDialogText(page, '등록 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL(`**/${UNION_SLUG}${UNION_INFO_PATH}`, { timeout: 15000 });
    await waitForPageLoad(page);

    await expect(page.locator('h2', { hasText: POST_TITLE })).toBeVisible({ timeout: 10000 });
    await saveScreenshot(page, 'unioninfo-create');
  });

  test('3. 상세 조회', async ({ page }) => {
    await navigateTo(page, UNION_INFO_PATH);
    await waitForPageLoad(page);

    await page.locator('h2', { hasText: POST_TITLE }).click();
    await page.waitForURL(`**/${UNION_SLUG}${UNION_INFO_PATH}/**`, { timeout: 15000 });
    await waitForPageLoad(page);

    createdPostUrl = page.url();

    await expect(page.locator('h2', { hasText: POST_TITLE })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button', { hasText: '수정' })).toBeVisible();
    await expect(page.locator('button', { hasText: '삭제' })).toBeVisible();

    await saveScreenshot(page, 'unioninfo-detail');
  });

  test('4. 글 수정', async ({ page }) => {
    if (createdPostUrl) {
      await page.goto(createdPostUrl, { waitUntil: 'networkidle' });
    } else {
      await navigateTo(page, UNION_INFO_PATH);
      await waitForPageLoad(page);
      await page.locator('h2', { hasText: POST_TITLE }).click();
      await page.waitForURL(`**/${UNION_SLUG}${UNION_INFO_PATH}/**`, { timeout: 15000 });
    }
    await waitForPageLoad(page);

    await page.locator('button', { hasText: '수정' }).click();
    await page.waitForURL('**/edit', { timeout: 15000 });
    await waitForPageLoad(page);

    const titleInput = page.locator('input[placeholder="제목을 입력해주세요"]');
    await expect(titleInput).toHaveValue(POST_TITLE, { timeout: 10000 });
    await titleInput.fill(`${POST_TITLE}${EDITED_SUFFIX}`);

    await page.locator('button[type="submit"]', { hasText: '수정' }).click();

    await expectDialogText(page, '수정 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL(`**/${UNION_SLUG}${UNION_INFO_PATH}/**`, { timeout: 15000 });
    await waitForPageLoad(page);

    await expect(page.locator('h2', { hasText: `${POST_TITLE}${EDITED_SUFFIX}` })).toBeVisible({ timeout: 10000 });
    await saveScreenshot(page, 'unioninfo-edit');
  });

  test('5. 글 삭제', async ({ page }) => {
    if (createdPostUrl) {
      await page.goto(createdPostUrl, { waitUntil: 'networkidle' });
    } else {
      await navigateTo(page, UNION_INFO_PATH);
      await waitForPageLoad(page);
      await page.locator('h2', { hasText: `${POST_TITLE}${EDITED_SUFFIX}` }).click();
      await page.waitForURL(`**/${UNION_SLUG}${UNION_INFO_PATH}/**`, { timeout: 15000 });
    }
    await waitForPageLoad(page);

    await page.locator('button', { hasText: '삭제' }).click();

    await clickDialogButton(page, '확인');
    await expectDialogText(page, '삭제 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL(`**/${UNION_SLUG}${UNION_INFO_PATH}`, { timeout: 15000 });
    await waitForPageLoad(page);

    await expect(page.locator('h2', { hasText: `${POST_TITLE}${EDITED_SUFFIX}` })).toHaveCount(0, { timeout: 10000 });
    await saveScreenshot(page, 'unioninfo-delete');
  });
});
