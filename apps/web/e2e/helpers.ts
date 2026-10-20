import { expect, type Page } from '@playwright/test';
import { linkIn, waitForEmail } from './mailbox';

export const PASSWORD = 'correct horse battery';

export function uniqueEmail(prefix: string) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}@example.test`;
}

const octet = () => Math.floor(Math.random() * 254) + 1;

/**
 * Fills in and sends the sign-up form. Each sign-up comes from its own client address, as separate people would, so
 * the suite's many sign-ups stay within the per-address sign-up limit (the development server reads the address
 * from X-Forwarded-For).
 */
export async function signUp(page: Page, email: string) {
  await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': `10.${octet()}.${octet()}.${octet()}` });
  await page.goto('/sign-up');
  await page.fill('#name', 'Test Owner');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
}

/** Signs up, opens the confirmation link from the development mailbox and completes onboarding. Returns the email. */
export async function signUpAndOnboard(page: Page, business: string, options: { vat?: boolean } = {}) {
  const email = uniqueEmail('e2e');
  const started = Date.now();
  await signUp(page, email);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await page.goto(linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started)));
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
  // Signing in moves to the dashboard and then refreshes it; a navigation started before that ends is cut short.
  await expect(page.getByRole('navigation', { name: 'Main' }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
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
      errors.push(m.location().url ? `${m.text()} (${m.location().url})` : m.text());
  });
  return errors;
}
