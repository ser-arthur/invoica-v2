import { expect, type Locator, type Page } from '@playwright/test';
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
  await confirmAndSignIn(
    page,
    email,
    linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started)),
  );
  await page.fill('#name', business);
  if (options.vat) {
    await page.getByLabel('I am registered for VAT').check();
    await page.fill('#taxNumber', 'GB 000 0000 00');
  }
  await page.getByRole('button', { name: 'Continue to Invoica' }).click();
  await page.waitForURL('**/dashboard**');
  return email;
}

/**
 * Opens a confirmation link, which asks for the account's password: the right one confirms the address and signs in,
 * opening onboarding.
 */
export async function confirmAndSignIn(page: Page, email: string, link: string) {
  await page.goto(link);
  await page.waitForURL(/\/confirm-email\?token=/);
  await expect(page.getByText(email)).toBeVisible();
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Confirm and sign in' }).click();
  await page.waitForURL('**/onboarding');
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

/** The list one of Invoica's dropdowns opens (docs/specs/form-errors-and-controls.md). */
function listOf(field: Locator) {
  return field.getAttribute('aria-controls').then((id) => field.page().locator(`[id="${id}"]`));
}

/**
 * Chooses in one of Invoica's dropdowns as a person does: opens it and clicks the option, given by its value or by
 * its words (`{ label }`).
 */
export async function choose(field: Locator, option: string | { label: string }) {
  // Found before it opens: while open, the list and its search carry the field's name too.
  const list = await listOf(field);
  await field.click();
  await expect(list).toBeVisible();
  const row =
    typeof option === 'string'
      ? list.locator(`[role="option"][data-value="${option}"]`)
      : list.getByRole('option', { name: option.label, exact: true });
  await row.click();
  await expect(list).toBeHidden();
}

/** The words of the options a dropdown offers, read by opening it and closing it again. */
export async function optionsOf(field: Locator) {
  const list = await listOf(field);
  await field.click();
  await expect(list).toBeVisible();
  const words = await list.getByRole('option').allInnerTexts();
  await field.page().keyboard.press('Escape');
  await expect(list).toBeHidden();
  return words.map((w) => w.trim());
}
