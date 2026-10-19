import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct horse battery';

export function uniqueEmail(prefix: string) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}@example.test`;
}

/** Signs up and completes onboarding. Returns the email used. */
export async function signUpAndOnboard(page: Page, business: string, options: { vat?: boolean } = {}) {
  const email = uniqueEmail('e2e');
  await page.goto('/sign-up');
  await page.fill('#name', 'Test Owner');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.fill('#name', business);
  if (options.vat) {
    await page.getByLabel('I am registered for VAT').check();
    await page.fill('#taxNumber', 'GB 000 0000 00');
  }
  await page.getByRole('button', { name: 'Continue to Invoica' }).click();
  await page.waitForURL('**/dashboard**');
  return email;
}

export async function signIn(page: Page, email: string) {
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

export async function addClient(page: Page, name: string, email = 'accounts@client.example') {
  await page.goto('/clients/new');
  await page.fill('#c-name', name);
  await page.fill('#c-email', email);
  await page.fill('#c-a1', '1 Sample Street');
  await page.fill('#c-city', 'Leeds');
  await page.fill('#c-postcode', 'LS1 1AA');
  await page.getByRole('button', { name: 'Save client' }).click();
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
}

/** Collects console errors so a test can assert there were none. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    // Playwright's own helper script is blocked inside the sandboxed preview frame; that is expected.
    if (m.type() === 'error' && !/favicon|Download the React DevTools|about:srcdoc/.test(m.text()))
      errors.push(m.text());
  });
  return errors;
}
