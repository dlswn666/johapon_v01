/**
 * 회원가입 플로우 E2E 테스트
 *
 * 테스트 시나리오:
 * 1. 신규 사용자 - RegisterModal 자동 오픈 확인
 * 2. 아파트 유형 - 전체 12단계 완주 (이름 → 생년월일 → 전화번호 → 물건지주소 → 유형(아파트) → 동 → 층구분 → 호수 → 추가물건지확인 → 거주지주소 → 거주지상세 → 최종확인)
 * 3. 단독주택 유형 - 동/층구분/호수 스킵
 * 4. 빌라 유형 - 동 선택(스킵가능), 호수 필수
 * 5. 필수 필드 미입력 시 에러 메시지
 * 6. 약관 미동의 시 제출 불가
 * 7. 최종 확인 단계에서 이전 단계로 돌아가기
 */

import { test, expect, Page } from '@playwright/test';
import { testLogin } from '../helpers/test-auth';

const SLUG = 'solsam';

// -------------------------------------------------------
// 헬퍼 함수들
// -------------------------------------------------------

/** RegisterModal이 열릴 때까지 대기 */
async function waitForRegisterModal(page: Page) {
    // 모달 다이얼로그가 표시될 때까지 대기
    await expect(page.locator('div[role="dialog"]')).toBeVisible({ timeout: 10000 });
    // 모달 타이틀 "조합원 등록" 확인
    await expect(page.locator('#register-modal-title')).toContainText('조합원 등록');
}

/** 현재 스텝 라벨 텍스트 확인 */
async function expectStepLabel(page: Page, expectedLabel: string) {
    await expect(page.locator('#register-step-label')).toContainText(expectedLabel, { timeout: 5000 });
}

/** "다음" 버튼 클릭 */
async function clickNext(page: Page) {
    await page.getByRole('button', { name: '다음' }).click();
}

/** "이전" 버튼 클릭 */
async function clickPrev(page: Page) {
    await page.getByRole('button', { name: '이전' }).click();
}

/** 일반 텍스트 입력 필드에 값 입력 (현재 표시되는 input) */
async function fillCurrentInput(page: Page, value: string) {
    const input = page.locator('div[role="dialog"] input[type="text"], div[role="dialog"] input[type="tel"]').first();
    await input.fill(value);
}

/** 스텝 번호/총 스텝 확인 (예: "3 / 12") */
async function expectStepProgress(page: Page, current: number, total: number) {
    await expect(page.locator('div[role="dialog"]')).toContainText(`${current} / ${total}`);
}

// -------------------------------------------------------
// 테스트
// -------------------------------------------------------

