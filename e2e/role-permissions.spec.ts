import { test, expect, Page } from '@playwright/test';

/**
 * Role-Based Permission Tests
 * Tests that different user roles have appropriate access to pages
 */

const TEST_ADMIN = {
  email: 'admin@admin.com',
  password: 'admin123',
  role: 'OWNER_ADMIN'
};

// Pages that ONLY admin should access
const ADMIN_ONLY_PAGES = [
  '/settings',
  '/billing',
  '/equipment-billing',
];

// Pages that admin and foreman can access (not employee)
const ADMIN_FOREMAN_PAGES = [
  '/dashboard',
  '/schedule',
  '/admin',
  '/customers',
  '/service-calls',
  '/route-optimization',
  '/office-display',
  '/invoicing',
  '/reports',
];

// Pages ALL roles can access
const ALL_ROLES_PAGES = [
  '/jobs',
  '/time',
  '/purchase-orders',
];

// Helper to login
async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByTestId('email-input').locator('input').fill(email);
  await page.getByTestId('password-input').locator('input').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForLoadState('networkidle');
}

test.describe('Admin Role Access Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
  });

  test('admin can access all admin-only pages', async ({ page }) => {
    for (const path of ADMIN_ONLY_PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Should NOT be redirected to login or show access denied
      const url = page.url();
      expect(url).not.toContain('/login');

      // Page should have content
      const content = await page.content();
      expect(content.length).toBeGreaterThan(500);
    }
  });

  test('admin can access all admin/foreman pages', async ({ page }) => {
    for (const path of ADMIN_FOREMAN_PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const url = page.url();
      expect(url).not.toContain('/login');
    }
  });

  test('admin can access all shared pages', async ({ page }) => {
    for (const path of ALL_ROLES_PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const url = page.url();
      expect(url).not.toContain('/login');
    }
  });
});

test.describe('Sidebar Navigation by Role', () => {
  test('admin sees all navigation items', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Admin should see Settings link
    const settingsLink = page.locator('nav a:has-text("Settings")');
    await expect(settingsLink).toBeVisible();

    // Admin should see Billing link
    const billingLink = page.locator('nav a:has-text("Billing")');
    await expect(billingLink).toBeVisible();
  });
});

test.describe('Unauthenticated Access', () => {
  test('unauthenticated users are redirected to login', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();

    // Try to access protected page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page is accessible without auth', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Should show login form
    await expect(page.getByTestId('login-form')).toBeVisible();
  });
});

test.describe('Session Management', () => {
  test('session persists across page navigation', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);

    // Navigate to multiple pages
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');

    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');

    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');
  });

  test('logout clears session', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click logout
    await page.locator('button:has-text("Logout")').click();
    await page.waitForURL(/\/login/);

    // Try to access protected page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be redirected back to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('API Role Protection', () => {
  test('admin can access admin APIs', async ({ request }) => {
    // Login to get token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password
      }
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Access admin API
    const response = await request.get('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.status()).toBe(200);
  });

  test('unauthenticated requests to protected APIs are rejected', async ({ request }) => {
    const response = await request.get('/api/users');
    // Should return 401 Unauthorized
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Job Detail Access', () => {
  test('admin can view job details', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    // Try to click first job
    const jobLink = page.locator('a[href^="/jobs/"]').first();
    if (await jobLink.count() > 0) {
      await jobLink.click();
      await page.waitForLoadState('networkidle');

      // Should be on job detail page
      expect(page.url()).toMatch(/\/jobs\/[a-zA-Z0-9-]+/);

      // Should not be redirected to login
      expect(page.url()).not.toContain('/login');
    }
  });
});

test.describe('Form Submissions by Role', () => {
  test('admin can access time entry form', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.goto('/time');
    await page.waitForLoadState('networkidle');

    // Click add button
    const addButton = page.locator('button:has-text("Add"), button:has-text("Manual")').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Form should be visible
      await expect(page.getByTestId('time-entry-form')).toBeVisible();
    }
  });

  test('admin can access approvals page', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should be on approvals page (not redirected)
    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/login');
  });
});
