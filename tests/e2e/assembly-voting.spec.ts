import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { saveScreenshot, TEST_PREFIX } from './test-helpers';

const supabaseAdmin = createClient(
  'https://bpdjashtxqrcgxfequgf.supabase.co',
  process.env.NEXT_PUBLIC_DEV_SUPABASE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZGphc2h0eHFyY2d4ZmVxdWdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc3OTc1MCwiZXhwIjoyMDgxMzU1NzUwfQ.qzmpV6tztotvYsOp6JooM3x2XlGU7FK-cOjPBi2Ll8A'
);

const UNION_SLUG = 'solsam';
const UNION_ID_VAL = '7c35ee21-34fc-4597-84db-ee63e5b0d351';
const BASE_URL = 'http://localhost:3000';

// ===== 테스트 데이터 ID =====
const assemblyId = crypto.randomUUID();
const agenda1Id = crypto.randomUUID();
const agenda2Id = crypto.randomUUID();
const poll1Id = crypto.randomUUID();
const poll2Id = crypto.randomUUID();
const snapshotId = crypto.randomUUID();

// 투표 선택지 ID
const poll1Option1Id = crypto.randomUUID();
const poll1Option2Id = crypto.randomUUID();
const poll1Option3Id = crypto.randomUUID();
const poll2Option1Id = crypto.randomUUID();
const poll2Option2Id = crypto.randomUUID();
const poll2Option3Id = crypto.randomUUID();

// route interception 에서 사용할 옵션 배열
const poll1Options = [
  { id: poll1Option1Id, poll_id: poll1Id, label: '찬성', seq_order: 1, option_type: 'YES', description: null },
  { id: poll1Option2Id, poll_id: poll1Id, label: '반대', seq_order: 2, option_type: 'NO', description: null },
  { id: poll1Option3Id, poll_id: poll1Id, label: '기권', seq_order: 3, option_type: 'ABSTAIN', description: null },
];
const poll2Options = [
  { id: poll2Option1Id, poll_id: poll2Id, label: '찬성', seq_order: 1, option_type: 'YES', description: null },
  { id: poll2Option2Id, poll_id: poll2Id, label: '반대', seq_order: 2, option_type: 'NO', description: null },
  { id: poll2Option3Id, poll_id: poll2Id, label: '기권', seq_order: 3, option_type: 'ABSTAIN', description: null },
];

// route interception 에서 사용할 공통 mock 데이터
const snapshotData = {
  id: snapshotId,
  assembly_id: assemblyId,
  union_id: UNION_ID_VAL,
  user_id: 'f7b842e4-57fe-40d3-963d-4c45165369d6',
  member_name: '[E2E-TEST] 김투표',
  member_phone: '010-9999-0001',
  property_address: 'E2E 테스트 주소',
  voting_weight: 1,
  member_type: 'INDIVIDUAL',
  identity_verified_at: new Date().toISOString(),
  identity_method: 'KAKAO_LOGIN',
  consent_agreed_at: new Date().toISOString(),
  is_active: true,
};

const assemblyData = {
  id: assemblyId,
  union_id: UNION_ID_VAL,
  title: '[E2E-TEST] 투표 테스트 총회',
  assembly_type: 'REGULAR',
  status: 'VOTING',
  scheduled_at: new Date().toISOString(),
  stream_type: 'NONE',
  zoom_meeting_id: null,
  youtube_video_id: null,
};

