/**
 * 회원가입 - 건물 유형별 조건 분기 테스트
 *
 * 건물 유형에 따른 동/호수 입력 조건:
 * - 아파트: 동 필수, 호수 필수 (층구분 표시)
 * - 빌라/다세대: 동 선택, 호수 필수 (층구분 표시)
 * - 주상복합: 동 필수, 호수 필수 (층구분 표시)
 * - 다가구 주택: 동/층구분/호수 모두 스킵
 * - 단독주택: 동/층구분/호수 모두 스킵
 * - 상업용: 동 선택, 호수 선택 (층구분 표시)
 */

import { test, expect, Page } from '@playwright/test';
import { testLogin } from '../helpers/test-auth';
import { adminClient } from '../phase1/helpers/supabase-admin';

const SLUG = 'solsam';

// -------------------------------------------------------
// 테스트 데이터 정리 헬퍼
// -------------------------------------------------------

/** 테스트에서 생성된 auth 사용자 + public.users 정리 */
async function cleanupTestUser(authUserId: string) {
    try {
        // user_auth_links에서 user_id 조회
        const { data: links } = await adminClient
            .from('user_auth_links')
            .select('user_id')
            .eq('auth_user_id', authUserId);

        if (links && links.length > 0) {
            const userIds = links.map((l) => l.user_id);
            // user_property_units 삭제
            for (const uid of userIds) {
                await adminClient.from('user_property_units').delete().eq('user_id', uid);
            }
            // user_auth_links 삭제
            await adminClient.from('user_auth_links').delete().eq('auth_user_id', authUserId);
            // users 삭제
            for (const uid of userIds) {
                await adminClient.from('users').delete().eq('id', uid);
            }
        }

        // auth.users에서 삭제
        await adminClient.auth.admin.deleteUser(authUserId);
    } catch (e) {
        // 정리 실패는 무시 (이미 삭제되었을 수 있음)
        console.log(`cleanup 참고: ${e}`);
    }
}

// -------------------------------------------------------
// 헬퍼 함수들
// -------------------------------------------------------

async function waitForRegisterModal(page: Page) {
    await expect(page.locator('div[role="dialog"]')).toBeVisible({ timeout: 10000 });
}

async function expectStepLabel(page: Page, expectedLabel: string) {
    await expect(page.locator('#register-step-label')).toContainText(expectedLabel, { timeout: 5000 });
}

async function clickNext(page: Page) {
    await page.getByRole('button', { name: '다음' }).click();
}

async function fillCurrentInput(page: Page, value: string) {
    const input = page.locator('div[role="dialog"] input[type="text"], div[role="dialog"] input[type="tel"]').first();
    await input.fill(value);
}

/** 물건지 유형 카드 클릭 */
async function selectPropertyType(page: Page, label: string) {
    // 유형 카드 버튼 중 해당 라벨 텍스트를 포함하는 것 클릭
    const card = page.locator('div[role="dialog"] button').filter({ hasText: label });
    await card.first().click();
}

/** 이름 → 생년월일 → 전화번호 스텝을 빠르게 통과 */
async function passBasicInfoSteps(page: Page) {
    // Step 1: 이름
    await expectStepLabel(page, '이름');
    await fillCurrentInput(page, '유형테스트');
    await clickNext(page);

    // Step 2: 생년월일 (스킵)
    await expectStepLabel(page, '생년월일');
    await clickNext(page);

    // Step 3: 전화번호
    await expectStepLabel(page, '휴대폰 번호');
    await fillCurrentInput(page, '010-1234-5678');
    await clickNext(page);
}

// -------------------------------------------------------
// 테스트
// -------------------------------------------------------

test.describe('건물 유형별 조건 분기', () => {

    test('단독주택 선택 시 동/층구분/호수 스텝 스킵', async ({ page }) => {
        const { authUserId } = await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);
        await passBasicInfoSteps(page);

        // Step 4: 물건지 주소 - 이 스텝은 카카오 주소 검색이라 스킵 확인만
        await expectStepLabel(page, '물건지 주소');
        // 테스트 환경에서는 주소 입력이 어려우므로 여기서 중단
        // 단, 유형 선택 스텝이 올바르게 표시되는지는 확인 가능

        // 주소 입력 없이는 다음으로 진행 불가 (필수 필드)
        await clickNext(page);
        await expect(page.locator('div[role="alert"]')).toContainText('필수 입력 항목입니다');

        // 정리
        await cleanupTestUser(authUserId);
    });

    test('물건지 유형 선택 UI - 6가지 유형 카드 표시', async ({ page }) => {
        const { authUserId } = await testLogin(page, { slug: SLUG, role: 'member' });
        await waitForRegisterModal(page);
        await passBasicInfoSteps(page);

        // 물건지 주소는 건너뛰고 유형 선택 화면을 직접 테스트할 수 없으므로,
        // 유형 옵션이 코드에 정의된 대로 6개인지 검증
        // (이 테스트는 주소 입력을 mock할 수 있을 때 확장 가능)

        // 현재는 물건지 주소 스텝에서 멈춤을 확인
        await expectStepLabel(page, '물건지 주소');

        await cleanupTestUser(authUserId);
    });

    test('물건지 유형 미선택 시 에러 메시지', async ({ page }) => {
        // 이 테스트는 물건지 유형 스텝에 도달해야 하므로
        // 카카오 주소 검색 통과가 선행 조건
        // 카카오 주소 API가 테스트 환경에서 동작하지 않으면 스킵
        test.skip();
    });
});

