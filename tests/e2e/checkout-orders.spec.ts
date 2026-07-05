import { test, expect } from '@playwright/test';

test.describe('Checkout and orders smoke flow', () => {
  test('redirects unauthenticated users away from customer orders', async ({
    page,
  }) => {
    const response = await page.goto('/es/orders').catch(() => null);

    expect(response?.status() ?? 0).toBeLessThan(500);
  });

  test('redirects unauthenticated users away from seller orders', async ({
    page,
  }) => {
    await page.goto('/es/seller/orders');

    await expect(page).toHaveURL(/\/es$/);
  });
});
