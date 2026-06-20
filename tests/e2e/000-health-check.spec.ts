import { test, expect } from '@playwright/test';

test('API health endpoint responds', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBe(true);

  const body = await res.json();
  expect(body).toHaveProperty('status', 'ok');
  expect(body).toHaveProperty('timestamp');
});
