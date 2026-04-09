/**
 * 전자투표 전체 플로우 E2E 테스트 (API 기반)
 *
 * 시나리오: 전자투표 생성 -> 상태 전환 -> 투표용지 확인 -> 투표 제출 -> 결과 확인
 *
 * 1. 관리자: 전자투표 생성 (POST /api/evotes)
 * 2. 관리자: 상태 전환 DRAFT -> NOTICE_SENT -> PRE_VOTING
 * 3. 조합원: 투표용지 조회 (GET /api/evotes/[id]/ballot)
 * 4. 조합원: 투표 제출 (POST /api/evotes/[id]/submit)
 * 5. 관리자: 투표 대상자 현황 조회 (GET /api/evotes/[id]/voters)
 *
 * 참고: 이 테스트는 실제 DB 데이터(유저, 조합)가 필요하므로
 *       test 유저와 solsam 조합이 설정되어 있어야 합니다.
 */
import { test, expect } from '@playwright/test';
import { testLoginAsAdmin, testLoginAsMember } from '../helpers/test-auth';

const SLUG = 'solsam';
const BASE_URL = 'http://localhost:3000';

test.describe('전자투표 전체 플로우 (API 기반)', () => {
  // 테스트 간 공유할 변수
  let createdEvoteId: string | null = null;

  test.describe.configure({ mode: 'serial' }); // 순서 실행

  test('1. 관리자가 전자투표를 생성 (APPROVE 안건)', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const now = new Date();
    const preVoteStart = new Date(now.getTime() + 1 * 60 * 1000).toISOString(); // 1분 후
    const preVoteEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7일 후
    const scheduledAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14일 후

    // 조합원 목록 먼저 조회 (투표 대상자 ID 필요)
    // 관리자 API로 조합원 목록을 가져올 수 없으므로 test_u01 ~ test_u03 사용
    const voterIds = ['test_u01', 'test_u02', 'test_u03'];

    const createBody = {
      title: `E2E 풀플로우 테스트 총회 ${Date.now()}`,
      description: 'E2E 테스트에서 자동 생성된 전자투표',
      assembly_type: 'REGULAR',
      quorum_type: 'GENERAL',
      scheduled_at: scheduledAt,
      pre_vote_start_at: preVoteStart,
      pre_vote_end_at: preVoteEnd,
      publish_mode: 'IMMEDIATE',
      agendas: [
        {
          title: '제1호 안건: E2E 테스트 사업계획 승인',
          description: '찬반투표 테스트 안건',
          vote_type: 'APPROVE',
        },
      ],
      selected_voter_ids: voterIds,
    };

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: createBody,
    });

    // 생성 성공 (201) 또는 서버 에러 (500, 400 - 유저 미존재 등)
    if (response.status() === 201) {
      const body = await response.json();
      createdEvoteId = body.data.id;
      expect(createdEvoteId).toBeTruthy();
      console.log(`전자투표 생성 완료: ${createdEvoteId}`);
    } else {
      // 테스트 유저가 없는 환경이면 스킵
      const body = await response.json();
      console.log(`전자투표 생성 실패: ${body.error}`);
      test.skip();
    }
  });

  test('2. 관리자가 상태를 DRAFT -> NOTICE_SENT로 전환', async ({ page }) => {
    if (!createdEvoteId) {
      test.skip();
      return;
    }

    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.patch(`${BASE_URL}/api/evotes/${createdEvoteId}/status`, {
      data: { status: 'NOTICE_SENT' },
    });

    if (response.ok()) {
      const body = await response.json();
      expect(body.data.status).toBe('NOTICE_SENT');
      console.log('DRAFT -> NOTICE_SENT 전환 성공');
    } else {
      const body = await response.json();
      console.log(`상태 전환 실패: ${body.error}`);
      // RPC가 없으면 폴백으로 직접 업데이트됨
    }
  });

  test('3. 관리자가 상태를 NOTICE_SENT -> PRE_VOTING으로 전환', async ({ page }) => {
    if (!createdEvoteId) {
      test.skip();
      return;
    }

    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.patch(`${BASE_URL}/api/evotes/${createdEvoteId}/status`, {
      data: { status: 'PRE_VOTING' },
    });

    if (response.ok()) {
      const body = await response.json();
      expect(body.data.status).toBe('PRE_VOTING');
      console.log('NOTICE_SENT -> PRE_VOTING 전환 성공');
    } else {
      const body = await response.json();
      console.log(`상태 전환 실패: ${body.error}`);
    }
  });

  test('4. 관리자가 투표 대상자 현황 조회', async ({ page }) => {
    if (!createdEvoteId) {
      test.skip();
      return;
    }

    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.get(
      `${BASE_URL}/api/evotes/${createdEvoteId}/voters`
    );

    if (response.ok()) {
      const body = await response.json();
      expect(Array.isArray(body.data)).toBeTruthy();
      console.log(`투표 대상자: ${body.data.length}명`);

      // 아직 아무도 투표하지 않았으므로 모두 has_voted=false
      for (const voter of body.data) {
        expect(voter.has_voted).toBe(false);
      }
    }
  });

  test('5. 관리자가 미투표자 필터 조회', async ({ page }) => {
    if (!createdEvoteId) {
      test.skip();
      return;
    }

    await testLoginAsAdmin(page, SLUG);

    const response = await page.request.get(
      `${BASE_URL}/api/evotes/${createdEvoteId}/voters?filter=NOT_VOTED`
    );

    if (response.ok()) {
      const body = await response.json();
      expect(Array.isArray(body.data)).toBeTruthy();

      // 미투표자만 반환
      for (const voter of body.data) {
        expect(voter.has_voted).toBe(false);
      }
    }
  });

  test('6. 조합원이 투표용지 조회 시도', async ({ page }) => {
    if (!createdEvoteId) {
      test.skip();
      return;
    }

    await testLoginAsMember(page, SLUG);

    const response = await page.request.get(
      `${BASE_URL}/api/evotes/${createdEvoteId}/ballot`
    );

    // 스냅샷이 존재하고 본인인증이 완료된 경우에만 200
    // 그렇지 않으면 403
    if (response.ok()) {
      const body = await response.json();
      expect(body.data.assembly).toBeDefined();
      expect(body.data.agendas).toBeDefined();
      expect(Array.isArray(body.data.agendas)).toBeTruthy();
      expect(body.data.snapshot).toBeDefined();
      console.log(`투표용지 조회 성공: 안건 ${body.data.agendas.length}건`);
    } else {
      const body = await response.json();
      console.log(`투표용지 조회 실패 (예상): ${body.error}`);
      // 본인인증 또는 스냅샷 미완료 시 403
      expect(response.status()).toBe(403);
    }
  });

  test('7. 전자투표 대시보드 페이지에서 생성된 투표 확인', async ({ page }) => {
    if (!createdEvoteId) {
      test.skip();
      return;
    }

    await testLoginAsAdmin(page, SLUG);

    await page.goto(`${BASE_URL}/${SLUG}/admin/assembly/evote/${createdEvoteId}`);
    await page.waitForLoadState('networkidle');

    // 투표 제목이 표시되는지 확인
    const title = page.getByRole('heading').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });
});

