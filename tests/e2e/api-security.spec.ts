/**
 * API-Level Security Tests for Johapon Electronic Voting System
 *
 * These tests verify security controls at the API layer.
 * They use Playwright's request context (no browser needed) to call API endpoints directly.
 *
 * IMPORTANT: This is a PRODUCTION Supabase instance.
 * - Tests use test-prefixed data only
 * - Tests do NOT create real assemblies or votes
 * - Tests verify rejection of invalid/malicious requests
 *
 * Related issues: DEV-001 (SEC-C1), DEV-003 (BIZ-C2), DEV-006 (SEC-H3), DEV-014
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// These IDs are intentionally fake / nonexistent.
// The tests verify that the server rejects the requests properly,
// so we never need real data.
const FAKE_UNION_ID = 'test_e2e_fake_union_00000000';
const FAKE_ASSEMBLY_ID = 'test_e2e_fake_assembly_00000000';
const FAKE_POLL_ID = 'test_e2e_fake_poll_00000000';
const FAKE_OPTION_ID = 'test_e2e_fake_option_00000000';

// ---------------------------------------------------------------------------
// E1: union_id injection blocked (SEC-C1)
// Scenarios: A4, E1
// ---------------------------------------------------------------------------

test.describe('E1: union_id injection blocked (SEC-C1)', () => {
  test('GET /api/assemblies rejects unauthenticated requests', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/assemblies`);
    // Without auth, should get 401 or redirect
    expect([401, 403, 302]).toContain(response.status());
  });

  test('GET /api/assemblies with injected union_id rejects unauthenticated', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/assemblies?union_id=${FAKE_UNION_ID}`,
    );
    // Even with union_id param, unauthenticated should be rejected
    expect([401, 403, 302]).toContain(response.status());
  });

  test('POST /api/assemblies rejects unauthenticated requests', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/assemblies`, {
      data: {
        title: 'E2E 테스트 총회 - injection test',
        union_id: FAKE_UNION_ID,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect([401, 403, 302]).toContain(response.status());
  });

  test('POST /api/assemblies with foreign union_id injection rejects unauthenticated', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/assemblies`, {
      data: {
        title: 'E2E injection test - should fail',
        union_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        assembly_type: 'REGULAR',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect([401, 403, 302]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// E2: auth nonce validation on vote casting
// Scenarios: E2, C2
// ---------------------------------------------------------------------------

test.describe('E2: auth nonce validation on vote casting', () => {
  test('POST /api/votes/cast rejects unauthenticated request', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/votes/cast`, {
      data: {
        pollId: FAKE_POLL_ID,
        assemblyId: FAKE_ASSEMBLY_ID,
        optionId: FAKE_OPTION_ID,
        authNonce: 'a'.repeat(64),
      },
    });
    expect([401, 403, 302]).toContain(response.status());
  });

  test('POST /api/votes/cast rejects empty body', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/votes/cast`, {
      data: {},
    });
    expect(response.ok()).toBe(false);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/votes/cast rejects missing parameters', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/votes/cast`, {
      data: {
        authNonce: 'a'.repeat(64),
      },
    });
    // Either auth failure (401/403) or param validation (400)
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.ok()).toBe(false);
  });

  test('authNonce format validation regex is correct', async () => {
    /**
     * The route handler at app/api/votes/cast/route.ts validates authNonce with:
     *   /^[0-9a-f]{64}$/i
     *
     * This unit-style test verifies the regex logic independently.
     * Actual API-level enforcement requires a valid session.
     */
    const validNonce = /^[0-9a-f]{64}$/i;

    // Valid cases
    expect(validNonce.test('a'.repeat(64))).toBe(true);
    expect(validNonce.test('0123456789abcdef'.repeat(4))).toBe(true);
    expect(validNonce.test('A'.repeat(64))).toBe(true); // case-insensitive

    // Invalid cases
    expect(validNonce.test('a'.repeat(63))).toBe(false);   // too short
    expect(validNonce.test('a'.repeat(65))).toBe(false);   // too long
    expect(validNonce.test('z'.repeat(64))).toBe(false);   // non-hex
    expect(validNonce.test('')).toBe(false);                // empty
    expect(validNonce.test('g'.repeat(64))).toBe(false);   // non-hex letter
  });
});

// ---------------------------------------------------------------------------
// E3: vote_ballots RLS enforcement
// Scenario: E3
// ---------------------------------------------------------------------------

