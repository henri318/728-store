import type { Page } from '@playwright/test';
import { TEST_USERS } from './credentials';

const POST_LOGIN_URL: Record<string, string> = {
  admin: '/admin/sellers',
  designer: '/seller/products',
};

/** Log in via the sign-in page and wait for the post-login redirect. */
export async function loginAs(
  page: Page,
  role: keyof typeof TEST_USERS,
  locale = 'es',
): Promise<void> {
  const { email, password } = TEST_USERS[role];
  const expectedPath = POST_LOGIN_URL[role] ?? '';
  await page.goto(`/${locale}/auth/signin`);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL(new RegExp(String.raw`\/${locale}${expectedPath}\/?$`));
}

/** Log out by clicking the menu → sign out button. */
export async function logout(page: Page, locale = 'es'): Promise<void> {
  await page.getByRole('button', { name: /menu/i }).click();
  await page.getByRole('menuitem', { name: /cerrar sesión/i }).click();
  await page.waitForURL(new RegExp(String.raw`\/${locale}\/?$`));
}
