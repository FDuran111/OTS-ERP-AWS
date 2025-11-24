import { test, expect } from '@playwright/test';

/**
 * Manual testing helper - opens browser for you to test manually
 */

test('open browser for manual employee tutorial testing', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  console.log('\n=================================================');
  console.log('Browser is open at the login page!');
  console.log('');
  console.log('Employee test accounts:');
  console.log('  - Tech@employee.com');
  console.log('  - EMP@test.com');
  console.log('');
  console.log('After logging in as an employee:');
  console.log('  1. Click the "?" help button (bottom right)');
  console.log('  2. You should ONLY see "How to Enter Time"');
  console.log('  3. Click it to start the tutorial');
  console.log('  4. Follow along - the tutorial should persist!');
  console.log('=================================================\n');

  // Wait for a long time so you can interact with the browser
  await page.waitForTimeout(120000); // 2 minutes to test
});
