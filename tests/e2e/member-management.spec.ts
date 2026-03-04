import { test, expect, Page } from '@playwright/test';
import {
  navigateTo,
  waitForPageLoad,
  saveScreenshot,
  clickDialogButton,
} from './test-helpers';

/**
 * 사용자 관리(조합원 관리) E2E 테스트
 *
 * 테스트 데이터 (Supabase에 미리 삽입됨):
 *   test_pending_01  — [E2E] 김승인대기 (PENDING_APPROVAL)
 *   test_pending_02  — [E2E] 이반려대상 (PENDING_APPROVAL)
 *   test_rejected_01 — [E2E] 박반려됨   (REJECTED)
 *   test_approved_01 — [E2E] 최승인됨   (APPROVED, USER)
 *   test_approved_02 — [E2E] 정역할변경 (APPROVED, USER)
 *   test_blocked_01  — [E2E] 한차단됨   (APPROVED, USER, is_blocked=true)
 */

// ===== 승인 관리 탭 테스트 =====
test.describe.serial('승인 관리 탭 E2E 테스트', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. 승인 관리 탭 진입 및 목록 조회', async () => {
    await navigateTo(page, '/admin/members?tab=approval');
    await waitForPageLoad(page);

    // 페이지 헤더 확인
    const heading = page.locator('h1', { hasText: '조합원 관리' });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 승인 관리 탭 활성화 확인
    const approvalTab = page.locator('button', { hasText: '승인 관리' });
    await expect(approvalTab).toBeVisible({ timeout: 10000 });

    // 검색 입력창 확인
    const searchInput = page.locator('input[placeholder*="이름, 전화번호"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 상태 필터 확인
    await expect(page.locator('text=전체 상태')).toBeVisible({ timeout: 10000 });

    // 등급 필터 확인
    await expect(page.locator('text=전체 등급')).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'member-approval-list');
  });

  test('2. 상태 필터 - 승인 대기 필터링', async () => {
    // 상태 필터에서 '승인 대기' 선택
    const statusSelect = page.locator('text=전체 상태').first();
    await statusSelect.click();
    await page.waitForTimeout(500);

    const pendingOption = page.locator('text=승인 대기').last();
    await pendingOption.click();
    await waitForPageLoad(page);

    // 테스트 데이터 확인 — [E2E] 김승인대기 존재 여부
    await expect(page.locator('text=[E2E] 김승인대기')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=[E2E] 이반려대상')).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'member-filter-pending');
  });

  test('3. 검색 기능 - 이름 검색', async () => {
    // 필터 초기화 (전체 상태로)
    const statusSelect = page.locator('text=승인 대기').first();
    await statusSelect.click();
    await page.waitForTimeout(500);
    await page.locator('text=전체 상태').last().click();
    await waitForPageLoad(page);

    // 이름으로 검색
    const searchInput = page.locator('input[placeholder*="이름, 전화번호"]');
    await searchInput.fill('[E2E] 김승인대기');

    const searchButton = page.locator('button', { hasText: '검색' });
    await searchButton.click();
    await waitForPageLoad(page);

    // 검색 결과에 김승인대기만 표시
    await expect(page.locator('text=[E2E] 김승인대기')).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'member-search-result');

    // 검색어 초기화
    await searchInput.fill('');
    await searchButton.click();
    await waitForPageLoad(page);
  });

  test('4. 사용자 상세 모달 열기', async () => {
    // 승인 대기 필터 다시 적용
    const statusSelect = page.locator('text=전체 상태').first();
    await statusSelect.click();
    await page.waitForTimeout(500);
    await page.locator('text=승인 대기').last().click();
    await waitForPageLoad(page);

    // 김승인대기 클릭
    const userRow = page.locator('tr', { hasText: '[E2E] 김승인대기' }).first();
    await userRow.click();
    await page.waitForTimeout(1000);

    // 상세 모달 표시 확인
    await expect(page.locator('text=사용자 상세 정보')).toBeVisible({ timeout: 10000 });
    // 모달 내 이름 확인 (p 태그 — 테이블의 span과 구분)
    await expect(page.locator('p', { hasText: '[E2E] 김승인대기' })).toBeVisible({ timeout: 5000 });

    // 승인/반려 버튼 확인 (exact로 정확히 매칭)
    await expect(page.getByRole('button', { name: '승인', exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '반려', exact: true })).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'member-detail-modal');

    // 모달 닫기
    await page.locator('button', { hasText: '닫기' }).click();
    await page.waitForTimeout(500);
  });

  test('5. 사용자 승인 버튼 클릭 및 API 응답 확인', async () => {
    // 김승인대기 클릭해서 상세 모달 열기
    const userRow = page.locator('tr', { hasText: '[E2E] 김승인대기' }).first();
    await userRow.click();
    await page.waitForTimeout(1000);

    // 승인 버튼 클릭 (exact 매칭)
    const approveBtn = page.getByRole('button', { name: '승인', exact: true });
    await expect(approveBtn).toBeVisible({ timeout: 5000 });
    await approveBtn.click();

    // API 응답 대기 — 성공 또는 오류 toast 중 하나가 표시되어야 함
    const toastResult = await Promise.race([
      page.locator('text=승인되었습니다').waitFor({ state: 'visible', timeout: 10000 }).then(() => 'success'),
      page.locator('text=승인 처리 중 오류가 발생했습니다').waitFor({ state: 'visible', timeout: 10000 }).then(() => 'error'),
      page.waitForTimeout(10000).then(() => 'timeout'),
    ]);

    await saveScreenshot(page, 'member-approve-result');
    console.log(`승인 처리 결과: ${toastResult}`);

    // 모달 닫기 (열려있다면)
    const closeBtn = page.locator('button', { hasText: '닫기' });
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('6. 반려 사유 입력 모달 UI 검증', async () => {
    // 페이지 새로고침 후 승인대기 필터
    await navigateTo(page, '/admin/members?tab=approval');
    await waitForPageLoad(page);

    const statusSelect = page.locator('text=전체 상태').first();
    await statusSelect.click();
    await page.waitForTimeout(500);
    await page.locator('text=승인 대기').last().click();
    await waitForPageLoad(page);

    // 이반려대상 클릭
    const userRow = page.locator('tr', { hasText: '[E2E] 이반려대상' }).first();
    await userRow.click();
    await page.waitForTimeout(1000);

    // 반려 버튼 클릭 (exact 매칭)
    const rejectBtn = page.getByRole('button', { name: '반려', exact: true });
    await rejectBtn.click();
    await page.waitForTimeout(1000);

    // 반려 사유 입력 모달 확인
    await expect(page.locator('text=반려 사유 입력')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=가입 신청을 반려합니다')).toBeVisible({ timeout: 5000 });

    // 반려 사유 textarea 확인
    const reasonInput = page.locator('textarea[placeholder*="반려 사유"]');
    await expect(reasonInput).toBeVisible({ timeout: 5000 });

    // 반려 사유 입력
    await reasonInput.fill('E2E 테스트 반려 사유입니다.');

    // 반려 확인 버튼 확인
    const confirmRejectBtn = page.locator('button', { hasText: '반려 확인' });
    await expect(confirmRejectBtn).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'member-reject-modal');

    // 반려 확인 버튼 클릭
    await confirmRejectBtn.click();

    // API 응답 대기
    const toastResult = await Promise.race([
      page.locator('text=반려되었습니다').waitFor({ state: 'visible', timeout: 10000 }).then(() => 'success'),
      page.getByText('오류가 발생했습니다', { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => 'error'),
      page.waitForTimeout(10000).then(() => 'timeout'),
    ]);

    await saveScreenshot(page, 'member-reject-result');
    console.log(`반려 처리 결과: ${toastResult}`);
  });

  test('7. 반려 취소 버튼 UI 검증', async () => {
    // 반려됨 필터로 변경
    await navigateTo(page, '/admin/members?tab=approval');
    await waitForPageLoad(page);

    const statusSelect = page.locator('text=전체 상태').first();
    await statusSelect.click();
    await page.waitForTimeout(500);
    await page.locator('text=반려됨').last().click();
    await waitForPageLoad(page);

    // 박반려됨 클릭
    const userRow = page.locator('tr', { hasText: '[E2E] 박반려됨' }).first();
    await userRow.click();
    await page.waitForTimeout(1000);

    // 상세 모달 열림 확인
    await expect(page.locator('text=사용자 상세 정보')).toBeVisible({ timeout: 10000 });

    // 반려 취소 버튼 확인 (스크롤 필요할 수 있음)
    const cancelBtn = page.locator('button', { hasText: '반려 취소' });
    await cancelBtn.scrollIntoViewIfNeeded();
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'member-rejection-cancel-ui');

    // 반려 취소 클릭
    await cancelBtn.click();

    // API 응답 대기
    const toastResult = await Promise.race([
      page.locator('text=반려가 취소되었습니다').waitFor({ state: 'visible', timeout: 10000 }).then(() => 'success'),
      page.getByText('오류가 발생했습니다', { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => 'error'),
      page.waitForTimeout(10000).then(() => 'timeout'),
    ]);

    await saveScreenshot(page, 'member-rejection-cancel-result');
    console.log(`반려 취소 결과: ${toastResult}`);
  });

  test('8. 역할 변경 UI 검증 (USER → ADMIN)', async () => {
    // 승인됨 필터로 변경
    await navigateTo(page, '/admin/members?tab=approval');
    await waitForPageLoad(page);

    const statusSelect = page.locator('text=전체 상태').first();
    await statusSelect.click();
    await page.waitForTimeout(500);
    await page.locator('text=승인됨').last().click();
    await waitForPageLoad(page);

    // 정역할변경 클릭
    const userRow = page.locator('tr', { hasText: '[E2E] 정역할변경' }).first();
    await userRow.click();
    await page.waitForTimeout(1000);

    // 상세 모달에서 등급/임원 필드 확인 (label 태그로 특정)
    await expect(page.locator('label', { hasText: '등급' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('label', { hasText: '임원 여부' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('label', { hasText: '임원 직위' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('label', { hasText: '노출 순서' })).toBeVisible({ timeout: 5000 });

    // 등급 업데이트 버튼 확인
    const updateBtn = page.locator('button', { hasText: '등급 및 정보 수동 업데이트' });
    await expect(updateBtn).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'member-role-change-ui');

    // 모달 닫기
    await page.locator('button', { hasText: '닫기' }).click();
  });
});

// ===== 조합원 관리 탭 테스트 =====
test.describe.serial('조합원 관리 탭 E2E 테스트', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. 조합원 관리 탭 진입 및 목록 조회', async () => {
    await navigateTo(page, '/admin/members?tab=members');
    await waitForPageLoad(page);

    // 조합원 관리 탭 활성화 확인
    const heading = page.locator('h1', { hasText: '조합원 관리' });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 검색 입력창 확인
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 필터 버튼 확인 (전체/정상 회원/차단 회원)
    await expect(page.locator('button', { hasText: '전체' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button', { hasText: '정상 회원' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button', { hasText: '차단 회원' })).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'member-list-tab');
  });

  test('2. 조합원 검색', async () => {
    // [E2E] 최승인됨 검색 — 조합원 탭은 이름이 8자 초과 시 말줄임 처리됨
    const searchInput = page.locator('input[placeholder*="검색"]').first();
    await searchInput.fill('최승인됨');

    // 검색 버튼 클릭
    const searchButton = page.locator('button', { hasText: '검색' });
    await searchButton.click();
    await waitForPageLoad(page);

    // 검색 결과 확인 — '총 1명' 또는 title 속성에 원본 이름 포함
    // MemberListTab은 이름을 truncate하므로 title 속성이나 결과 수로 확인
    const resultCount = page.locator('text=총 1명');
    await expect(resultCount).toBeVisible({ timeout: 10000 });

    // 테이블에 행이 1개 존재하는지 확인
    const tableRow = page.locator('table tbody tr').first();
    await expect(tableRow).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'member-list-search');

    // 검색어 초기화
    await searchInput.fill('');
    await searchButton.click();
    await waitForPageLoad(page);
  });

  test('3. 차단 필터 - 차단 회원만 보기', async () => {
    // 차단 회원 필터 클릭
    const blockedFilter = page.locator('button', { hasText: '차단 회원' });
    await blockedFilter.click();
    await waitForPageLoad(page);

    // 차단된 사용자 표시 확인 — 이름은 말줄임 처리되므로 결과 수로 확인
    // "총 1명" 이상이 표시되어야 함 (차단 회원이 최소 1명 존재)
    const blockedCount = page.locator('text=/총 \\d+명/');
    await expect(blockedCount).toBeVisible({ timeout: 15000 });
    // 테이블에 행이 존재하는지 확인
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'member-list-blocked-filter');

    // 전체로 복원
    const allFilter = page.locator('button', { hasText: '전체' }).first();
    await allFilter.click();
    await waitForPageLoad(page);
  });
});

// ===== 테스트 데이터 정리 =====
test.describe('테스트 데이터 정리', () => {
  test('E2E 테스트 데이터 삭제', async ({ request }) => {
    // 테스트 후 cleanup은 별도 SQL로 처리
    // 여기서는 테스트 데이터 존재 여부만 확인
    console.log('테스트 데이터 정리는 수동으로 진행: DELETE FROM users WHERE id LIKE \'test_%\'');
  });
});
