import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('sign up page links to sign in', async ({ page }) => {
    await page.goto('/es/auth/signup');

    await page.getByRole('link', { name: 'Iniciá sesión' }).click();

    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('sign in page links to sign up', async ({ page }) => {
    await page.goto('/es/auth/signin');

    await page.getByRole('link', { name: 'Sign Up' }).click();

    await expect(page).toHaveURL(/\/auth\/signup/);
  });
});
