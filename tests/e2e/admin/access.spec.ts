import { test, expect } from './fixtures';

test.describe('Admin Access', () => {
  test('admin can access /admin/sellers', async ({ adminPage }) => {
    await adminPage.goto('/es/admin/sellers');
    await expect(
      adminPage.getByRole('heading', { name: /gestión de vendedores/i }),
    ).toBeVisible();
  });

  test('admin sees seller table with View Products links', async ({
    adminPage,
  }) => {
    await adminPage.goto('/es/admin/sellers');
    // Check the table renders a seller row
    await expect(
      adminPage.getByRole('cell', { name: '728 Store', exact: true }),
    ).toBeVisible();
    await expect(
      adminPage.getByRole('link', { name: /ver productos/i }).first(),
    ).toBeVisible();
  });

  test('admin can access seller products page', async ({ adminPage }) => {
    await adminPage.goto('/es/admin/sellers');
    // Click the first "View Products" link
    const viewProductsLink = adminPage
      .getByRole('link', { name: /ver productos/i })
      .first();
    await viewProductsLink.click();
    // Should navigate to the seller products page
    await expect(adminPage).toHaveURL(/\/es\/admin\/sellers\/.+\/products/);
    await expect(
      adminPage.getByRole('link', { name: /volver a vendedores/i }),
    ).toBeVisible();
  });

  test('admin sees Dashboard link in header navigation', async ({
    adminPage,
  }) => {
    await adminPage.goto('/es');
    await expect(
      adminPage.getByRole('link', { name: /panel de administración/i }),
    ).toBeVisible();
  });

  test('admin sees Dashboard item in user menu dropdown', async ({
    adminPage,
  }) => {
    await adminPage.goto('/es');
    await adminPage.getByRole('button', { name: /menu/i }).click();
    await expect(
      adminPage.getByRole('menuitem', { name: /panel de administración/i }),
    ).toBeVisible();
  });
});
