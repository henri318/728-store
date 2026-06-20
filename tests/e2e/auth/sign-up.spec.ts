import { test, expect } from '@playwright/test';

test.describe('Sign Up', () => {
  test('shows the registration form', async ({ page }) => {
    await page.goto('/es/auth/signup');

    await expect(page.getByRole('heading', { name: 'Registro' })).toBeVisible();
    await expect(page.getByLabel('Nombre')).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible();
  });

  test('registers a new user and redirects to sign in', async ({ page }) => {
    await page.goto('/es/auth/signup');

    const uniqueEmail = `user-${Date.now()}@test.com`;

    await page.getByLabel('Nombre').fill('New');
    await page.getByLabel('Apellido').fill('User');
    await page.getByLabel('Correo electrónico').fill(uniqueEmail);
    await page.getByLabel('Contraseña').fill('StrongPass123!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL(/\/auth\/signin\?registered=true/);
  });

  test('shows error for duplicate email', async ({ page }) => {
    await page.goto('/es/auth/signup');

    await page.getByLabel('Nombre').fill('Duplicate');
    await page.getByLabel('Apellido').fill('User');
    await page.getByLabel('Correo electrónico').fill('test@test.com');
    await page.getByLabel('Contraseña').fill('StrongPass123!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText(/el mail ya existe/i)).toBeVisible();
  });
});
