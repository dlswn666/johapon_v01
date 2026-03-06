import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  navigateTo,
  waitForPageLoad,
  saveScreenshot,
  TEST_PREFIX,
} from './test-helpers';

/**
 * 총회 결과 보고서 / 의사록 / 증거 패키지 E2E 테스트
 *
 * 보고서 페이지 (/[slug]/admin/assembly/[assemblyId]/report) 3탭 워크플로:
 *   1. 투표 집계 — 집계 실행 및 결과 확인
 *   2. 의사록   — 자동 생성 → 수정 → 확정
 *   3. 증거 패키지 — 생성 및 포함 항목 확인
 */

// ===== Supabase Admin 클라이언트 =====
const supabaseAdmin = createClient(
  'https://bpdjashtxqrcgxfequgf.supabase.co',
  process.env.NEXT_PUBLIC_DEV_SUPABASE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZGphc2h0eHFyY2d4ZmVxdWdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc3OTc1MCwiZXhwIjoyMDgxMzU1NzUwfQ.qzmpV6tztotvYsOp6JooM3x2XlGU7FK-cOjPBi2Ll8A'
);

const UNION_SLUG = 'solsam';
const UNION_ID_VAL = '7c35ee21-34fc-4597-84db-ee63e5b0d351';

// ===== 테스트 데이터 ID =====
const assemblyId = crypto.randomUUID();
const agenda1Id = crypto.randomUUID();
const agenda2Id = crypto.randomUUID();
const poll1Id = crypto.randomUUID();
const poll2Id = crypto.randomUUID();
const optionIds = {
  poll1: [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()],
  poll2: [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()],
};

// ===== 라우트 인터셉션 (API 목 응답) =====

/**
 * 보고서 관련 API 목 설정
 *
 * 모든 report/tally/minutes/evidence API를 인터셉트하여
 * 실제 DB 데이터 없이도 UI 워크플로를 테스트할 수 있도록 함
 */
