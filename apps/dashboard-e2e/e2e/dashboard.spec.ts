import { test, expect } from '@playwright/test';

test.describe('Dashboard - Synthesis (Landing Page)', () => {
  test('should load synthesis view as default', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('h2', { hasText: 'Signal Synthesis' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('should display synthesis cards with direction chips', async ({
    page,
  }) => {
    await page.goto('/synthesis');
    await expect(
      page.locator('h2', { hasText: 'Signal Synthesis' }),
    ).toBeVisible({ timeout: 15000 });
    const chips = page.locator('mat-chip');
    await expect(chips.first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Dashboard - Activity Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signals');
    await expect(
      page.locator('h2', { hasText: 'Trading Signals' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('should load the signal table', async ({ page }) => {
    await expect(page).toHaveTitle(/dashboard/i);
  });

  test('should display at least 5 signal rows', async ({ page }) => {
    const rows = page.locator('tr.mat-mdc-row');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should show correct direction colors', async ({ page }) => {
    const rows = page.locator('tr.mat-mdc-row');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });

    const chips = page.locator('mat-chip');
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(5);

    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      const text = (await chip.innerText()).trim();
      const bgColor = await chip.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );

      switch (text) {
        case 'BUY':
          expect(bgColor).toBe('rgb(76, 175, 80)');
          break;
        case 'SELL':
          expect(bgColor).toBe('rgb(244, 67, 54)');
          break;
        case 'HOLD':
          expect(bgColor).toBe('rgb(255, 152, 0)');
          break;
      }
    }
  });
});
