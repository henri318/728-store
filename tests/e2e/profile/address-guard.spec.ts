import { test, expect, loginAs } from '../admin/fixtures';

test.describe('Profile Address Guard', () => {
  test('customer sees address form on profile page', async ({
    customerPage,
  }) => {
    await customerPage.goto('/es/profile');
    // Customer should see name/email fields
    await expect(customerPage.getByLabel('Nombre')).toBeVisible();
    await expect(customerPage.getByLabel('Apellido')).toBeVisible();
    // Customer should see address section
    await expect(
      customerPage.getByRole('heading', { name: /dirección/i }),
    ).toBeVisible();
    await expect(customerPage.getByLabel('Calle')).toBeVisible();
    await expect(customerPage.getByLabel('Ciudad')).toBeVisible();
    await expect(customerPage.getByLabel('Código postal')).toBeVisible();
    await expect(customerPage.getByLabel('País')).toBeVisible();
  });

  test('admin does NOT see address form on profile page', async ({
    adminPage,
  }) => {
    await adminPage.goto('/es/profile');
    // Admin should see name/email fields
    await expect(adminPage.getByLabel('Nombre')).toBeVisible();
    await expect(adminPage.getByLabel('Apellido')).toBeVisible();
    // Admin should NOT see address section
    await expect(
      adminPage.getByRole('heading', { name: /dirección/i }),
    ).not.toBeVisible();
    await expect(adminPage.getByLabel('Calle')).not.toBeVisible();
  });

  test('designer does NOT see address form on profile page', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, 'designer');

    await page.goto('/es/profile');
    // Designer should see name/email fields
    await expect(page.getByLabel('Nombre')).toBeVisible();
    await expect(page.getByLabel('Apellido')).toBeVisible();
    // Designer should NOT see address section
    await expect(
      page.getByRole('heading', { name: /dirección/i }),
    ).not.toBeVisible();
    await expect(page.getByLabel('Calle')).not.toBeVisible();

    await context.close();
  });
});