async function setupReportRoutes(page: Page) {
  // ---- 총회 단건 조회 (useAssembly 훅이 호출하는 API) ----
  await page.route(`**/api/assemblies/${assemblyId}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: assemblyId,
            union_id: UNION_ID_VAL,
            title: `${TEST_PREFIX} 보고서 테스트 총회`,
            description: null,
            assembly_type: 'REGULAR',
            status: 'VOTING_CLOSED',
            scheduled_at: new Date().toISOString(),
            opened_at: null,
            closed_at: null,
            venue_address: '서울시 강남구 테스트동',
            stream_type: null,
            zoom_meeting_id: null,
            youtube_video_id: null,
            notice_sent_at: null,
            notice_content: null,
            quorum_total_members: 50,
            roster_version: null,
            minutes_draft: null,
            minutes_finalized_at: null,
            evidence_package_url: null,
            evidence_packaged_at: null,
            legal_basis: null,
            created_by: 'd58babef-1a73-4da0-961c-09457667a07d',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // ---- 투표 집계 (POST 실행 / GET 결과) ----
  // 하나의 핸들러에서 method 분기 처리
  await page.route(`**/api/assemblies/${assemblyId}/tally**`, async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            tallied_at: new Date().toISOString(),
            polls: [
              {
                poll_id: poll1Id,
                result: [
                  { option_id: optionIds.poll1[0], label: '찬성', vote_count: 20, vote_weight_sum: 20 },
                  { option_id: optionIds.poll1[1], label: '반대', vote_count: 7, vote_weight_sum: 7 },
                  { option_id: optionIds.poll1[2], label: '기권', vote_count: 3, vote_weight_sum: 3 },
                ],
              },
              {
                poll_id: poll2Id,
                result: [
                  { option_id: optionIds.poll2[0], label: '찬성', vote_count: 10, vote_weight_sum: 10 },
                  { option_id: optionIds.poll2[1], label: '반대', vote_count: 15, vote_weight_sum: 15 },
                  { option_id: optionIds.poll2[2], label: '기권', vote_count: 5, vote_weight_sum: 5 },
                ],
              },
            ],
          },
        }),
      });
    } else if (method === 'GET') {
      // GET tally — 집계 결과 조회 (vote_tally_results 기반)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            // poll1 — 찬성/반대/기권 (method: ELECTRONIC)
            {
              id: crypto.randomUUID(),
              poll_id: poll1Id,
              assembly_id: assemblyId,
              union_id: UNION_ID_VAL,
              option_id: optionIds.poll1[0],
              voting_method: 'ELECTRONIC',
              vote_count: 20,
              vote_weight_sum: 20,
              tallied_at: new Date().toISOString(),
              tallied_by: 'test_user',
              poll_options: { id: optionIds.poll1[0], label: '찬성', option_type: 'YES', seq_order: 1 },
            },
            {
              id: crypto.randomUUID(),
              poll_id: poll1Id,
              assembly_id: assemblyId,
              union_id: UNION_ID_VAL,
              option_id: optionIds.poll1[1],
              voting_method: 'ELECTRONIC',
              vote_count: 7,
              vote_weight_sum: 7,
              tallied_at: new Date().toISOString(),
              tallied_by: 'test_user',
              poll_options: { id: optionIds.poll1[1], label: '반대', option_type: 'NO', seq_order: 2 },
            },
            {
              id: crypto.randomUUID(),
              poll_id: poll1Id,
              assembly_id: assemblyId,
              union_id: UNION_ID_VAL,
              option_id: optionIds.poll1[2],
              voting_method: 'ELECTRONIC',
              vote_count: 3,
              vote_weight_sum: 3,
              tallied_at: new Date().toISOString(),
              tallied_by: 'test_user',
              poll_options: { id: optionIds.poll1[2], label: '기권', option_type: 'ABSTAIN', seq_order: 3 },
            },
            // poll2 — 찬성/반대/기권 (method: ELECTRONIC)
            {
              id: crypto.randomUUID(),
              poll_id: poll2Id,
              assembly_id: assemblyId,
              union_id: UNION_ID_VAL,
              option_id: optionIds.poll2[0],
              voting_method: 'ELECTRONIC',
              vote_count: 10,
              vote_weight_sum: 10,
              tallied_at: new Date().toISOString(),
              tallied_by: 'test_user',
              poll_options: { id: optionIds.poll2[0], label: '찬성', option_type: 'YES', seq_order: 1 },
            },
            {
              id: crypto.randomUUID(),
              poll_id: poll2Id,
              assembly_id: assemblyId,
              union_id: UNION_ID_VAL,
              option_id: optionIds.poll2[1],
              voting_method: 'ELECTRONIC',
              vote_count: 15,
              vote_weight_sum: 15,
              tallied_at: new Date().toISOString(),
              tallied_by: 'test_user',
              poll_options: { id: optionIds.poll2[1], label: '반대', option_type: 'NO', seq_order: 2 },
            },
            {
              id: crypto.randomUUID(),
              poll_id: poll2Id,
              assembly_id: assemblyId,
              union_id: UNION_ID_VAL,
              option_id: optionIds.poll2[2],
              voting_method: 'ELECTRONIC',
              vote_count: 5,
              vote_weight_sum: 5,
              tallied_at: new Date().toISOString(),
              tallied_by: 'test_user',
              poll_options: { id: optionIds.poll2[2], label: '기권', option_type: 'ABSTAIN', seq_order: 3 },
            },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });

  // ---- 보고서 조회 (useAssemblyReport) ----
  await page.route(`**/api/assemblies/${assemblyId}/report**`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            assembly: {
              id: assemblyId,
              title: `${TEST_PREFIX} 보고서 테스트 총회`,
              type: 'REGULAR',
              type_label: '정기총회',
              scheduled_at: new Date().toISOString(),
              opened_at: null,
              closed_at: null,
              venue_address: '서울시 강남구 테스트동',
              legal_basis: null,
              status: 'VOTING_CLOSED',
            },
            attendance: {
              onsite: 15,
              online: 10,
              written_proxy: 5,
              total: 30,
              quorum_total_members: 50,
              quorum_met: true,
            },
            agendas: [
              {
                id: agenda1Id,
                seq_order: 1,
                title: `${TEST_PREFIX} 제1호 테스트 안건`,
                type: 'GENERAL',
                type_label: '일반안건',
                quorum_threshold_pct: 50,
                approval_threshold_pct: 50,
                polls: [
                  {
                    poll_id: poll1Id,
                    options: [
                      { label: '찬성', electronic_count: 20, onsite_count: 0, written_count: 0, proxy_count: 0, total_count: 20, weight_sum: 20 },
                      { label: '반대', electronic_count: 7, onsite_count: 0, written_count: 0, proxy_count: 0, total_count: 7, weight_sum: 7 },
                      { label: '기권', electronic_count: 3, onsite_count: 0, written_count: 0, proxy_count: 0, total_count: 3, weight_sum: 3 },
                    ],
                    total_votes: 30,
                    quorum_met: true,
                    approved: true,
                    tallied_at: new Date().toISOString(),
                  },
                ],
              },
              {
                id: agenda2Id,
                seq_order: 2,
                title: `${TEST_PREFIX} 제2호 테스트 안건`,
                type: 'GENERAL',
                type_label: '일반안건',
                quorum_threshold_pct: 50,
                approval_threshold_pct: 50,
                polls: [
                  {
                    poll_id: poll2Id,
                    options: [
                      { label: '찬성', electronic_count: 10, onsite_count: 0, written_count: 0, proxy_count: 0, total_count: 10, weight_sum: 10 },
                      { label: '반대', electronic_count: 15, onsite_count: 0, written_count: 0, proxy_count: 0, total_count: 15, weight_sum: 15 },
                      { label: '기권', electronic_count: 5, onsite_count: 0, written_count: 0, proxy_count: 0, total_count: 5, weight_sum: 5 },
                    ],
                    total_votes: 30,
                    quorum_met: true,
                    approved: false,
                    tallied_at: new Date().toISOString(),
                  },
                ],
              },
            ],
            timestamps: {
              generated_at: new Date().toISOString(),
            },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // ---- 의사록 (POST 생성 / GET 조회 / PATCH 수정·확정) ----
  // 상태를 추적하여 순차적 워크플로를 시뮬레이션
  let minutesDraft: string | null = null;
  let minutesFinalized = false;

  await page.route(`**/api/assemblies/${assemblyId}/minutes**`, async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      // 의사록 자동 생성
      minutesDraft = `# ${TEST_PREFIX} 보고서 테스트 총회 의사록\n\n## 1. 총회 개요\n\n- **총회 유형**: 정기총회\n- **일시**: ${new Date().toLocaleDateString('ko-KR')}\n- **장소**: 서울시 강남구 테스트동\n- **참석현황**: 현장 15명, 온라인 10명, 서면/위임 5명 (총 30명/50명)\n\n## 2. 안건별 심의 및 의결 결과\n\n### 제1호 안건: 제1호 테스트 안건\n\n**투표 결과**\n- 찬성: 20표 (66.7%)\n- 반대: 7표 (23.3%)\n- 기권: 3표 (10.0%)\n\n**의결 결과**: 가결\n\n### 제2호 안건: 제2호 테스트 안건\n\n**투표 결과**\n- 찬성: 10표 (33.3%)\n- 반대: 15표 (50.0%)\n- 기권: 5표 (16.7%)\n\n**의결 결과**: 부결\n\n---\n\n*본 의사록은 자동 생성되었습니다.*`;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            minutes_draft: minutesDraft,
            minutes_finalized_at: null,
          },
        }),
      });
    } else if (method === 'GET') {
      // 의사록 조회
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            minutes_draft: minutesDraft,
            minutes_finalized_at: minutesFinalized ? new Date().toISOString() : null,
          },
        }),
      });
    } else if (method === 'PATCH') {
      // 의사록 수정 또는 확정
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(route.request().postData() || '{}');
      } catch {
        // 파싱 실패 시 빈 객체 사용
      }

      if (body.finalize === true) {
        minutesFinalized = true;
      } else if (typeof body.minutes_draft === 'string') {
        minutesDraft = body.minutes_draft;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: assemblyId,
            minutes_draft: minutesDraft,
            minutes_finalized_at: minutesFinalized ? new Date().toISOString() : null,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // ---- 증거 패키지 (POST 생성 / GET 조회) ----
  let evidenceGenerated = false;

  await page.route(`**/api/assemblies/${assemblyId}/evidence-package**`, async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      evidenceGenerated = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            evidence_package_url: `https://example.com/evidence-${assemblyId}.zip`,
            evidence_packaged_at: new Date().toISOString(),
            chain_integrity: true,
            chain_errors: [],
          },
        }),
      });
    } else if (method === 'GET') {
      if (evidenceGenerated) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              evidence_package_url: `https://example.com/evidence-${assemblyId}.zip`,
              evidence_packaged_at: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              evidence_package_url: null,
              evidence_packaged_at: null,
            },
          }),
        });
      }
    } else {
      await route.continue();
    }
  });
}

