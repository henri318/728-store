import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('shows the product grid', async ({ page }) => {
    await page.goto('/es');

    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();

    const cards = page.getByRole('link', { name: /ver detalles/i });
    await expect(cards.first()).toBeVisible();
  });

  test('navigates to product detail', async ({ page }) => {
    await page.goto('/es');

    await page
      .getByRole('link', { name: /ver detalles/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/es\/products\//);
  });

  test('redirects root to default locale', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/es/);
  });
});
