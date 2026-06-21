import { test, expect } from '@playwright/test';

test.describe('Sign In', () => {
  test('shows the login form', async ({ page }) => {
    await page.goto('/es/auth/signin');

    await expect(
      page.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Iniciar sesión' }),
    ).toBeVisible();
  });

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/es/auth/signin');

    await page.getByLabel('Correo electrónico').fill('test@test.com');
    await page.getByLabel('Contraseña').fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/es\/?$/);
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/es/auth/signin');

    await page.getByLabel('Correo electrónico').fill('wrong@email.com');
    await page.getByLabel('Contraseña').fill('WrongPass123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
