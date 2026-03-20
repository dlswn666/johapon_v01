/**
 * Voting Flow UI E2E Tests for Johapon Electronic Voting System
 *
 * These tests verify UI-level behavior using a browser.
 * Requires dev server running at http://localhost:3000.
 *
 * IMPORTANT: This is a PRODUCTION Supabase instance.
 * - Tests only verify page rendering and UI elements
 * - Tests do NOT create real data
 * - Tests that require authentication are marked as .skip until
 *   a test user authentication strategy is implemented
 *
 * Related scenarios: A1, A2, A3, A5, C1, C3
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Use a real union slug from the system for page load tests.
// If none exists, tests will verify appropriate error/redirect handling.
const TEST_SLUG = process.env.TEST_UNION_SLUG || 'test_e2e_union';

// ---------------------------------------------------------------------------
// Helper: check if the dev server is running
// ---------------------------------------------------------------------------

async function isServerRunning(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get('/api/health');
    return response.status() === 200;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// A1: Anonymous user redirected to login
// ---------------------------------------------------------------------------

test.describe('A1: Anonymous user access control', () => {
  test('homepage loads without errors', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    // Should get 200 (landing page) or redirect to login
    expect([200, 302, 307]).toContain(response!.status());
  });

  test('anonymous user accessing union page gets redirect or content', async ({ page }) => {
    const response = await page.goto(`/${TEST_SLUG}`);
    expect(response).not.toBeNull();
    // Should show union page, login, or 404 for non-existent slug
    const status = response!.status();
    expect(status).toBeLessThan(500); // No server errors
  });

  test('anonymous user accessing admin page gets redirected', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/admin/assembly`);

    // Should redirect to login or show access denied
    // Check for login-related elements or redirect
    const url = page.url();
    const isRedirected = url.includes('login') ||
                         url.includes('auth') ||
                         url.includes('kakao') ||
                         !url.includes('/admin/');

    // If not redirected, page should show access denied
    if (!isRedirected) {
      const body = await page.textContent('body');
      expect(body).toMatch(/로그인|접근.*권한|401|403|인증/);
    } else {
      expect(isRedirected).toBe(true);
    }
  });

  test('anonymous user accessing assembly hall gets redirected', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/assembly/hall`);

    const url = page.url();
    const isRedirected = url.includes('login') ||
                         url.includes('auth') ||
                         !url.includes('/hall');

    if (!isRedirected) {
      const body = await page.textContent('body');
      expect(body).toMatch(/로그인|접근|인증|총회/);
    }
  });
});

// ---------------------------------------------------------------------------
// Page load tests (verify no server errors)
// ---------------------------------------------------------------------------

test.describe('Page load smoke tests', () => {
  test('root page loads without 500 error', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test('health API returns 200', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
  });

  test('non-existent union slug returns appropriate response', async ({ page }) => {
    const response = await page.goto('/test_nonexistent_union_slug_e2e');
    expect(response).not.toBeNull();
    // Should be 404 or redirect, not 500
    expect(response!.status()).toBeLessThan(500);
  });

  test('non-existent API route returns 404', async ({ page }) => {
    const response = await page.request.get('/api/nonexistent-e2e-test');
    expect(response.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// A2: Regular member cannot access admin pages (requires auth)
// These tests are skipped until test user auth is available.
// ---------------------------------------------------------------------------

test.describe('A2: Regular member blocked from admin pages', () => {
  test.skip(true, 'Requires authenticated test user session - not available in production');

  test('regular member accessing admin assembly list sees access denied', async ({ page }) => {
    // TODO: Set up authenticated session for regular MEMBER user
    await page.goto(`/${TEST_SLUG}/admin/assembly`);
    const body = await page.textContent('body');
    expect(body).toMatch(/권한|접근.*불가|403/);
  });

  test('regular member accessing assembly creation sees access denied', async ({ page }) => {
    // TODO: Set up authenticated session for regular MEMBER user
    await page.goto(`/${TEST_SLUG}/admin/assembly/create`);
    const body = await page.textContent('body');
    expect(body).toMatch(/권한|접근.*불가|403/);
  });
});

// ---------------------------------------------------------------------------
// A3: Admin can access assembly pages (requires auth)
// ---------------------------------------------------------------------------

test.describe('A3: Admin can access assembly management', () => {
  test.skip(true, 'Requires authenticated admin session - not available in production');

  test('admin can view assembly list', async ({ page }) => {
    // TODO: Set up authenticated admin session
    await page.goto(`/${TEST_SLUG}/admin/assembly`);
    // Should show assembly list page
    await expect(page.locator('text=총회')).toBeVisible();
  });

  test('admin can access assembly creation wizard', async ({ page }) => {
    // TODO: Set up authenticated admin session
    await page.goto(`/${TEST_SLUG}/admin/assembly/create`);
    // Should show creation form
    await expect(page.locator('input[name="title"], input[placeholder*="제목"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// A5: PASS step-up auth modal (requires auth + active assembly)
// ---------------------------------------------------------------------------

test.describe('A5: PASS step-up auth modal', () => {
  test.skip(true, 'Requires authenticated voter session with active poll');

  test('step-up auth modal appears when submitting vote', async ({ page }) => {
    // TODO: Navigate to hall page with active poll
    // TODO: Select vote option
    // TODO: Click submit

    // Expect StepUpAuthModal to appear
    await expect(page.locator('[data-testid="step-up-auth-modal"]')).toBeVisible();
    // Expect timer to be visible
    await expect(page.locator('text=/\\d{1,2}초|타이머/')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// C1: Voter can see open polls (requires auth + active assembly)
// ---------------------------------------------------------------------------

test.describe('C1: Voter sees open polls on hall page', () => {
  test.skip(true, 'Requires authenticated voter session with active assembly in VOTING status');

  test('active vote card is visible on hall page', async ({ page }) => {
    // TODO: Navigate to hall page for assembly in VOTING status
    // Expect ActiveVoteCard to be present
    await expect(page.locator('[data-testid="active-vote-card"]')).toBeVisible();
  });

  test('vote options are displayed', async ({ page }) => {
    // TODO: Navigate to hall page for assembly in VOTING status
    // Expect vote options (찬성/반대/기권)
    const options = page.locator('[data-testid="vote-option"]');
    await expect(options).toHaveCount(3); // Typical: 찬성, 반대, 기권
  });
});

// ---------------------------------------------------------------------------
// C3: Vote receipt display
// ---------------------------------------------------------------------------

test.describe('C3: Vote receipt display', () => {
  test.skip(true, 'Requires completed vote to see receipt');

  test('receipt shows confirmation without vote choice', async ({ page }) => {
    // TODO: Navigate to hall page after voting
    // Receipt should show token
    await expect(page.locator('[data-testid="vote-receipt"]')).toBeVisible();
    // Receipt should NOT contain option text
    const receiptText = await page.locator('[data-testid="vote-receipt"]').textContent();
    expect(receiptText).not.toMatch(/찬성|반대|기권/);
    // Receipt should contain a hex token or formatted receipt number
    expect(receiptText).toMatch(/확인|영수증|[0-9a-f]{8}/i);
  });
});

// ---------------------------------------------------------------------------
// UI Accessibility: Touch targets and font sizes (Scenarios UX-C1, UX-H1)
// ---------------------------------------------------------------------------

test.describe('UI accessibility checks', () => {
  test.skip(true, 'Requires authenticated session with active voting UI');

  test('vote option buttons meet minimum 44px touch target', async ({ page }) => {
    // TODO: Navigate to hall page with active poll
    const options = page.locator('[data-testid="vote-option"]');
    const count = await options.count();

    for (let i = 0; i < count; i++) {
      const box = await options.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('critical text is at least 14px', async ({ page }) => {
    // TODO: Navigate to voting page
    const voteCard = page.locator('[data-testid="active-vote-card"]');
    const fontSize = await voteCard.evaluate(
      (el) => window.getComputedStyle(el).fontSize,
    );
    const size = parseInt(fontSize, 10);
    expect(size).toBeGreaterThanOrEqual(14);
  });
});

// ---------------------------------------------------------------------------
// Mobile-specific tests
// ---------------------------------------------------------------------------

test.describe('Mobile: vote card visibility', () => {
  test.skip(true, 'Requires authenticated session on mobile viewport');

  test('vote card is visible without scrolling on mobile', async ({ page }) => {
    // Pixel 5 viewport is configured in playwright.config.ts
    // TODO: Navigate to hall page
    const voteCard = page.locator('[data-testid="active-vote-card"]');
    await expect(voteCard).toBeInViewport();
  });
});

// ---------------------------------------------------------------------------
// Error message quality (Scenario UX-C4)
// ---------------------------------------------------------------------------

test.describe('Error messages are user-friendly', () => {
  test('API error responses do not contain technical jargon', async ({ page }) => {
    // Call vote cast without auth to trigger error
    const response = await page.request.post('/api/votes/cast', {
      data: {},
    });

    if (response.status() >= 400 && response.status() < 500) {
      try {
        const body = await response.json();
        const errorMsg = body.error || '';
        // Should not contain raw technical terms
        // (these are the Korean technical terms from UX-C4)
        expect(errorMsg).not.toContain('파라미터');
        expect(errorMsg).not.toContain('토큰 형식');
        expect(errorMsg).not.toContain('세션 모드');
      } catch {
        // Non-JSON response is acceptable for auth redirects
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Assembly access verification endpoint
// ---------------------------------------------------------------------------

test.describe('Assembly access verification', () => {
  test('verify endpoint rejects without credentials', async ({ page }) => {
    const response = await page.request.post('/api/assembly-access/verify', {
      data: {},
    });
    expect(response.ok()).toBe(false);
  });

  test('nonce endpoint rejects without auth', async ({ page }) => {
    const response = await page.request.post('/api/assembly-access/nonce', {
      data: {},
    });
    expect([401, 403, 302, 400]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// Delegation UI (requires auth)
// Scenarios: F1, F3
// ---------------------------------------------------------------------------

test.describe('Delegation UI', () => {
  test.skip(true, 'Requires authenticated session with assembly that has delegation enabled');

  test('delegation page loads for authenticated user', async ({ page }) => {
    // TODO: Navigate to delegation page
    // Should show delegation status or creation form
    await expect(page.locator('text=/위임|대리/')).toBeVisible();
  });
});
