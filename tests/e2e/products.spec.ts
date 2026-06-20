import { test, expect } from '@playwright/test';

test.describe('Products', () => {
  test('displays seeded products on home page', async ({ page }) => {
    await page.goto('/es');

    // Seed data includes 3 products with Spanish translations
    await expect(page.getByText('Camiseta Personalizada')).toBeVisible();
    await expect(page.getByText('Taza Personalizada')).toBeVisible();
    await expect(page.getByText('Sudadera con Capucha')).toBeVisible();
  });

  test('shows product price', async ({ page }) => {
    await page.goto('/es');

    // Camiseta Personalizada costs $25
    await expect(page.getByText('$25')).toBeVisible();
  });

  test('product detail page shows product info', async ({ page }) => {
    await page.goto('/es');

    // Click on first product
    await page.getByRole('button', { name: /ver detalles/i }).first().click();

    // Should be on product detail page
    await expect(page).toHaveURL(/\/es\/products\//);

    // Should show product name
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('navigates between locales', async ({ page }) => {
    await page.goto('/es');

    // Products should show Spanish names
    await expect(page.getByText('Camiseta Personalizada')).toBeVisible();

    // Navigate to Catalan version
    await page.goto('/cat');

    // Products should show Catalan names
    await expect(page.getByText('Samarreta Personalitzada')).toBeVisible();
  });
});