test.describe('E3: vote_ballots RLS enforcement', () => {
  test('no public API endpoint exposes vote_ballots directly', async ({ request }) => {
    const ballotEndpoints = [
      '/api/votes/ballots',
      '/api/vote_ballots',
      '/api/ballots',
    ];

    for (const endpoint of ballotEndpoints) {
      const response = await request.get(`${BASE_URL}${endpoint}`);
      // Should be 404 (endpoint does not exist) or auth error
      expect([404, 401, 403, 302]).toContain(response.status());
    }
  });

  test('/api/votes/my does not expose ballot content when unauthenticated', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/votes/my`);
    // Without auth, we get rejected
    expect([401, 403, 302]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// Baseline: All critical endpoints require authentication
// ---------------------------------------------------------------------------

test.describe('All critical API endpoints require authentication', () => {
  const protectedEndpoints: Array<{ method: 'GET' | 'POST' | 'PATCH'; path: string }> = [
    { method: 'GET', path: '/api/assemblies' },
    { method: 'POST', path: '/api/assemblies' },
    { method: 'POST', path: '/api/votes/cast' },
    { method: 'GET', path: '/api/votes/my' },
    { method: 'GET', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}` },
    { method: 'PATCH', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}/status` },
    { method: 'POST', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}/snapshots` },
    { method: 'GET', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}/agendas` },
    { method: 'POST', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}/agendas` },
    { method: 'GET', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}/delegation/my` },
    { method: 'GET', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}/quorum` },
    { method: 'POST', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}/results/publish` },
    { method: 'GET', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}/delegation/incoming` },
    { method: 'GET', path: `/api/assemblies/${FAKE_ASSEMBLY_ID}/delegation/admin` },
  ];

  for (const { method, path } of protectedEndpoints) {
    test(`${method} ${path} requires authentication`, async ({ request }) => {
      let response;
      switch (method) {
        case 'GET':
          response = await request.get(`${BASE_URL}${path}`);
          break;
        case 'POST':
          response = await request.post(`${BASE_URL}${path}`, { data: {} });
          break;
        case 'PATCH':
          response = await request.patch(`${BASE_URL}${path}`, { data: {} });
          break;
      }

      expect(response).toBeDefined();
      // All protected endpoints should reject unauthenticated requests
      expect([401, 403, 302, 307]).toContain(response!.status());
    });
  }
});

// ---------------------------------------------------------------------------
// Assembly status transition validation (security aspect)
// Scenario: B4 security aspect
// ---------------------------------------------------------------------------

test.describe('Assembly status transition rejects unauthorized changes', () => {
  test('PATCH status rejects unauthenticated request', async ({ request }) => {
    const response = await request.patch(
      `${BASE_URL}/api/assemblies/${FAKE_ASSEMBLY_ID}/status`,
      {
        data: { status: 'VOTING' },
      },
    );
    expect([401, 403, 302]).toContain(response.status());
  });

  test('PATCH status rejects unauthenticated CANCELLED transition', async ({ request }) => {
    const response = await request.patch(
      `${BASE_URL}/api/assemblies/${FAKE_ASSEMBLY_ID}/status`,
      {
        data: { status: 'CANCELLED' },
      },
    );
    expect([401, 403, 302]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// Health endpoint baseline (connectivity check)
// ---------------------------------------------------------------------------

test.describe('Baseline connectivity', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Vote receipt verification security
// Scenario: C3
// ---------------------------------------------------------------------------

test.describe('Vote receipt verification security', () => {
  test('verify-receipt endpoint rejects without parameters', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/votes/verify-receipt`);
    expect(response.ok()).toBe(false);
  });

  test('receipt/verify endpoint rejects without parameters', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/votes/receipt/verify`,
      { data: {} },
    );
    expect(response.ok()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Emergency endpoints require auth
// ---------------------------------------------------------------------------

test.describe('Emergency endpoints require authentication', () => {
  const emergencyEndpoints = [
    `/api/assemblies/${FAKE_ASSEMBLY_ID}/emergency/pause`,
    `/api/assemblies/${FAKE_ASSEMBLY_ID}/emergency/resume`,
    `/api/assemblies/${FAKE_ASSEMBLY_ID}/emergency/extend`,
    `/api/assemblies/${FAKE_ASSEMBLY_ID}/emergency/written-transition`,
  ];

  for (const path of emergencyEndpoints) {
    test(`POST ${path} requires auth`, async ({ request }) => {
      const response = await request.post(`${BASE_URL}${path}`, { data: {} });
      expect([401, 403, 302]).toContain(response.status());
    });
  }
});

// ---------------------------------------------------------------------------
// Onsite ballot endpoints require auth
// ---------------------------------------------------------------------------

test.describe('Onsite ballot endpoints require authentication', () => {
  test('POST onsite-ballot requires auth', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/assemblies/${FAKE_ASSEMBLY_ID}/onsite-ballot`,
      { data: {} },
    );
    expect([401, 403, 302]).toContain(response.status());
  });

  test('POST onsite-ballot/verify requires auth', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/assemblies/${FAKE_ASSEMBLY_ID}/onsite-ballot/verify`,
      { data: {} },
    );
    expect([401, 403, 302]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// Multisig endpoints require auth
// ---------------------------------------------------------------------------

test.describe('Multisig endpoints require authentication', () => {
  test('GET multisig requires auth', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/assemblies/${FAKE_ASSEMBLY_ID}/multisig`,
    );
    expect([401, 403, 302]).toContain(response.status());
  });
});
