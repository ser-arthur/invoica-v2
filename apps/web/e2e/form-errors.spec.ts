import { expect, test, type Page } from '@playwright/test';

// docs/specs/form-errors-and-controls.md, "Errors in plain words", acceptance criteria 1 to 5.

const GENERAL = 'Something went wrong at our end. Try again in a moment.';

/** Counts the calls the page makes to the sign-in service. */
function authCalls(page: Page) {
  const calls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/auth/') && r.method() === 'POST') calls.push(r.url());
  });
  return calls;
}

async function expectFieldError(page: Page, id: string, message: string) {
  const field = page.locator(`#${id}`);
  await expect(page.locator(`#${id}-error`)).toHaveText(message);
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAttribute('aria-describedby', new RegExp(`(^| )${id}-error( |$)`));
}

/** No message on the page carries the sign-in service's own wording. */
async function expectNoServiceWords(page: Page) {
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\[body\.|Invalid email address|Invalid origin|Validation Error|Failed to/i);
}

test('create account sent empty says what each field needs, and sends nothing (1)', async ({ page }) => {
  const calls = authCalls(page);
  await page.goto('/sign-up');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expectFieldError(page, 'name', 'Enter your name.');
  await expectFieldError(page, 'email', 'Enter your email address.');
  await expectFieldError(page, 'password', 'Enter your password.');
  await expect(page.getByLabel('Your name')).toBeFocused();
  expect(calls).toEqual([]);
  // The small print leads only to pages that exist (docs/specs/website-footer.md).
  await expect(page.getByRole('link', { name: 'Help' })).toHaveCount(0);
  // A field's message goes once it is changed.
  await page.getByLabel('Your name').fill('Jo Bloggs');
  await expect(page.locator('#name-error')).toHaveCount(0);
  await expect(page.getByLabel('Your name')).not.toHaveAttribute('aria-invalid', 'true');
});

test('create account with a broken email and a short password says so under the fields (2)', async ({
  page,
}) => {
  const calls = authCalls(page);
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Jo Bloggs');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password').fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expectFieldError(page, 'email', 'Enter the whole email address, with the @ and the part after it.');
  await expectFieldError(page, 'password', 'Use at least 10 characters.');
  await expect(page.getByLabel('Email')).toBeFocused();
  await expectNoServiceWords(page);
  expect(calls).toEqual([]);
});

test('sign in sent empty asks for both, and a wrong password says they do not match (3)', async ({
  page,
}) => {
  const calls = authCalls(page);
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expectFieldError(page, 'email', 'Enter your email address.');
  await expectFieldError(page, 'password', 'Enter your password.');
  expect(calls).toEqual([]);

  await page.getByLabel('Email').fill(`nobody-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('not the password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText(
    'That email and password do not match an account.',
  );
  await expectNoServiceWords(page);
});

test('an answer the forms do not know is put in Invoica’s words (4)', async ({ page }) => {
  const refuse = { status: 403, json: { code: 'INVALID_ORIGIN', message: 'Invalid origin' } };
  await page.route('**/api/auth/sign-in/email', (r) => r.fulfill(refuse));
  await page.route('**/api/auth/sign-up/email', (r) =>
    r.fulfill({ status: 500, json: { message: 'Failed to create user' } }),
  );
  await page.route('**/api/auth/request-password-reset', (r) => r.fulfill(refuse));
  await page.route('**/api/auth/reset-password', (r) => r.fulfill(refuse));

  await page.goto('/sign-in');
  await page.getByLabel('Email').fill('jo@example.com');
  await page.getByLabel('Password').fill('a password of some length');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText(GENERAL);
  await expectNoServiceWords(page);

  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Jo Bloggs');
  await page.getByLabel('Email').fill('jo@example.com');
  await page.getByLabel('Password').fill('a password of some length');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText(GENERAL);
  await expectNoServiceWords(page);

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('jo@example.com');
  await page.getByRole('button', { name: 'Send a reset link' }).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText(GENERAL);
  await expectNoServiceWords(page);

  await page.goto('/reset-password?token=a-token-for-this-test');
  await page.getByLabel('New password').fill('a new password of some length');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText(GENERAL);
  await expectNoServiceWords(page);
});

test('forgot password with a broken email says so under the field, and sends nothing (5)', async ({
  page,
}) => {
  const calls = authCalls(page);
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByRole('button', { name: 'Send a reset link' }).click();
  await expectFieldError(page, 'email', 'Enter the whole email address, with the @ and the part after it.');
  await expectNoServiceWords(page);
  expect(calls).toEqual([]);
});