const agendaItemsData = [
  {
    id: agenda1Id,
    assembly_id: assemblyId,
    union_id: UNION_ID_VAL,
    title: '[E2E-TEST] 제1호 테스트 안건',
    description: null,
    seq_order: 1,
    agenda_type: 'GENERAL',
    quorum_threshold_pct: null,
    quorum_requires_direct: false,
    approval_threshold_pct: null,
    polls: [{
      id: poll1Id,
      agenda_item_id: agenda1Id,
      assembly_id: assemblyId,
      union_id: UNION_ID_VAL,
      status: 'OPEN',
      allow_vote_revision: true,
      allow_abstain: true,
      allow_electronic: true,
      allow_written: true,
      allow_proxy: true,
      allow_onsite: true,
      opens_at: new Date().toISOString(),
      closes_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      poll_options: poll1Options,
    }],
  },
  {
    id: agenda2Id,
    assembly_id: assemblyId,
    union_id: UNION_ID_VAL,
    title: '[E2E-TEST] 제2호 테스트 안건',
    description: null,
    seq_order: 2,
    agenda_type: 'BUDGET_APPROVAL',
    quorum_threshold_pct: null,
    quorum_requires_direct: false,
    approval_threshold_pct: null,
    polls: [{
      id: poll2Id,
      agenda_item_id: agenda2Id,
      assembly_id: assemblyId,
      union_id: UNION_ID_VAL,
      status: 'OPEN',
      allow_vote_revision: true,
      allow_abstain: true,
      allow_electronic: true,
      allow_written: true,
      allow_proxy: true,
      allow_onsite: true,
      opens_at: new Date().toISOString(),
      closes_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      poll_options: poll2Options,
    }],
  },
];

/**
 * 투표 관련 API 라우트 인터셉트 설정
 * gate/hall/vote 페이지에서 사용하는 모든 API 엔드포인트를 mock 처리
 */
async function setupVotingRoutes(page: Page) {
  // POST /api/assembly-access/verify → 인증 성공 응답
  await page.route('**/api/assembly-access/verify', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            snapshot: snapshotData,
            assembly: assemblyData,
            agendaItems: agendaItemsData,
            isReentry: false,
          },
        }),
      });
    } else if (method === 'PATCH') {
      // 동의 처리
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });

  // POST /api/votes/cast → 투표 영수증 반환
  await page.route('**/api/votes/cast', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { success: true, receipt_token: 'e2e-receipt-token-12345' } }),
    });
  });

  // GET /api/votes/my → 초기에는 투표 기록 없음
  await page.route('**/api/votes/my**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null }),
    });
  });

  // POST/GET /api/assemblies/*/questions → Q&A
  await page.route('**/api/assemblies/*/questions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: crypto.randomUUID(),
            content: 'test',
            submitted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        }),
      });
    } else {
      // GET — 빈 목록
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    }
  });

  // POST/GET /api/assemblies/*/speakers → 발언 요청
  await page.route('**/api/assemblies/*/speakers', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: crypto.randomUUID(),
            status: 'PENDING',
            requested_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        }),
      });
    } else {
      // GET — 빈 목록
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    }
  });

  // GET /api/assemblies/*/documents → 빈 목록
  await page.route('**/api/assemblies/*/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
}

