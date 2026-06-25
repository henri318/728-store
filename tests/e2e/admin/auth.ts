import type { Page } from '@playwright/test';
import { TEST_USERS } from './credentials';

/** Log in via the sign-in page and wait for redirect to home. */
export async function loginAs(
  page: Page,
  role: keyof typeof TEST_USERS,
  locale = 'es',
): Promise<void> {
  const { email, password } = TEST_USERS[role];
  await page.goto(`/${locale}/auth/signin`);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL(new RegExp(`\\/${locale}\\/?$`));
}

/** Log out by clicking the menu → sign out button. */
export async function logout(page: Page, locale = 'es'): Promise<void> {
  await page.getByRole('button', { name: /menu/i }).click();
  await page.getByRole('menuitem', { name: /cerrar sesión/i }).click();
  await page.waitForURL(new RegExp(`\\/${locale}\\/?$`));
}
