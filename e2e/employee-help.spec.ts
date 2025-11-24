import { test, expect } from '@playwright/test';

/**
 * Test that employees only see the "Enter Time" tutorial
 */
test.describe('Employee Help Button', () => {
  test('employee only sees Enter Time tutorial', async ({ page }) => {
    // Go to login
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    console.log('\n=== Testing Employee Help Button ===');

    // Login as employee with known password
    await page.getByTestId('email-input').locator('input').fill('Tech@employee.com');
    await page.getByTestId('password-input').locator('input').fill('employee123');
    await page.getByTestId('login-submit').click();
    await page.waitForTimeout(2000);

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for the help button
    const helpButton = page.locator('button[aria-label="help"]');
    await expect(helpButton).toBeVisible({ timeout: 10000 });

    console.log('Help button found! Clicking...');
    await helpButton.click();
    await page.waitForTimeout(500);

    // Check what tutorials are visible
    const enterTime = page.getByText('How to Enter Time');
    const createCustomer = page.getByText('How to Create a Customer');
    const createJob = page.getByText('How to Create a Job');
    const approveTime = page.getByText('How to Approve Time');

    // Employee should ONLY see Enter Time
    await expect(enterTime).toBeVisible();
    await expect(createCustomer).not.toBeVisible();
    await expect(createJob).not.toBeVisible();
    await expect(approveTime).not.toBeVisible();

    console.log('\n SUCCESS: Employee correctly sees only Enter Time tutorial!');
  });
});