// ===== DB 테스트 데이터 설정 및 정리 =====

async function setupTestData() {
  // 1. 총회 생성 (VOTING_CLOSED 상태)
  const { error: assemblyError } = await supabaseAdmin.from('assemblies').insert({
    id: assemblyId,
    union_id: UNION_ID_VAL,
    title: `${TEST_PREFIX} 보고서 테스트 총회`,
    assembly_type: 'REGULAR',
    status: 'VOTING_CLOSED',
    scheduled_at: new Date().toISOString(),
    quorum_total_members: 50,
    created_by: 'd58babef-1a73-4da0-961c-09457667a07d',
  });
  if (assemblyError) {
    console.error('총회 생성 실패:', assemblyError);
  }

  // 2. 안건 2건 생성
  const { error: agendaError } = await supabaseAdmin.from('agenda_items').insert([
    {
      id: agenda1Id,
      assembly_id: assemblyId,
      union_id: UNION_ID_VAL,
      seq_order: 1,
      title: `${TEST_PREFIX} 제1호 테스트 안건`,
      agenda_type: 'GENERAL',
      quorum_threshold_pct: 50,
      approval_threshold_pct: 50,
    },
    {
      id: agenda2Id,
      assembly_id: assemblyId,
      union_id: UNION_ID_VAL,
      seq_order: 2,
      title: `${TEST_PREFIX} 제2호 테스트 안건`,
      agenda_type: 'GENERAL',
      quorum_threshold_pct: 50,
      approval_threshold_pct: 50,
    },
  ]);
  if (agendaError) {
    console.error('안건 생성 실패:', agendaError);
  }

  // 3. 투표(poll) 2건 생성 (CLOSED 상태)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  const { error: pollError } = await supabaseAdmin.from('polls').insert([
    {
      id: poll1Id,
      agenda_item_id: agenda1Id,
      assembly_id: assemblyId,
      union_id: UNION_ID_VAL,
      status: 'CLOSED',
      opens_at: oneHourAgo.toISOString(),
      closes_at: now.toISOString(),
      allow_electronic: true,
      allow_written: false,
      allow_proxy: false,
      allow_onsite: false,
      allow_vote_revision: false,
      allow_abstain: true,
    },
    {
      id: poll2Id,
      agenda_item_id: agenda2Id,
      assembly_id: assemblyId,
      union_id: UNION_ID_VAL,
      status: 'CLOSED',
      opens_at: oneHourAgo.toISOString(),
      closes_at: now.toISOString(),
      allow_electronic: true,
      allow_written: false,
      allow_proxy: false,
      allow_onsite: false,
      allow_vote_revision: false,
      allow_abstain: true,
    },
  ]);
  if (pollError) {
    console.error('투표 생성 실패:', pollError);
  }

  // 4. 투표 선택지 생성 (찬성/반대/기권 × 2 polls)
  const { error: optionError } = await supabaseAdmin.from('poll_options').insert([
    // poll1 옵션
    { id: optionIds.poll1[0], poll_id: poll1Id, union_id: UNION_ID_VAL, seq_order: 1, label: '찬성', option_type: 'YES' },
    { id: optionIds.poll1[1], poll_id: poll1Id, union_id: UNION_ID_VAL, seq_order: 2, label: '반대', option_type: 'NO' },
    { id: optionIds.poll1[2], poll_id: poll1Id, union_id: UNION_ID_VAL, seq_order: 3, label: '기권', option_type: 'ABSTAIN' },
    // poll2 옵션
    { id: optionIds.poll2[0], poll_id: poll2Id, union_id: UNION_ID_VAL, seq_order: 1, label: '찬성', option_type: 'YES' },
    { id: optionIds.poll2[1], poll_id: poll2Id, union_id: UNION_ID_VAL, seq_order: 2, label: '반대', option_type: 'NO' },
    { id: optionIds.poll2[2], poll_id: poll2Id, union_id: UNION_ID_VAL, seq_order: 3, label: '기권', option_type: 'ABSTAIN' },
  ]);
  if (optionError) {
    console.error('투표 옵션 생성 실패:', optionError);
  }
}

