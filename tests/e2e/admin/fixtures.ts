import { test as base, type Page } from '@playwright/test';

/** Credentials for seeded test users. */
export const TEST_USERS = {
  admin: { email: 'admin@728store.com', password: 'Admin123!' },
  customer: { email: 'test@test.com', password: 'Test123!' },
  designer: { email: 'designer@test.com', password: 'Designer123!' },
} as const;

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

/** Extend Playwright test with pre-authenticated pages per role. */
export const test = base.extend<{
  adminPage: Page;
  customerPage: Page;
  designerPage: Page;
}>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, 'admin');
    // eslint-disable-next-line @eslint-react/rules-of-hooks, react-hooks/rules-of-hooks
    await use(page);
    await context.close();
  },

  customerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, 'customer');
    // eslint-disable-next-line @eslint-react/rules-of-hooks, react-hooks/rules-of-hooks
    await use(page);
    await context.close();
  },

  designerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, 'designer');
    // eslint-disable-next-line @eslint-react/rules-of-hooks, react-hooks/rules-of-hooks
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
