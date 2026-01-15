import { test, expect } from '@playwright/test';

/**
 * 예시 E2E 테스트 파일
 * 실제 프로젝트의 페이지에 맞게 수정하세요.
 */

test.describe('홈페이지', () => {
  test('메인 페이지가 로드되어야 함', async ({ page }) => {
    await page.goto('/');
    
    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/Johapon/i);
  });

  test('네비게이션이 정상 작동해야 함', async ({ page }) => {
    await page.goto('/');
    
    // 네비게이션 링크 클릭 예시
    // await page.click('text=로그인');
    // await expect(page).toHaveURL('/login');
  });
});

test.describe('로그인 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('로그인 폼이 표시되어야 함', async ({ page }) => {
    // 이메일 입력 필드 확인
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // 비밀번호 입력 필드 확인
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // 로그인 버튼 확인
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('빈 폼 제출 시 에러 표시', async ({ page }) => {
    // 빈 상태로 제출
    await page.click('button[type="submit"]');
    
    // 에러 메시지 확인 (실제 에러 메시지로 변경)
    // await expect(page.locator('.error-message')).toBeVisible();
  });

  test('올바른 정보로 로그인 성공', async ({ page }) => {
    // 테스트 계정 정보 입력
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // 제출
    await page.click('button[type="submit"]');
    
    // 로그인 후 리다이렉트 확인 (실제 경로로 변경)
    // await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('반응형 디자인', () => {
  test('모바일 뷰에서 메뉴가 정상 작동', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // 햄버거 메뉴 확인 (실제 선택자로 변경)
    // await expect(page.locator('.mobile-menu-button')).toBeVisible();
    
    // 메뉴 열기
    // await page.click('.mobile-menu-button');
    // await expect(page.locator('.mobile-menu')).toBeVisible();
  });
});

/**
 * E2E 테스트 작성 가이드라인:
 * 
 * 1. 테스트 파일 명명: [기능명].spec.ts
 * 2. test.describe로 페이지/기능 그룹화
 * 3. test.beforeEach로 공통 설정
 * 4. 실제 사용자 시나리오 기반으로 작성
 * 5. 네트워크 요청은 page.waitForResponse 사용
 * 6. 스크린샷 캡처: await page.screenshot({ path: 'screenshot.png' })
 */
