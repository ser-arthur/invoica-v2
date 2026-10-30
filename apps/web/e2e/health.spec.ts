import { expect, test } from '@playwright/test';
import { cronSecret } from './helpers';

/**
 * docs/deploy.md step 6: the checks run after each deployment, against the server as it runs. The PDF check starts
 * the browser the server uses for kept PDFs.
 */

test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'One width is enough for the server’s answers.');
});

test('the health check answers ok, reaching the database as the app role and the worker role', async ({
  request,
}) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('the PDF check makes one PDF with the bearer token, and refuses without it', async ({ request }) => {
  const secret = cronSecret();
  test.skip(!secret, 'Needs CRON_SECRET.');
  expect((await request.get('/api/health/pdf')).status()).toBe(401);
  expect(
    (await request.get('/api/health/pdf', { headers: { authorization: 'Bearer not-the-secret' } })).status(),
  ).toBe(401);

  const response = await request.get('/api/health/pdf', { headers: { authorization: `Bearer ${secret}` } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe('ok');
  expect(body.bytes).toBeGreaterThan(10_000);
  expect(body.ms).toBeGreaterThan(0);
  expect(body.ms).toBeLessThan(30_000);
});
