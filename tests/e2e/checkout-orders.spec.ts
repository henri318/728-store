import { test, expect } from '@playwright/test';

test.describe('Checkout and orders smoke flow', () => {
  test('redirects unauthenticated users away from customer orders', async ({
    page,
  }) => {
    await page.goto('/es/orders');

    await expect(page).toHaveURL(/\/es\/auth\/signin/);
  });

  test('redirects unauthenticated users away from seller orders', async ({
    page,
  }) => {
    await page.goto('/es/seller/orders');

    await expect(page).toHaveURL(/\/es$/);
  });
});
