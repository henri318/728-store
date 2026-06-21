import { test, expect } from '@playwright/test';

test.describe('Profile', () => {
  test('shows profile form after login', async ({ page }) => {
    // Login first
    await page.goto('/es/auth/signin');
    await page.getByLabel('Correo electrónico').fill('test@test.com');
    await page.getByLabel('Contraseña').fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/es\/?$/);

    // Navigate to profile via menu
    await page.getByRole('button', { name: /menu/i }).click();
    await page.getByRole('menuitem', { name: /mi perfil/i }).click();

    // Profile page should load with form fields
    await expect(page).toHaveURL(/\/es\/profile/);
    await expect(page.getByRole('heading', { name: /perfil/i })).toBeVisible();
    await expect(page.getByLabel('Nombre')).toBeVisible();
    await expect(page.getByLabel('Apellido')).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  });

  test('updates profile successfully', async ({ page }) => {
    // Login
    await page.goto('/es/auth/signin');
    await page.getByLabel('Correo electrónico').fill('test@test.com');
    await page.getByLabel('Contraseña').fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/es\/?$/);

    // Go to profile
    await page.goto('/es/profile');
    await expect(page.getByLabel('Nombre')).toBeVisible();

    // Update name
    await page.getByLabel('Nombre').fill('Updated');
    await page.getByRole('button', { name: /enviar/i }).click();

    // Should show success message
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('redirects to home when not authenticated', async ({ page }) => {
    await page.goto('/es/profile');
    await expect(page).toHaveURL(/\/es\/?$/);
  });
});
