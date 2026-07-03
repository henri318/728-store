import { test, expect } from '@playwright/test';

test.describe('Change Password', () => {
  test('shows change password form after login', async ({ page }) => {
    // Login
    await page.goto('/es/auth/signin');
    await page.getByLabel('Correo electrónico').fill('test@test.com');
    await page.getByLabel('Contraseña').fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/es\/?$/);

    // Navigate directly to the protected page.
    await page.goto('/es/auth/change-password');

    // Form should be visible
    await expect(page).toHaveURL(/\/es\/auth\/change-password/);
    await expect(
      page.getByRole('heading', { name: /cambiar contraseña/i }),
    ).toBeVisible();
  });

  test('redirects to home when not authenticated', async ({ page }) => {
    await page.goto('/es/auth/change-password');
    await expect(page).toHaveURL(/\/es\/?$/);
  });
});