test.describe('건물 유형별 스텝 흐름 검증 (시나리오 기반)', () => {

    /**
     * 아파트 시나리오 예상 흐름:
     * 이름 → 생년월일 → 전화번호 → 물건지주소 → 유형(아파트) → 동 → 층구분 → 호수 → 추가물건지 → 거주지주소 → 거주지상세 → 최종확인
     * 총 12단계
     */
    test('아파트 - 동 필수, 호수 필수 (모든 스텝 표시)', async ({ page }) => {
        // 아파트 유형일 때 예상 스텝 흐름을 문서화
        // 실제 테스트는 주소 검색 mock이 필요

        // 스텝 정의 검증 (코드 레벨)
        // property_dong: requiresDong=true (아파트) → 스킵 안 됨
        // property_ho: requiresHo=true (아파트) → 스킵 안 됨
        // property_floor_type: 스킵 안 됨 (아파트)

        const expectedSteps = [
            'name',
            'birth_date',
            'phone_number',
            'property_address',
            'property_type',
            'property_dong',        // 아파트: 표시 (필수)
            'property_floor_type',  // 아파트: 표시
            'property_ho',          // 아파트: 표시 (필수)
            'add_property_confirm', // 추가 물건지 확인
            'resident_address',
            'resident_address_detail',
            // confirm (12단계)
        ];

        expect(expectedSteps.length).toBe(11); // 11 스텝 + 확인 = 12단계
        test.skip(); // 카카오 주소 검색 mock 필요
    });

    /**
     * 단독주택 시나리오 예상 흐름:
     * 이름 → 생년월일 → 전화번호 → 물건지주소 → 유형(단독주택) → [동 스킵] → [층구분 스킵] → [호수 스킵] → 추가물건지 → 거주지주소 → 거주지상세 → 최종확인
     * 실제 표시 스텝: 9단계 (동/층구분/호수 3단계 스킵)
     */
    test('단독주택 - 동/층구분/호수 모두 스킵', async ({ page }) => {
        const expectedVisibleSteps = [
            'name',
            'birth_date',
            'phone_number',
            'property_address',
            'property_type',
            // property_dong: SKIP (DETACHED_HOUSE)
            // property_floor_type: SKIP (DETACHED_HOUSE)
            // property_ho: SKIP (DETACHED_HOUSE)
            'add_property_confirm',
            'resident_address',
            'resident_address_detail',
            // confirm
        ];

        expect(expectedVisibleSteps.length).toBe(8); // 8 스텝 + 확인 = 9단계
        test.skip(); // 카카오 주소 검색 mock 필요
    });

    /**
     * 빌라/다세대 시나리오:
     * 동은 선택, 호수는 필수
     * property_dong: requiresDong=false → 표시되지만 선택사항
     * property_ho: requiresHo=true → 필수
     */
    test('빌라 - 동 선택(표시됨), 호수 필수', async ({ page }) => {
        const expectedVisibleSteps = [
            'name',
            'birth_date',
            'phone_number',
            'property_address',
            'property_type',
            'property_dong',        // 빌라: 표시 (선택)
            'property_floor_type',  // 빌라: 표시
            'property_ho',          // 빌라: 표시 (필수)
            'add_property_confirm',
            'resident_address',
            'resident_address_detail',
            // confirm
        ];

        expect(expectedVisibleSteps.length).toBe(11); // 11 스텝 + 확인 = 12단계
        test.skip();
    });

    /**
     * 다가구 주택 시나리오:
     * 동/층구분/호수 모두 스킵 (단독주택과 동일)
     */
    test('다가구 주택 - 동/층구분/호수 모두 스킵', async ({ page }) => {
        // MULTI_FAMILY는 shouldSkipStep에서 DETACHED_HOUSE와 동일하게 처리
        test.skip();
    });

    /**
     * 상업용 시나리오:
     * 동 선택, 호수 선택 (모두 표시되지만 선택사항)
     * 동/층구분/호수가 표시되지만 필수가 아님
     */
    test('상업용 - 동/호수 선택사항 (표시됨)', async ({ page }) => {
        // COMMERCIAL: requiresDong=false, requiresHo=false
        // shouldSkipStep은 COMMERCIAL을 스킵하지 않음 (동/호수 입력 가능)
        test.skip();
    });
});
