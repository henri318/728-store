import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('shows the product grid', async ({ page }) => {
    await page.goto('/es');

    // Should show the products heading
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();

    // Should display at least one product card (seeded data)
    const cards = page.locator('button:has-text("Ver detalles")');
    await expect(cards.first()).toBeVisible();
  });

  test('navigates to product detail', async ({ page }) => {
    await page.goto('/es');

    // Click the first "Ver detalles" button
    await page.getByRole('button', { name: /ver detalles/i }).first().click();

    // Should navigate to a product detail page
    await expect(page).toHaveURL(/\/es\/products\//);
  });

  test('redirects root to default locale', async ({ page }) => {
    await page.goto('/');

    // Should redirect to /es
    await expect(page).toHaveURL(/\/es/);
  });
});
