import { test, expect } from '@playwright/test';
import {
  UNION_SLUG,
  TEST_PREFIX,
  navigateTo,
  waitForPageLoad,
  saveScreenshot,
  clickDialogButton,
  expectDialogText,
} from './test-helpers';

const FREEBOARD_PATH = '/free-board';
const timestamp = Date.now().toString(36);
const TEST_TITLE = `${TEST_PREFIX} 자유게시판 테스트 ${timestamp}`;
const TEST_CONTENT = `${TEST_PREFIX} 자유게시판 테스트 본문입니다. 자동화 테스트에서 생성되었습니다.`;
const EDITED_SUFFIX = '(수정됨)';

test.describe.serial('자유게시판 E2E 테스트', () => {
  let createdPostId: string;

  test('1. 목록 조회', async ({ page }) => {
    await navigateTo(page, FREEBOARD_PATH);
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: '자유 게시판', exact: true })).toBeVisible({ timeout: 15000 });

    const listItems = page.locator('.space-y-3 > div.rounded-lg');
    await expect(listItems.first()).toBeVisible({ timeout: 10000 });
    expect(await listItems.count()).toBeGreaterThanOrEqual(1);

    await expect(page.locator('button', { hasText: '글쓰기' })).toBeVisible();
    await saveScreenshot(page, 'freeboard-list');
  });

  test('2. 글 작성', async ({ page }) => {
    await navigateTo(page, FREEBOARD_PATH);
    await waitForPageLoad(page);

    await page.locator('button', { hasText: '글쓰기' }).click();
    await page.waitForURL(`**/${UNION_SLUG}/free-board/new`, { timeout: 10000 });
    await waitForPageLoad(page);

    const titleInput = page.locator('input[placeholder="제목을 입력해주세요"]');
    await titleInput.fill(TEST_TITLE);

    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.fill(TEST_CONTENT);

    await saveScreenshot(page, 'freeboard-create');

    await page.locator('button', { hasText: '등록' }).click();

    await expectDialogText(page, '등록 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL(`**/${UNION_SLUG}/free-board`, { timeout: 10000 });
    await waitForPageLoad(page);

    await expect(page.locator('h2', { hasText: TEST_TITLE })).toBeVisible({ timeout: 10000 });
  });

  test('3. 상세 조회', async ({ page }) => {
    await navigateTo(page, FREEBOARD_PATH);
    await waitForPageLoad(page);

    const createdItem = page.locator('h2', { hasText: TEST_TITLE });
    await expect(createdItem).toBeVisible({ timeout: 10000 });
    await createdItem.click();

    await page.waitForURL(`**/${UNION_SLUG}/free-board/**`, { timeout: 10000 });
    await waitForPageLoad(page);

    const url = page.url();
    const match = url.match(/free-board\/(\d+)/);
    expect(match).toBeTruthy();
    createdPostId = match![1];

    await expect(page.locator('h2', { hasText: TEST_TITLE })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button', { hasText: '수정' })).toBeVisible();
    await expect(page.locator('button', { hasText: '삭제' })).toBeVisible();

    await saveScreenshot(page, 'freeboard-detail');
  });

  test('4. 글 수정', async ({ page }) => {
    expect(createdPostId).toBeTruthy();
    await navigateTo(page, `${FREEBOARD_PATH}/${createdPostId}`);
    await waitForPageLoad(page);

    await page.locator('button', { hasText: '수정' }).click();
    await page.waitForURL(`**/${UNION_SLUG}/free-board/${createdPostId}/edit`, { timeout: 10000 });
    await waitForPageLoad(page);

    const titleInput = page.locator('input[placeholder="제목을 입력해주세요"]');
    await expect(titleInput).toHaveValue(TEST_TITLE, { timeout: 10000 });
    await titleInput.fill(TEST_TITLE + EDITED_SUFFIX);

    await saveScreenshot(page, 'freeboard-edit');

    await page.locator('button[type="submit"]', { hasText: '수정' }).click();

    await expectDialogText(page, '수정 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL(`**/${UNION_SLUG}/free-board/${createdPostId}`, { timeout: 10000 });
    await waitForPageLoad(page);

    await expect(page.locator('h2', { hasText: TEST_TITLE + EDITED_SUFFIX })).toBeVisible({ timeout: 10000 });
  });

  test('5. 검색 기능', async ({ page }) => {
    await navigateTo(page, FREEBOARD_PATH);
    await waitForPageLoad(page);

    const searchInput = page.locator('input[placeholder="제목, 내용, 작성자로 검색"]');
    await searchInput.fill(TEST_PREFIX);
    await page.locator('button', { hasText: '검색' }).click();
    await waitForPageLoad(page);

    await expect(page.locator('h2', { hasText: TEST_TITLE + EDITED_SUFFIX })).toBeVisible({ timeout: 10000 });
    await saveScreenshot(page, 'freeboard-search');
  });

  test('6. 글 삭제', async ({ page }) => {
    expect(createdPostId).toBeTruthy();
    await navigateTo(page, `${FREEBOARD_PATH}/${createdPostId}`);
    await waitForPageLoad(page);

    await page.locator('button', { hasText: '삭제' }).click();

    await clickDialogButton(page, '확인');
    await expectDialogText(page, '삭제 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL(`**/${UNION_SLUG}/free-board`, { timeout: 10000 });
    await waitForPageLoad(page);

    await expect(page.locator('h2', { hasText: TEST_TITLE + EDITED_SUFFIX })).not.toBeVisible({ timeout: 10000 });
    await saveScreenshot(page, 'freeboard-delete');
  });
});
