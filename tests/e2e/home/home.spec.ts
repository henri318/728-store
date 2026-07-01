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

  test('does NOT expose a /products public listing route (v1 spec)', async ({
    page,
  }) => {
    const res = await page.goto('/es/products');
    expect(res?.status()).toBe(404);
  });

  test('renders the unified search input with an accessible name', async ({
    page,
  }) => {
    await page.goto('/es');
    await page.getByRole('button', { name: /buscar productos/i }).click();
    const input = page.getByTestId('search-input');
    await expect(input).toBeVisible();
  });

  test('guests see no recent-search suggestions', async ({ page }) => {
    await page.goto('/es');
    await page.getByRole('button', { name: /buscar productos/i }).click();
    const input = page.getByTestId('search-input');
    await input.focus();
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });
});