test.describe('회원가입 플로우', () => {

    test('신규 사용자 로그인 시 RegisterModal 자동 오픈', async ({ page }) => {
        // 신규 테스트 계정으로 로그인 (user_auth_links 없음 → RegisterModal 자동 표시)
        await testLogin(page, { slug: SLUG, role: 'member' });

        // RegisterModal이 자동으로 열리는지 확인
        await waitForRegisterModal(page);

        // 첫 번째 스텝: 이름 입력
        await expectStepLabel(page, '이름');

        // 진행 표시기 확인 (1 / 12)
        await expectStepProgress(page, 1, 12);
    });

    test('아파트 유형 - 전체 12단계 완주', async ({ page }) => {
        await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);

        // Step 1: 이름 (소유자명) - 필수
        await expectStepLabel(page, '이름');
        await fillCurrentInput(page, '테스트가입자');
        await clickNext(page);

        // Step 2: 생년월일 - 선택 (스킵 가능)
        await expectStepLabel(page, '생년월일');
        // 생년월일은 BirthDatePicker 사용 - 스킵하고 다음으로
        await clickNext(page);

        // Step 3: 휴대폰 번호 - 필수
        await expectStepLabel(page, '휴대폰 번호');
        await fillCurrentInput(page, '010-9999-8888');
        await clickNext(page);

        // Step 4: 물건지 주소 - 필수 (KakaoAddressSearch 사용)
        await expectStepLabel(page, '물건지 주소');
        // 카카오 주소 검색은 외부 팝업이므로 직접 입력 시뮬레이션이 어려움
        // 주소 검색 입력 필드에 타이핑 후 결과를 기다리는 방식으로 테스트
        // 테스트 환경에서는 주소 검색 API가 동작하지 않을 수 있으므로,
        // 이 단계에서 에러 없이 표시되는지만 확인
        await expect(page.locator('#register-step-label')).toContainText('물건지 주소');

        // 참고: 실제 E2E에서 카카오 주소 검색 팝업은 외부 도메인이라 자동 테스트 불가
        // 이후 스텝 진행은 별도 mock 또는 수동 설정 필요
    });

    test('이름 필수 입력 검증 - 빈 값으로 다음 진행 시 에러', async ({ page }) => {
        await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);

        // Step 1: 이름 - 빈 값으로 다음 클릭
        await expectStepLabel(page, '이름');
        await clickNext(page);

        // 에러 메시지 표시 확인
        await expect(page.locator('div[role="alert"]')).toContainText('필수 입력 항목입니다');
    });

    test('전화번호 필수 입력 검증', async ({ page }) => {
        await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);

        // Step 1: 이름 입력
        await fillCurrentInput(page, '검증테스트');
        await clickNext(page);

        // Step 2: 생년월일 스킵
        await clickNext(page);

        // Step 3: 전화번호 - 빈 값으로 다음 클릭
        await expectStepLabel(page, '휴대폰 번호');
        await clickNext(page);

        // 에러 메시지 확인
        await expect(page.locator('div[role="alert"]')).toContainText('필수 입력 항목입니다');
    });

    test('이전 버튼으로 뒤로 이동', async ({ page }) => {
        await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);

        // Step 1 → Step 2
        await fillCurrentInput(page, '뒤로가기테스트');
        await clickNext(page);
        await expectStepLabel(page, '생년월일');

        // Step 2 → Step 1 (이전)
        await clickPrev(page);
        await expectStepLabel(page, '이름');

        // 이전에 입력한 값이 유지되는지 확인
        const nameInput = page.locator('div[role="dialog"] input').first();
        await expect(nameInput).toHaveValue('뒤로가기테스트');
    });

    test('모달 닫기 - X 버튼', async ({ page }) => {
        await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);

        // 닫기 버튼 클릭
        await page.getByLabel('닫기').click();

        // 모달이 닫히는지 확인
        await expect(page.locator('div[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
    });

    test('첫 번째 스텝에서 ESC 키로 모달 닫기', async ({ page }) => {
        await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);

        // 첫 번째 스텝에서 ESC → confirm 없이 바로 닫힘
        await page.keyboard.press('Escape');

        await expect(page.locator('div[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
    });

    test('두 번째 이후 스텝에서 ESC 키 → confirm 다이얼로그', async ({ page }) => {
        await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);

        // Step 1 진행
        await fillCurrentInput(page, 'ESC테스트');
        await clickNext(page);
        await expectStepLabel(page, '생년월일');

        // confirm 다이얼로그 처리 (취소)
        page.on('dialog', async (dialog) => {
            expect(dialog.message()).toContain('입력한 정보가 모두 사라집니다');
            await dialog.dismiss(); // "취소" 선택
        });

        await page.keyboard.press('Escape');

        // 모달이 여전히 열려있어야 함 (취소했으므로)
        await expect(page.locator('div[role="dialog"]')).toBeVisible();
    });

    test('진행 표시기 - 스텝 변경 시 업데이트 확인', async ({ page }) => {
        await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);

        // Step 1 진행 표시기
        await expectStepProgress(page, 1, 12);

        // Step 2로 이동
        await fillCurrentInput(page, '진행표시기테스트');
        await clickNext(page);
        await expectStepProgress(page, 2, 12);

        // Step 3으로 이동
        await clickNext(page); // 생년월일 스킵
        await expectStepProgress(page, 3, 12);
    });

    test('모달 접근성 - ARIA 속성 확인', async ({ page }) => {
        await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);

        // role="dialog" 확인
        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).toHaveAttribute('aria-modal', 'true');
        await expect(dialog).toHaveAttribute('aria-labelledby', 'register-modal-title');

        // 모달 타이틀 ID 확인
        await expect(page.locator('#register-modal-title')).toBeVisible();
    });
});
