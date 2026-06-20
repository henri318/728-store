import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
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

      // Should redirect to signin with registered param
      await expect(page).toHaveURL(/\/auth\/signin\?registered=true/);
    });

    test('shows error for duplicate email', async ({ page }) => {
      await page.goto('/es/auth/signup');

      // Use the seeded user email
      await page.getByLabel('Nombre').fill('Duplicate');
      await page.getByLabel('Apellido').fill('User');
      await page.getByLabel('Correo electrónico').fill('test@test.com');
      await page.getByLabel('Contraseña').fill('StrongPass123!');
      await page.getByRole('button', { name: 'Crear cuenta' }).click();

      // Should show error message
      await expect(page.getByText(/el mail ya existe/i)).toBeVisible();
    });
  });

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

      // Should redirect to home page after successful login
      await expect(page).toHaveURL(/\/es\/?$/);
    });

    test('shows error for invalid credentials', async ({ page }) => {
      await page.goto('/es/auth/signin');

      await page.getByPlaceholder('Email').fill('wrong@email.com');
      await page.getByPlaceholder('Password').fill('WrongPass123!');
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Should stay on signin page (NextAuth redirects back with error)
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });

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
});