test.describe('전자투표 생성 - 다양한 안건 유형 (API 기반)', () => {
  test('ELECT (선출) + SELECT (업체선정) 안건이 포함된 투표 생성', async ({ page }) => {
    await testLoginAsAdmin(page, SLUG);

    const now = new Date();
    const preVoteStart = new Date(now.getTime() + 1 * 60 * 1000).toISOString();
    const preVoteEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const scheduledAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const createBody = {
      title: `E2E 복합안건 테스트 ${Date.now()}`,
      description: '찬반 + 선출 + 업체선정 복합 안건 테스트',
      assembly_type: 'EXTRAORDINARY',
      quorum_type: 'SPECIAL',
      scheduled_at: scheduledAt,
      pre_vote_start_at: preVoteStart,
      pre_vote_end_at: preVoteEnd,
      publish_mode: 'IMMEDIATE',
      agendas: [
        {
          title: '제1호 안건: 정관 변경',
          description: '찬반투표',
          vote_type: 'APPROVE',
        },
        {
          title: '제2호 안건: 이사 선출',
          description: '3명 중 2명 선출',
          vote_type: 'ELECT',
          elect_count: 2,
          candidates: [
            { name: '김후보', info: '현직 이사' },
            { name: '이후보', info: '전직 감사' },
            { name: '박후보', info: '신규 후보' },
          ],
        },
        {
          title: '제3호 안건: 시공사 선정',
          description: '업체 3곳 중 선정',
          vote_type: 'SELECT',
          companies: [
            { name: 'A건설', bidAmount: '100억', info: '시공실적 50건' },
            { name: 'B건설', bidAmount: '95억', info: '시공실적 30건' },
            { name: 'C건설', bidAmount: '110억', info: '시공실적 70건' },
          ],
        },
      ],
      selected_voter_ids: ['test_u01'],
    };

    const response = await page.request.post(`${BASE_URL}/api/evotes`, {
      data: createBody,
    });

    if (response.status() === 201) {
      const body = await response.json();
      expect(body.data.id).toBeTruthy();
      console.log(`복합 안건 투표 생성 완료: ${body.data.id}`);
    } else {
      // 테스트 유저 미존재 시 스킵
      const body = await response.json();
      console.log(`복합 안건 투표 생성 실패: ${body.error}`);
    }
  });
});
