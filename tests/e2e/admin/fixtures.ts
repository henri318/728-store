import { test as base, type Page } from '@playwright/test';
import { loginAs } from './auth';

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
