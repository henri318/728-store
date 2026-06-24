import { test, expect, loginAs } from './fixtures';

test.describe('Admin Role Denial', () => {
  test('customer is redirected away from /admin/sellers', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, 'customer');

    await page.goto('/es/admin/sellers');
    // Server-side assertRole redirects non-admin to home
    await expect(page).toHaveURL(/\/es\/?$/);

    await context.close();
  });

  test('designer is redirected away from /admin/sellers', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, 'designer');

    await page.goto('/es/admin/sellers');
    // Server-side assertRole redirects non-admin to home
    await expect(page).toHaveURL(/\/es\/?$/);

    await context.close();
  });

  test('unauthenticated user is redirected from /admin/sellers', async ({
    page,
  }) => {
    await page.goto('/es/admin/sellers');
    // Not logged in → redirect to home (or sign-in)
    await expect(page).not.toHaveURL(/\/admin\/sellers/);
  });

  test('customer does not see Dashboard link in header', async ({
    customerPage,
  }) => {
    await customerPage.goto('/es');
    await expect(
      customerPage.getByRole('link', { name: /panel de administración/i }),
    ).not.toBeVisible();
  });

  test('designer does not see Dashboard link in header', async ({
    designerPage,
  }) => {
    await designerPage.goto('/es');
    await expect(
      designerPage.getByRole('link', { name: /panel de administración/i }),
    ).not.toBeVisible();
  });

  test('designer sees Designer Panel link instead of Dashboard', async ({
    designerPage,
  }) => {
    await designerPage.goto('/es');
    await expect(
      designerPage.getByRole('link', { name: /panel de diseñador/i }),
    ).toBeVisible();
  });
});
