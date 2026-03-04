import { test, expect } from '@playwright/test';
import {
  navigateTo,
  waitForPageLoad,
  testTitle,
  saveScreenshot,
  TEST_PREFIX,
  clickDialogButton,
  expectDialogText,
} from './test-helpers';

test.describe.serial('Q&A 게시판 E2E 테스트', () => {
  const createdTitle = testTitle('Q&A');
  const editedTitle = createdTitle + ' (수정됨)';
  const contentText = `${TEST_PREFIX} Q&A 테스트 본문입니다. 자동화 테스트에서 생성되었습니다.`;

  test('1. 목록 조회', async ({ page }) => {
    await navigateTo(page, '/news/qna');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: '질문 게시판', exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button', { hasText: '질문하기' })).toBeVisible();

    await saveScreenshot(page, 'qna-list');
  });

  test('2. 질문 작성', async ({ page }) => {
    await navigateTo(page, '/news/qna');
    await waitForPageLoad(page);

    await page.locator('button', { hasText: '질문하기' }).click();
    await page.waitForURL('**/news/qna/new', { timeout: 10000 });
    await waitForPageLoad(page);

    const titleInput = page.locator('input[placeholder="제목을 입력해주세요"]');
    await titleInput.fill(createdTitle);

    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.fill(contentText);

    await saveScreenshot(page, 'qna-create');

    await page.locator('button', { hasText: '질문 등록' }).click();

    await expectDialogText(page, '등록 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL('**/news/qna', { timeout: 10000 });
    await waitForPageLoad(page);

    await expect(page.locator(`text=${createdTitle}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('3. 상세 조회', async ({ page }) => {
    await navigateTo(page, '/news/qna');
    await waitForPageLoad(page);

    await page.locator(`text=${createdTitle}`).first().click();
    await page.waitForURL('**/news/qna/**', { timeout: 10000 });
    await waitForPageLoad(page);

    await expect(page.locator('button', { hasText: '수정' })).toBeVisible();
    await expect(page.locator('button', { hasText: '삭제' })).toBeVisible();

    await saveScreenshot(page, 'qna-detail');
  });

  test('4. 질문 수정', async ({ page }) => {
    await navigateTo(page, '/news/qna');
    await waitForPageLoad(page);

    await page.locator(`text=${createdTitle}`).first().click();
    await page.waitForURL('**/news/qna/**', { timeout: 10000 });
    await waitForPageLoad(page);

    await page.locator('button', { hasText: '수정' }).click();
    await page.waitForURL('**/edit', { timeout: 10000 });
    await waitForPageLoad(page);

    const titleInput = page.locator('input[placeholder="제목을 입력해주세요"]');
    await expect(titleInput).toHaveValue(createdTitle, { timeout: 10000 });
    await titleInput.fill(editedTitle);

    await saveScreenshot(page, 'qna-edit');

    await page.locator('button', { hasText: '수정 완료' }).click();

    await expectDialogText(page, '수정 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL('**/news/qna/**', { timeout: 10000 });
    await waitForPageLoad(page);

    await expect(page.locator(`text=${editedTitle}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('5. 질문 삭제', async ({ page }) => {
    await navigateTo(page, '/news/qna');
    await waitForPageLoad(page);

    await page.locator(`text=${editedTitle}`).first().click();
    await page.waitForURL('**/news/qna/**', { timeout: 10000 });
    await waitForPageLoad(page);

    await page.locator('button', { hasText: '삭제' }).first().click();

    // 삭제 확인 모달
    await clickDialogButton(page, '확인');

    // 삭제 완료 모달
    await expectDialogText(page, '삭제 완료');
    await clickDialogButton(page, '확인');

    await page.waitForURL('**/news/qna', { timeout: 10000 });
    await waitForPageLoad(page);

    await expect(page.locator(`text=${editedTitle}`)).not.toBeVisible({ timeout: 10000 });
    await saveScreenshot(page, 'qna-delete');
  });
});