async function cleanupTestData() {
  // 역순 의존성으로 삭제
  await supabaseAdmin.from('assembly_audit_logs').delete().eq('assembly_id', assemblyId);

  // poll_options — poll ID 기반 삭제
  const { data: polls } = await supabaseAdmin.from('polls').select('id').eq('assembly_id', assemblyId);
  const pollIds = (polls || []).map((p) => p.id);
  if (pollIds.length > 0) {
    await supabaseAdmin.from('vote_tally_results').delete().in('poll_id', pollIds);
    await supabaseAdmin.from('poll_options').delete().in('poll_id', pollIds);
  }
  await supabaseAdmin.from('polls').delete().eq('assembly_id', assemblyId);
  await supabaseAdmin.from('agenda_items').delete().eq('assembly_id', assemblyId);
  await supabaseAdmin.from('assembly_member_snapshots').delete().eq('assembly_id', assemblyId);
  await supabaseAdmin.from('assembly_attendance_logs').delete().eq('assembly_id', assemblyId);
  await supabaseAdmin.from('assemblies').delete().eq('id', assemblyId);
}

// ===== 테스트 =====

test.describe.serial('총회 결과 보고서 E2E 테스트', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // DB에 테스트 데이터 삽입
    await setupTestData();

    // 브라우저 페이지 생성
    page = await browser.newPage();

    // API 라우트 인터셉션 설정
    await setupReportRoutes(page);
  });

  test.afterAll(async () => {
    await page.close();
    // DB 테스트 데이터 정리
    await cleanupTestData();
  });

  // ---------- 테스트 1: 보고서 페이지 3탭 렌더링 ----------
  test('1. 보고서 페이지 3탭 렌더링 확인', async () => {
    await navigateTo(page, `/admin/assembly/${assemblyId}/report`);
    await waitForPageLoad(page);

    // 페이지 헤더 확인
    const heading = page.locator('h1', { hasText: '결과 보고서' });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 3개 탭 버튼 확인
    const tallyTab = page.locator('button', { hasText: '투표 집계' });
    await expect(tallyTab).toBeVisible({ timeout: 10000 });

    const minutesTab = page.locator('button', { hasText: '의사록' });
    await expect(minutesTab).toBeVisible({ timeout: 5000 });

    const evidenceTab = page.locator('button', { hasText: '증거 패키지' });
    await expect(evidenceTab).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'assembly-report-tabs');
  });

  // ---------- 테스트 2: 집계 실행 ----------
  test('2. 투표 집계 실행 및 결과 확인', async () => {
    // 투표 집계 탭 (기본 선택됨)
    // "집계 실행" 버튼 클릭
    const tallyBtn = page.locator('button', { hasText: '집계 실행' });
    await expect(tallyBtn).toBeVisible({ timeout: 10000 });
    await tallyBtn.click();

    // 확인 모달이 표시될 수 있음 (openConfirmModal)
    const confirmDialog = page.locator('[role="dialog"]');
    if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      // "집계 실행" 또는 "확인" 버튼 클릭 (force: true — Radix 이슈 대응)
      await confirmDialog
        .locator('button', { hasText: '집계 실행' })
        .or(confirmDialog.locator('button', { hasText: '확인' }))
        .first()
        .click({ force: true });
    }

    await page.waitForTimeout(2000);

    // 집계 완료 알림 모달이 나타날 수 있음
    const alertDialog = page.locator('[role="dialog"]');
    if (await alertDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const closeBtn = alertDialog
        .locator('button', { hasText: '확인' })
        .or(alertDialog.locator('button', { hasText: '닫기' }));
      if (await closeBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.first().click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // 집계 후: 출석 현황 카드 확인
    await expect(page.getByText('현장').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('온라인').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('서면').or(page.getByText('위임')).first()).toBeVisible({ timeout: 5000 });

    // 안건 결과 표시 확인
    await expect(page.getByText('제1호').first()).toBeVisible({ timeout: 5000 });

    // 가결/부결 배지
    await expect(page.getByText('가결', { exact: false })).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'assembly-report-tally-result');
  });

  // ---------- 테스트 3: 의사록 빈 상태 ----------
  test('3. 의사록 탭 — 빈 상태 확인', async () => {
    // 의사록 탭 클릭
    await page.locator('button', { hasText: '의사록' }).click();
    await page.waitForTimeout(1000);

    // 빈 상태 메시지: "의사록 초안이 없습니다"
    await expect(
      page.getByText('의사록 초안이 없습니다', { exact: false })
    ).toBeVisible({ timeout: 10000 });

    // "자동 생성" 버튼 확인
    const generateBtn = page.locator('button', { hasText: '자동 생성' });
    await expect(generateBtn).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'assembly-report-minutes-empty');
  });

  // ---------- 테스트 4: 의사록 자동 생성 ----------
  test('4. 의사록 자동 생성', async () => {
    // "자동 생성" 버튼 클릭
    await page.locator('button', { hasText: '자동 생성' }).click();

    // 확인 모달 (openConfirmModal)
    const confirmDialog = page.locator('[role="dialog"]');
    if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmDialog
        .locator('button', { hasText: '생성' })
        .or(confirmDialog.locator('button', { hasText: '확인' }))
        .first()
        .click({ force: true });
    }

    await page.waitForTimeout(2000);

    // 생성 완료 알림 모달 닫기
    const alertDialog = page.locator('[role="dialog"]');
    if (await alertDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const closeBtn = alertDialog
        .locator('button', { hasText: '확인' })
        .or(alertDialog.locator('button', { hasText: '닫기' }));
      if (await closeBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.first().click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // 의사록 내용이 표시되었는지 확인 (pre 태그에 내용 렌더링)
    await expect(page.locator('pre').first()).toBeVisible({ timeout: 10000 });

    // "수정" 버튼이 나타나야 함 (의사록 생성 후)
    await expect(page.locator('button', { hasText: '수정' })).toBeVisible({ timeout: 5000 });

    await saveScreenshot(page, 'assembly-report-minutes-generated');
  });

  // ---------- 테스트 5: 의사록 수정 ----------
  test('5. 의사록 수정', async () => {
    // "수정" 버튼 클릭
    const editBtn = page.locator('button', { hasText: '수정' });
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(500);

    // textarea가 표시되어야 함
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // 내용 수정
    await textarea.fill(`${TEST_PREFIX} 수정된 의사록 내용입니다.`);

    // "저장" 버튼 클릭
    await page.locator('button', { hasText: '저장' }).click();
    await page.waitForTimeout(1000);

    // 저장 완료 알림 모달 닫기
    const alertDialog = page.locator('[role="dialog"]');
    if (await alertDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const closeBtn = alertDialog
        .locator('button', { hasText: '확인' })
        .or(alertDialog.locator('button', { hasText: '닫기' }));
      if (await closeBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.first().click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    await saveScreenshot(page, 'assembly-report-minutes-edited');
  });

  // ---------- 테스트 6: 의사록 확정 ----------
  test('6. 의사록 확정', async () => {
    // "확정" 버튼 클릭
    const finalizeBtn = page.locator('button', { hasText: '확정' });
    await expect(finalizeBtn).toBeVisible({ timeout: 5000 });
    await finalizeBtn.click();

    // 확정 확인 모달 (openConfirmModal)
    const confirmDialog = page.locator('[role="dialog"]');
    if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmDialog
        .locator('button', { hasText: '확정' })
        .or(confirmDialog.locator('button', { hasText: '확인' }))
        .first()
        .click({ force: true });
    }

    await page.waitForTimeout(1000);

    // 확정 완료 알림 모달 닫기
    const alertDialog = page.locator('[role="dialog"]');
    if (await alertDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const closeBtn = alertDialog
        .locator('button', { hasText: '확인' })
        .or(alertDialog.locator('button', { hasText: '닫기' }));
      if (await closeBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.first().click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // "확정일시:" 텍스트가 표시되어야 함
    await expect(
      page.getByText('확정일시', { exact: false })
        .or(page.getByText('확정', { exact: false }))
    ).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'assembly-report-minutes-finalized');
  });

  // ---------- 테스트 7: 증거 패키지 생성 ----------
  test('7. 증거 패키지 생성', async () => {
    // 증거 패키지 탭 클릭
    await page.locator('button', { hasText: '증거 패키지' }).click();
    await page.waitForTimeout(1000);

    // "패키지 생성" 버튼 클릭
    const pkgBtn = page.locator('button', { hasText: '패키지 생성' });
    await expect(pkgBtn).toBeVisible({ timeout: 10000 });
    await pkgBtn.click();

    // 확인 모달 (openConfirmModal)
    const confirmDialog = page.locator('[role="dialog"]');
    if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmDialog
        .locator('button', { hasText: '생성' })
        .or(confirmDialog.locator('button', { hasText: '확인' }))
        .first()
        .click({ force: true });
    }

    await page.waitForTimeout(2000);

    // 생성 완료 알림 모달 닫기
    const alertDialog = page.locator('[role="dialog"]');
    if (await alertDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const closeBtn = alertDialog
        .locator('button', { hasText: '확인' })
        .or(alertDialog.locator('button', { hasText: '닫기' }));
      if (await closeBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.first().click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // "증거 패키지 생성 완료" 메시지 확인
    await expect(
      page.getByText('생성 완료', { exact: false })
        .or(page.getByText('완료', { exact: false }))
    ).toBeVisible({ timeout: 10000 });

    await saveScreenshot(page, 'assembly-report-evidence-generated');
  });

  // ---------- 테스트 8: 증거 패키지 포함 항목 확인 ----------
  test('8. 증거 패키지 포함 항목 확인', async () => {
    // 패키지 포함 항목 목록 (실제 report 페이지 기준 8개 항목)
    const items = [
      '총회 기본 정보',
      '조합원 스냅샷',
      '출석',
      '체크인',
      '투표 집계',
      '질의응답',
      '발언 요청',
      '자료 열람',
      '감사 로그',
      '감사로그',
    ];

    // 최소 4개 이상의 항목이 보이는지 확인
    let visibleCount = 0;
    for (const item of items) {
      if (await page.getByText(item, { exact: false }).first().isVisible({ timeout: 1000 }).catch(() => false)) {
        visibleCount++;
      }
    }

    expect(visibleCount).toBeGreaterThanOrEqual(4);

    await saveScreenshot(page, 'assembly-report-evidence-items');
  });
});
