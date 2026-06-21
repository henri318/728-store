import { test, expect } from '@playwright/test';

test.describe('Change Password', () => {
  test('shows change password form after login', async ({ page }) => {
    // Login
    await page.goto('/es/auth/signin');
    await page.getByPlaceholder('Email').fill('test@test.com');
    await page.getByPlaceholder('Password').fill('Test123!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/es\/?$/);

    // Navigate via menu
    await page.getByRole('button', { name: /menu/i }).click();
    await page.getByRole('menuitem', { name: /editar contraseña/i }).click();

    // Form should be visible
    await expect(page).toHaveURL(/\/es\/auth\/change-password/);
    await expect(page.getByRole('heading', { name: /cambiar contraseña/i })).toBeVisible();
  });

  test('redirects to home when not authenticated', async ({ page }) => {
    await page.goto('/es/auth/change-password');
    await expect(page).toHaveURL(/\/es\/?$/);
  });
});
