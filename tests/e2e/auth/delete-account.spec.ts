import { test, expect } from '@playwright/test';

test.describe('Delete Account', () => {
  test('shows delete button on profile page', async ({ page }) => {
    // Login
    await page.goto('/es/auth/signin');
    await page.getByLabel('Correo electrónico').fill('test@test.com');
    await page.getByLabel('Contraseña').fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/es\/?$/);

    // Go to profile
    await page.goto('/es/profile');
    await expect(page.getByLabel('Nombre')).toBeVisible();

    // Delete button should be visible
    const deleteButton = page.getByRole('button', { name: /eliminar cuenta/i });
    await expect(deleteButton).toBeVisible();

    // Click delete — confirmation modal should appear
    await deleteButton.click();
    await expect(
      page.getByRole('heading', { name: /eliminar cuenta/i }),
    ).toBeVisible();

    // Cancel should close modal
    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(
      page.getByRole('heading', { name: /eliminar cuenta/i }),
    ).not.toBeVisible();
  });

  test('delete is NOT available in the header menu', async ({ page }) => {
    // Login
    await page.goto('/es/auth/signin');
    await page.getByLabel('Correo electrónico').fill('test@test.com');
    await page.getByLabel('Contraseña').fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/es\/?$/);

    // Open menu
    await page.getByRole('button', { name: /menu/i }).click();

    // Delete should NOT be in the dropdown
    await expect(
      page.getByRole('menuitem', { name: /eliminar cuenta/i }),
    ).not.toBeVisible();
  });
});
