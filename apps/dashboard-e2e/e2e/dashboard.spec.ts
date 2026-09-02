import { test, expect } from '@playwright/test';

test.describe('Trading Signal Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('h2', { hasText: 'Trading Signals' }),
    ).toBeVisible();
  });

  test('should load the dashboard', async ({ page }) => {
    await expect(page).toHaveTitle(/dashboard/i);
  });

  test('should display the signal table heading', async ({ page }) => {
    const heading = page.locator('h2', { hasText: 'Trading Signals' });
    await expect(heading).toBeVisible();
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