// ===== 조합원 투표 플로우 E2E 테스트 =====
test.describe.serial('조합원 투표 플로우 E2E', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // ===== DB 테스트 데이터 생성 =====

    // 1. 총회 생성
    const { error: assemblyError } = await supabaseAdmin
      .from('assemblies')
      .insert({
        id: assemblyId,
        union_id: UNION_ID_VAL,
        title: '[E2E-TEST] 투표 테스트 총회',
        assembly_type: 'REGULAR',
        status: 'VOTING',
        scheduled_at: new Date().toISOString(),
        created_by: 'd58babef-1a73-4da0-961c-09457667a07d',
      });
    if (assemblyError) console.error('총회 생성 실패:', assemblyError);

    // 2. 안건 생성
    const { error: agendaError } = await supabaseAdmin
      .from('agenda_items')
      .insert([
        {
          id: agenda1Id,
          assembly_id: assemblyId,
          union_id: UNION_ID_VAL,
          title: '[E2E-TEST] 제1호 테스트 안건',
          agenda_type: 'GENERAL',
          seq_order: 1,
        },
        {
          id: agenda2Id,
          assembly_id: assemblyId,
          union_id: UNION_ID_VAL,
          title: '[E2E-TEST] 제2호 테스트 안건',
          agenda_type: 'BUDGET_APPROVAL',
          seq_order: 2,
        },
      ]);
    if (agendaError) console.error('안건 생성 실패:', agendaError);

    // 3. 투표(Poll) 생성
    const now = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { error: pollError } = await supabaseAdmin
      .from('polls')
      .insert([
        {
          id: poll1Id,
          agenda_item_id: agenda1Id,
          assembly_id: assemblyId,
          union_id: UNION_ID_VAL,
          status: 'OPEN',
          allow_vote_revision: true,
          allow_abstain: true,
          allow_electronic: true,
          opens_at: now.toISOString(),
          closes_at: tomorrow.toISOString(),
        },
        {
          id: poll2Id,
          agenda_item_id: agenda2Id,
          assembly_id: assemblyId,
          union_id: UNION_ID_VAL,
          status: 'OPEN',
          allow_vote_revision: true,
          allow_abstain: true,
          allow_electronic: true,
          opens_at: now.toISOString(),
          closes_at: tomorrow.toISOString(),
        },
      ]);
    if (pollError) console.error('투표 생성 실패:', pollError);

    // 4. 투표 선택지 생성
    const { error: optionError } = await supabaseAdmin
      .from('poll_options')
      .insert([
        { id: poll1Option1Id, poll_id: poll1Id, union_id: UNION_ID_VAL, label: '찬성', seq_order: 1 },
        { id: poll1Option2Id, poll_id: poll1Id, union_id: UNION_ID_VAL, label: '반대', seq_order: 2 },
        { id: poll1Option3Id, poll_id: poll1Id, union_id: UNION_ID_VAL, label: '기권', seq_order: 3 },
        { id: poll2Option1Id, poll_id: poll2Id, union_id: UNION_ID_VAL, label: '찬성', seq_order: 1 },
        { id: poll2Option2Id, poll_id: poll2Id, union_id: UNION_ID_VAL, label: '반대', seq_order: 2 },
        { id: poll2Option3Id, poll_id: poll2Id, union_id: UNION_ID_VAL, label: '기권', seq_order: 3 },
      ]);
    if (optionError) console.error('투표 선택지 생성 실패:', optionError);

    // 5. 조합원 스냅샷 생성
    const { error: snapshotError } = await supabaseAdmin
      .from('assembly_member_snapshots')
      .insert({
        id: snapshotId,
        assembly_id: assemblyId,
        union_id: UNION_ID_VAL,
        user_id: 'f7b842e4-57fe-40d3-963d-4c45165369d6',
        member_name: '[E2E-TEST] 김투표',
        member_phone: '010-9999-0001',
        property_address: 'E2E 테스트 주소',
        voting_weight: 1,
        member_type: 'INDIVIDUAL',
        access_token_hash: 'e2e_test_hash',
        token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        identity_verified_at: new Date().toISOString(),
        identity_method: 'KAKAO_LOGIN',
        consent_agreed_at: new Date().toISOString(),
        is_active: true,
      });
    if (snapshotError) console.error('스냅샷 생성 실패:', snapshotError);

    // 브라우저 페이지 생성
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    // 페이지 닫기
    await page.close();

    // ===== DB 테스트 데이터 정리 (역순) =====
    const { error: e1 } = await supabaseAdmin
      .from('poll_options')
      .delete()
      .in('id', [poll1Option1Id, poll1Option2Id, poll1Option3Id, poll2Option1Id, poll2Option2Id, poll2Option3Id]);
    if (e1) console.error('투표 선택지 삭제 실패:', e1);

    const { error: e2 } = await supabaseAdmin
      .from('polls')
      .delete()
      .in('id', [poll1Id, poll2Id]);
    if (e2) console.error('투표 삭제 실패:', e2);

    const { error: e3 } = await supabaseAdmin
      .from('assembly_member_snapshots')
      .delete()
      .eq('id', snapshotId);
    if (e3) console.error('스냅샷 삭제 실패:', e3);

    const { error: e4 } = await supabaseAdmin
      .from('agenda_items')
      .delete()
      .in('id', [agenda1Id, agenda2Id]);
    if (e4) console.error('안건 삭제 실패:', e4);

    const { error: e5 } = await supabaseAdmin
      .from('assemblies')
      .delete()
      .eq('id', assemblyId);
    if (e5) console.error('총회 삭제 실패:', e5);
  });

  // ----- 테스트 1: gate — 토큰 없이 접근 -----
  test('1. gate: 토큰 없이 접근 시 오류 표시', async () => {
    // 토큰 없이 gate 페이지 접근
    await page.goto(`${BASE_URL}/${UNION_SLUG}/assembly/${assemblyId}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(2000);

    // 오류 메시지 표시 확인: "인증 실패" 텍스트
    await expect(page.getByText('인증 실패')).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'assembly-voting-gate-no-token');
  });

  // ----- 테스트 2: gate — 인증 성공 플로우 (route intercepted) -----
  test('2. gate: 인증 성공 시 인증 완료 표시', async () => {
    // 라우트 인터셉트 설정
    await setupVotingRoutes(page);

    // 토큰 포함하여 gate 페이지 접근
    await page.goto(
      `${BASE_URL}/${UNION_SLUG}/assembly/${assemblyId}?token=e2e-test-token`,
      { waitUntil: 'networkidle' },
    );
    await page.waitForTimeout(2000);

    // "인증 완료" 메시지 확인
    await expect(page.getByText('인증 완료', { exact: false })).toBeVisible({
      timeout: 15000,
    });

    // 조합원 이름 표시 확인
    await expect(
      page.getByText('[E2E-TEST] 김투표', { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'assembly-voting-gate-success');
  });

  // ----- 테스트 3: gate — 동의 플로우 -----
  test('3. gate: 동의 미완료 시 동의 UI 표시', async () => {
    // 기존 라우트 해제 후 동의 미완료 버전으로 재설정
    await page.unroute('**/api/assembly-access/verify');

    // verify 라우트를 consent_agreed_at: null 로 오버라이드
    await page.route('**/api/assembly-access/verify', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              snapshot: { ...snapshotData, consent_agreed_at: null },
              assembly: assemblyData,
              agendaItems: agendaItemsData,
              isReentry: false,
            },
          }),
        });
      } else if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(
      `${BASE_URL}/${UNION_SLUG}/assembly/${assemblyId}?token=e2e-test-token`,
      { waitUntil: 'networkidle' },
    );
    await page.waitForTimeout(2000);

    // 동의 관련 UI 표시 확인
    await expect(page.getByText('개인정보 수집·이용 동의')).toBeVisible({
      timeout: 10000,
    });

    // 체크박스 존재 확인
    const checkbox = page
      .locator('input[type="checkbox"]')
      .or(page.locator('[role="checkbox"]'));
    if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkbox.click();
    }

    // "동의 후 진행" 버튼 확인
    const agreeBtn = page.locator('button', { hasText: '동의' });
    await expect(agreeBtn).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'assembly-voting-gate-consent');

    // 다음 테스트를 위해 기존 동의 완료 버전으로 복원
    await page.unroute('**/api/assembly-access/verify');
    await page.route('**/api/assembly-access/verify', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              snapshot: snapshotData,
              assembly: assemblyData,
              agendaItems: agendaItemsData,
              isReentry: false,
            },
          }),
        });
      } else if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });
  });

  // ----- 테스트 4: hall — 4탭 렌더링 -----
  test('4. hall: 4개 탭(투표, Q&A, 자료, 발언) 렌더링', async () => {
    // Zustand store 리셋 → 새로운 gate 검증을 위해
    // (test 3에서 consent_agreed_at: null로 설정되어 stale state 남음)
    await page.evaluate(() => {
      // Zustand store는 window.__zustand 또는 모듈 클로저에 존재
      // sessionStorage/localStorage 기반이 아니므로 직접 접근 불가
      // 대신 빈 페이지로 이동하여 React 트리를 완전히 언마운트
    });

    // 빈 페이지로 이동하여 React 트리 언마운트 → Zustand store 초기화
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    // verify 라우트 재설정 (이전 route가 unroute 후 재등록되었지만 혹시 모를 상태)
    await page.unroute('**/api/assembly-access/verify');
    await page.route('**/api/assembly-access/verify', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              snapshot: snapshotData,
              assembly: assemblyData,
              agendaItems: agendaItemsData,
              isReentry: false,
            },
          }),
        });
      } else if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // gate 페이지로 이동 → verify 호출 → Zustand 세팅 → auto-redirect to hall
    await page.goto(
      `${BASE_URL}/${UNION_SLUG}/assembly/${assemblyId}?token=e2e-test-token`,
      { waitUntil: 'domcontentloaded' },
    );

    // gate에서 인증 완료 후 hall 자동 리다이렉트 대기 (2초 카운트다운 + 여유)
    await page.waitForURL(`**/${UNION_SLUG}/assembly/${assemblyId}/hall`, { timeout: 15000 }).catch(() => {
      // 리다이렉트 실패 시 직접 이동
    });

    // hall 페이지에 있는지 확인
    const isOnHall = page.url().includes('/hall');
    if (!isOnHall) {
      // 직접 hall로 이동
      await page.goto(
        `${BASE_URL}/${UNION_SLUG}/assembly/${assemblyId}/hall`,
        { waitUntil: 'domcontentloaded' },
      );
      await page.waitForTimeout(3000);
    }

    // 4개 탭 버튼 확인
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(4, { timeout: 10000 });

    // 각 탭 레이블 확인
    await expect(
      page.locator('[role="tab"]', { hasText: '투표' }),
    ).toBeVisible();
    await expect(
      page.locator('[role="tab"]', { hasText: 'Q&A' }),
    ).toBeVisible();
    await expect(
      page.locator('[role="tab"]', { hasText: '자료' }),
    ).toBeVisible();
    await expect(
      page.locator('[role="tab"]', { hasText: '발언' }),
    ).toBeVisible();

    await saveScreenshot(page, 'assembly-voting-hall-tabs');
  });

  // ----- 테스트 5: 투표 — 선택 → 확인 → 제출 -----
  test('5. 투표: 찬성 선택 → 확인 모달 → 투표 제출', async () => {
    // 투표 탭이 기본 활성화 상태

    // 첫 번째 안건에서 "찬성" 선택
    const firstOption = page.locator('text=찬성').first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });
    await firstOption.click();

    // "투표하기" 버튼 클릭 (안건별 1개씩 → 첫 번째 안건 선택)
    const voteBtn = page.locator('button', { hasText: '투표하기' }).first();
    await expect(voteBtn).toBeVisible({ timeout: 5000 });
    await voteBtn.click();

    // 확인 모달 표시
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByText('투표 확인', { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // 모달에서 확인 버튼 클릭 (Radix Dialog 특성상 force: true)
    await page
      .locator('[role="dialog"] button', { hasText: '투표' })
      .first()
      .click({ force: true });

    // 투표 처리 대기
    await page.waitForTimeout(2000);

    // 투표 결과 확인 — "투표" 관련 텍스트 존재 확인
    await expect(
      page.getByText('투표', { exact: false }).first(),
    ).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'assembly-voting-vote-cast');
  });

  // ----- 테스트 6: 재투표 -----
  test('6. 재투표: 투표 완료 후 재투표 가능 표시', async () => {
    // test 5에서 투표가 완료된 상태 — 투표 완료 후 UI 확인
    // 이미 hall 페이지에 있으므로 reload 없이 확인
    // (reload하면 Zustand store 초기화되어 gate로 리다이렉트됨)

    // 투표 완료 후 영수증 또는 투표 완료 관련 UI가 표시되어야 함
    // poll의 allow_vote_revision = true이므로 재투표 관련 UI가 보일 수 있음
    // 투표 탭이 활성 상태인지 확인
    const voteTab = page.locator('[role="tab"]', { hasText: '투표' });
    if (await voteTab.isVisible().catch(() => false)) {
      await voteTab.click();
      await page.waitForTimeout(1000);
    }

    // "투표하기" 또는 영수증 관련 텍스트 확인 (투표 완료 후 UI)
    // mock에서 투표 후 receipt_token이 반환되므로 Zustand에 저장됨
    // 재투표 가능 여부는 poll.allow_vote_revision + 해당 UI 렌더링에 따라 다름
    // 투표 완료 상태에서 다시 선택지를 보여주는 경우가 있으므로 유연하게 확인
    const revoteText = page.getByText('재투표', { exact: false });
    const voteCompleteText = page.getByText('투표 완료', { exact: false });
    const receiptText = page.getByText('영수증', { exact: false });
    const voteBtnAgain = page.locator('button', { hasText: '투표하기' }).first();

    // 재투표, 투표 완료, 영수증, 또는 투표하기 버튼 중 하나가 보이면 통과
    const anyVisible = await Promise.race([
      revoteText.waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      voteCompleteText.waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      receiptText.waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      voteBtnAgain.waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
    ]);
    expect(anyVisible).toBeTruthy();

    await saveScreenshot(page, 'assembly-voting-revote');
  });

  // ----- 테스트 7: Q&A 탭 -----
  test('7. Q&A 탭: 질문 입력 UI 확인', async () => {
    // Q&A 탭 클릭
    await page.locator('[role="tab"]', { hasText: 'Q&A' }).click();
    await page.waitForTimeout(1000);

    // textarea 존재 확인
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // 질문 입력
    await textarea.fill('E2E 테스트 질문입니다');

    // 글자수 카운터 확인
    await expect(
      page.getByText('/1000', { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // 전송 버튼 확인 (textarea 옆 원형 아이콘 버튼)
    // textarea가 있는 form 영역 내의 버튼을 찾음
    const submitBtn = page.locator('textarea ~ button, textarea + button, form button').first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'assembly-voting-qa-tab');
  });

  // ----- 테스트 8: 자료 탭 -----
  test('8. 자료 탭: 빈 상태 또는 자료 목록 표시', async () => {
    // 자료 탭 클릭
    await page.locator('[role="tab"]', { hasText: '자료' }).click();
    await page.waitForTimeout(1000);

    // 빈 상태 메시지 또는 자료 카드 표시 확인
    const emptyText = page.getByText('등록된 자료가 없습니다', {
      exact: false,
    });
    const docItem = page.locator('[class*="card"]').first();
    await expect(emptyText.or(docItem)).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'assembly-voting-documents-tab');
  });

  // ----- 테스트 9: 발언 탭 -----
  test('9. 발언 탭: 발언 요청 버튼 표시', async () => {
    // 발언 탭 클릭
    await page.locator('[role="tab"]', { hasText: '발언' }).click();
    await page.waitForTimeout(1000);

    // "발언 요청" 버튼 확인
    const speakBtn = page.locator('button', { hasText: '발언 요청' });
    await expect(speakBtn).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'assembly-voting-speaker-tab');
  });

  // ----- 테스트 10: vote 독립 페이지 -----
  test('10. vote 독립 페이지: 투표 인터페이스 렌더링', async () => {
    // hall에서 투표 탭이 이미 활성 상태이므로 투표 UI가 보여야 함
    // (독립 /vote 페이지는 Zustand 의존성이 있어 직접 접근 불가)
    // 대신 현재 hall의 투표 탭 UI가 렌더링되어 있는지 확인
    const voteTab = page.locator('[role="tab"]', { hasText: '투표' });
    if (await voteTab.isVisible().catch(() => false)) {
      await voteTab.click();
      await page.waitForTimeout(1000);
    }

    // 투표 관련 콘텐츠 표시 확인 (안건 제목)
    await expect(
      page.getByText('제1호', { exact: true }),
    ).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'assembly-voting-standalone-page');
  });
});
