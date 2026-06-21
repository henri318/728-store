import { test, expect } from '@playwright/test';

test.describe('Sign In', () => {
  test('shows the login form', async ({ page }) => {
    await page.goto('/es/auth/signin');

    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/es/auth/signin');

    await page.getByPlaceholder('Email').fill('test@test.com');
    await page.getByPlaceholder('Password').fill('Test123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/es\/?$/);
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/es/auth/signin');

    await page.getByPlaceholder('Email').fill('wrong@email.com');
    await page.getByPlaceholder('Password').fill('WrongPass123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('shows user menu after successful login', async ({ page }) => {
    await page.goto('/es/auth/signin');

    await page.getByPlaceholder('Email').fill('test@test.com');
    await page.getByPlaceholder('Password').fill('Test123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/es\/?$/);

    // Menu button should be visible (hamburger icon)
    const menuButton = page.getByRole('button', { name: /menu/i });
    await expect(menuButton).toBeVisible();

    // Click menu — should show profile, change password, close session
    await menuButton.click();
    await expect(page.getByRole('menuitem', { name: /mi perfil/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /editar contraseña/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /cerrar sesión/i })).toBeVisible();
  });
});
