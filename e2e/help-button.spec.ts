import { test, expect } from '@playwright/test';

/**
 * Help Button E2E Tests
 * Tests the floating help button and persistent tutorial overlay functionality
 */

test.describe('Help Button - Persistent Tutorial', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    // Login
    await page.getByTestId('email-input').locator('input').fill('admin@admin.com');
    await page.getByTestId('password-input').locator('input').fill('admin123');
    await page.getByTestId('login-submit').click();
    await page.waitForLoadState('networkidle');
  });

  test('help button is visible and opens menu', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for the floating help button
    const helpButton = page.locator('button[aria-label="help"]');
    await expect(helpButton).toBeVisible();

    // Click the help button
    await helpButton.click();
    await page.waitForTimeout(500);

    // Menu should appear with tutorial options
    await expect(page.getByText('Interactive Tutorials')).toBeVisible();
    await expect(page.getByText('How to Create a Customer')).toBeVisible();
    await expect(page.getByText('How to Create a Job')).toBeVisible();
  });

  test('tutorial persists across page navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Start tutorial
    await page.locator('button[aria-label="help"]').click();
    await page.waitForTimeout(300);
    await page.getByText('How to Create a Customer').click();
    await page.waitForTimeout(500);

    // Tutorial card should appear in bottom-left
    const tutorialCard = page.locator('.MuiPaper-root').filter({ hasText: 'Create a Customer' });
    await expect(tutorialCard).toBeVisible();

    // Step 1 should show - highlight on Customers nav
    await expect(page.getByText('Step 1: Go to Customers')).toBeVisible();

    // Navigate to another page directly (simulating sidebar click)
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Tutorial should still be visible after navigation!
    await expect(page.getByText('Step 1: Go to Customers')).toBeVisible();

    // The tutorial card should still be there
    await expect(page.locator('.MuiPaper-root').filter({ hasText: 'Create a Customer' })).toBeVisible();
  });

  test('can navigate through tutorial using Next/Back buttons', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Start tutorial
    await page.locator('button[aria-label="help"]').click();
    await page.waitForTimeout(300);
    await page.getByText('How to Create a Customer').click();
    await page.waitForTimeout(500);

    // Step 1
    await expect(page.getByText('Step 1: Go to Customers')).toBeVisible();

    // Click Next
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(300);

    // Step 2
    await expect(page.getByText('Step 2: Click Add Customer')).toBeVisible();

    // Click Next again
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(300);

    // Step 3
    await expect(page.getByText('Step 3: Fill the Form')).toBeVisible();

    // Click Back
    await page.getByRole('button', { name: 'Back' }).click();
    await page.waitForTimeout(300);

    // Should be back to Step 2
    await expect(page.getByText('Step 2: Click Add Customer')).toBeVisible();
  });

  test('tutorial card does not block UI interactions', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Start tutorial
    await page.locator('button[aria-label="help"]').click();
    await page.waitForTimeout(300);
    await page.getByText('How to Create a Customer').click();
    await page.waitForTimeout(500);

    // Tutorial should be visible
    await expect(page.getByText('Step 1: Go to Customers')).toBeVisible();

    // Navigate using Next to get to step 2 where Add Customer button is visible
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(300);

    // Should be on step 2
    await expect(page.getByText('Step 2: Click Add Customer')).toBeVisible();

    // The "New Customer" button should be clickable (not blocked by tutorial)
    const newCustomerBtn = page.getByRole('button', { name: /New Customer/i });
    await expect(newCustomerBtn).toBeVisible();

    // Click should work and open a dialog
    await newCustomerBtn.click();
    await page.waitForTimeout(500);

    // Dialog should open - the tutorial shouldn't block this
    // The tutorial card should still be visible (z-index above dialog)
    await expect(page.getByText('Step 2: Click Add Customer')).toBeVisible();
  });

  test('can skip tutorial with Skip button', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Start tutorial
    await page.locator('button[aria-label="help"]').click();
    await page.waitForTimeout(300);
    await page.getByText('How to Create a Customer').click();
    await page.waitForTimeout(500);

    // Tutorial should be visible
    await expect(page.getByText('Step 1: Go to Customers')).toBeVisible();

    // Click Skip button
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.waitForTimeout(300);

    // Tutorial should be closed
    await expect(page.getByText('Step 1: Go to Customers')).not.toBeVisible();

    // Help button should reappear
    await expect(page.locator('button[aria-label="help"]')).toBeVisible();
  });

  test('tutorial state persists in localStorage', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Start tutorial and go to step 2
    await page.locator('button[aria-label="help"]').click();
    await page.waitForTimeout(300);
    await page.getByText('How to Create a Customer').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(300);

    // Verify we're on step 2
    await expect(page.getByText('Step 2: Click Add Customer')).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Tutorial should still be on step 2 after reload
    await expect(page.getByText('Step 2: Click Add Customer')).toBeVisible();
  });
});
