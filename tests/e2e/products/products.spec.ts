import { test, expect } from '@playwright/test';

test.describe('Products', () => {
  test('displays seeded products on home page', async ({ page }) => {
    await page.goto('/es');

    await expect(page.getByText('Mochila de Algodón Orgánico')).toBeVisible();
    await expect(page.getByText('Cesta de Mimbre Tejida')).toBeVisible();
    await expect(page.getByText('Sello Personalizado de Madera')).toBeVisible();
  });

  test('shows product price', async ({ page }) => {
    await page.goto('/es');

    await expect(page.getByText('42,00 €')).toBeVisible();
  });

  test('product detail page shows product info', async ({ page }) => {
    await page.goto('/es');

    const detailsHref = await page
      .getByRole('link', { name: 'Ver Detalles' })
      .first()
      .getAttribute('href');
    expect(detailsHref).toBeTruthy();

    await page.goto(detailsHref!);

    const productTitle = await page
      .getByRole('heading', { level: 1 })
      .textContent();
    expect(productTitle).toBeTruthy();
    await expect(
      page.getByRole('heading', { level: 1, name: productTitle! }),
    ).toBeVisible();
    await expect(page.getByLabel('Lienzo de personalización')).toBeVisible();
  });

  test('navigates between locales', async ({ page }) => {
    await page.goto('/es');

    await expect(page.getByText('Bolsa de Tela Reutilizable')).toBeVisible();

    await page.goto('/cat');

    await expect(page.getByText('Bossa de Tela Reutilitzable')).toBeVisible();
  });
});
