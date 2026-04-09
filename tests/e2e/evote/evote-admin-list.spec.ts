/**
 * 전자투표 관리자 목록 페이지 E2E 테스트
 *
 * 시나리오:
 * - 관리자 로그인 후 전자투표 목록 페이지 접근
 * - 목록 페이지 UI 요소 확인 (제목, 생성 버튼, 카드 등)
 * - 비관리자 접근 시 리다이렉트
 */
import { test, expect } from '@playwright/test';
import { testLoginAsAdmin, testLoginAsMember } from '../helpers/test-auth';

const SLUG = 'solsam';

test.describe('전자투표 관리 목록 페이지', () => {
  test('관리자 로그인 후 목록 페이지 렌더링', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    // 전자투표 관리 목록 페이지로 이동
    await page.goto(`http://localhost:3000/${SLUG}/admin/assembly/evote`);
    await page.waitForLoadState('networkidle');

    // 페이지 제목 확인
    await expect(page.getByRole('heading', { name: '전자투표 관리' })).toBeVisible();

    // "전자투표 생성" 버튼이 존재하는지 확인
    await expect(page.getByRole('button', { name: /전자투표 생성/ })).toBeVisible();
  });

  test('전자투표 생성 버튼 클릭 시 생성 페이지로 이동', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    await page.goto(`http://localhost:3000/${SLUG}/admin/assembly/evote`);
    await page.waitForLoadState('networkidle');

    // "전자투표 생성" 버튼 클릭
    await page.getByRole('button', { name: /전자투표 생성/ }).click();

    // URL이 create 페이지로 변경되었는지 확인
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/admin/assembly/evote/create`));

    // 생성 페이지의 제목 확인
    await expect(page.getByRole('heading', { name: '전자투표 생성' })).toBeVisible();
  });

  test('비관리자(조합원) 접근 시 리다이렉트', async ({ page }) => {
    await testLoginAsMember(page, SLUG);

    // 관리자 전용 페이지 접근 시도
    await page.goto(`http://localhost:3000/${SLUG}/admin/assembly/evote`);
    await page.waitForLoadState('networkidle');

    // 관리자 전용 페이지 콘텐츠가 보이지 않아야 함
    // (리다이렉트되거나 "접근 권한이 없습니다" 메시지 표시)
    const heading = page.getByRole('heading', { name: '전자투표 관리' });
    const noAccess = page.getByText('접근 권한이 없습니다');

    // 둘 중 하나가 조건을 만족해야 함 (리다이렉트 or 권한 부족 메시지)
    const isHeadingHidden = await heading.isHidden().catch(() => true);
    const isNoAccessVisible = await noAccess.isVisible().catch(() => false);

    expect(isHeadingHidden || isNoAccessVisible).toBeTruthy();
  });
});
