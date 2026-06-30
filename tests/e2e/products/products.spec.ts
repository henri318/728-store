import { test, expect } from '@playwright/test';

test.describe('Products', () => {
  test('displays seeded products on home page', async ({ page }) => {
    await page.goto('/es');

    await expect(page.getByText('Camiseta Personalizada')).toBeVisible();
    await expect(page.getByText('Taza Personalizada')).toBeVisible();
    await expect(page.getByText('Sudadera con Capucha')).toBeVisible();
  });

  test('shows product price', async ({ page }) => {
    await page.goto('/es');

    await expect(page.getByText('25.00 €')).toBeVisible();
  });

  test('product detail page shows product info', async ({ page }) => {
    await page.goto('/es');

    const detailsHref = await page
      .locator('a[href*="/products/"]')
      .first()
      .getAttribute('href');
    expect(detailsHref).toBeTruthy();

    await page.goto(detailsHref!);

    await expect(page.locator('h1').first()).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Camiseta Personalizada' }),
    ).toBeVisible();
    await expect(
      page.getByText('Vista previa de personalización'),
    ).toBeVisible();
  });

  test('navigates between locales', async ({ page }) => {
    await page.goto('/es');

    await expect(page.getByText('Camiseta Personalizada')).toBeVisible();

    await page.goto('/cat');

    await expect(page.getByText('Samarreta Personalitzada')).toBeVisible();
  });
});
