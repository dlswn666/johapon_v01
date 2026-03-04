import { test, expect, Page } from '@playwright/test';
import {
  navigateTo,
  waitForPageLoad,
  testTitle,
  testContent,
  saveScreenshot,
  clickDialogButton,
  expectDialogText,
} from './test-helpers';

const NOTICE_TITLE = testTitle('공지사항');
const NOTICE_CONTENT = testContent('공지사항');
const EDITED_SUFFIX = ' (수정됨)';

test.describe.serial('공지사항 게시판 E2E 테스트', () => {
  let page: Page;
  let createdNoticeId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. 목록 조회', async () => {
    await navigateTo(page, '/news/notice');
    await waitForPageLoad(page);

    const heading = page.getByRole('heading', { name: '공지사항', exact: true });
    await expect(heading).toBeVisible({ timeout: 15000 });

    const writeButton = page.locator('button', { hasText: '글쓰기' });
    await expect(writeButton).toBeVisible({ timeout: 10000 });

    const listItems = page.locator('.space-y-3 > div.rounded-lg');
    await expect(listItems.first()).toBeVisible({ timeout: 15000 });
    expect(await listItems.count()).toBeGreaterThanOrEqual(1);

    await saveScreenshot(page, 'notice-list');
  });

  test('2. 글 작성', async () => {
    await page.locator('button', { hasText: '글쓰기' }).click();
    await page.waitForURL('**/news/notice/new', { timeout: 15000 });
    await waitForPageLoad(page);

    await expect(page.locator('h2', { hasText: '공지사항 작성' })).toBeVisible({ timeout: 10000 });

    const titleInput = page.locator('input[placeholder="제목을 입력해주세요"]');
    await titleInput.fill(NOTICE_TITLE);

    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.fill(NOTICE_CONTENT);

    await saveScreenshot(page, 'notice-create');

    await page.locator('button[type="submit"]', { hasText: '등록' }).click();

    // Radix visible 다이얼로그만 타겟
    await expectDialogText(page, '등록 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL('**/news/notice/*', { timeout: 15000 });
    await waitForPageLoad(page);

    const url = page.url();
    const match = url.match(/\/news\/notice\/(\d+)/);
    expect(match).toBeTruthy();
    createdNoticeId = match![1];

    await expect(page.locator('h1', { hasText: NOTICE_TITLE })).toBeVisible({ timeout: 10000 });
  });

  test('3. 상세 조회', async () => {
    await navigateTo(page, '/news/notice');
    await waitForPageLoad(page);

    const createdItem = page.locator('h2', { hasText: NOTICE_TITLE });
    await expect(createdItem).toBeVisible({ timeout: 15000 });
    await createdItem.click();

    await page.waitForURL(`**/news/notice/${createdNoticeId}`, { timeout: 15000 });
    await waitForPageLoad(page);

    await expect(page.locator('h1', { hasText: NOTICE_TITLE })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.prose', { hasText: NOTICE_CONTENT })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button', { hasText: '수정' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button', { hasText: '삭제' })).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'notice-detail');
  });

  test('4. 글 수정', async () => {
    await page.locator('button', { hasText: '수정' }).click();
    await page.waitForURL(`**/news/notice/${createdNoticeId}/edit`, { timeout: 15000 });
    await waitForPageLoad(page);

    const titleInput = page.locator('input[placeholder="제목을 입력해주세요"]');
    await expect(titleInput).toHaveValue(NOTICE_TITLE, { timeout: 15000 });

    const editedTitle = NOTICE_TITLE + EDITED_SUFFIX;
    await titleInput.fill(editedTitle);

    await saveScreenshot(page, 'notice-edit');

    await page.locator('button[type="submit"]', { hasText: '수정' }).click();

    await expectDialogText(page, '수정 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL(`**/news/notice/${createdNoticeId}`, { timeout: 15000 });
    await waitForPageLoad(page);

    await expect(page.locator('h1', { hasText: editedTitle })).toBeVisible({ timeout: 10000 });
  });

  test('5. 글 삭제', async () => {
    await page.locator('button', { hasText: '삭제' }).click();

    // 삭제 확인 모달 → 확인 클릭
    await clickDialogButton(page, '확인');

    // 삭제 완료 Alert
    await expectDialogText(page, '삭제 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL('**/news/notice', { timeout: 15000 });
    await waitForPageLoad(page);

    const editedTitle = NOTICE_TITLE + EDITED_SUFFIX;
    await expect(page.locator('h2', { hasText: editedTitle })).toHaveCount(0, { timeout: 10000 });

    await saveScreenshot(page, 'notice-delete');
  });
});
