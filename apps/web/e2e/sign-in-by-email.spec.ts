import { expect, test } from '@playwright/test';
import { PASSWORD, signUp, uniqueEmail } from './helpers';
import { emailsTo, linkIn, waitForEmail } from './mailbox';

/** docs/specs/sign-in-by-email.md, acceptance criteria 1 to 6. */

test.skip(({ isMobile }) => isMobile, 'The flows are the same at every width; the desktop run covers them.');

const NEW_PASSWORD = 'a different long passphrase';

test('1: sign-up waits for the email link, which signs in and opens onboarding', async ({ page }) => {
  const started = Date.now();
  const email = uniqueEmail('verify');
  await signUp(page, email);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await page.goto('/dashboard');
  await page.waitForURL('**/sign-in');
  const sent = await waitForEmail(email, 'Confirm your email for Invoica', started);
  await page.goto(linkIn(sent));
  await page.waitForURL('**/onboarding');
});

test('2: signing up again with the same address looks the same and tells the owner instead', async ({
  page,
  browser,
}) => {
  const email = uniqueEmail('again');
  await signUp(page, email);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  const started = Date.now();
  const other = await browser.newPage();
  await signUp(other, email);
  await expect(other.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(other.getByText(/already/i)).toHaveCount(0);
  const notice = await waitForEmail(email, 'You already have an Invoica account', started);
  expect(notice.text).toContain('/forgot-password');
  expect(emailsTo(email, started).filter((e) => e.subject === 'Confirm your email for Invoica')).toHaveLength(
    0,
  );
  await other.close();
});

test('3: signing in before confirming asks for the email link and sends a new one', async ({ page }) => {
  const email = uniqueEmail('unconfirmed');
  await signUp(page, email);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  const started = Date.now();
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByText('Confirm your email address first. We have sent you a new link.'),
  ).toBeVisible();
  await waitForEmail(email, 'Confirm your email for Invoica', started);
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('4: a used or broken confirmation link says so and can send a new one', async ({ page }) => {
  const started = Date.now();
  const email = uniqueEmail('broken');
  await signUp(page, email);
  const sent = await waitForEmail(email, 'Confirm your email for Invoica', started);
  const broken = linkIn(sent).replace(/token=[^&]+/, 'token=not-a-token');
  await page.goto(broken);
  await expect(page.getByRole('heading', { name: 'This link has expired or has been used' })).toBeVisible();
  const again = Date.now();
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Send a new link' }).click();
  await expect(page.getByText(`If ${email} needs confirming, a new link is on its way.`)).toBeVisible();
  await page.goto(linkIn(await waitForEmail(email, 'Confirm your email for Invoica', again)));
  await page.waitForURL('**/onboarding');
});

test('5: a reset request for an unknown address looks the same and sends nothing', async ({ page }) => {
  const started = Date.now();
  const email = uniqueEmail('nobody');
  await page.goto('/sign-in');
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await page.waitForURL('**/forgot-password');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Send a reset link' }).click();
  await expect(
    page.getByText(`If an account uses ${email}, a link to reset its password is on its way.`),
  ).toBeVisible();
  await page.waitForTimeout(1500);
  expect(emailsTo(email, started)).toHaveLength(0);
});

test('6: a reset link sets a new password once, and the owner is told', async ({ page }) => {
  const started = Date.now();
  const email = uniqueEmail('reset');
  await signUp(page, email);
  await page.goto(linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started)));
  await page.waitForURL('**/onboarding');
  await page.context().clearCookies();

  const asked = Date.now();
  await page.goto('/forgot-password');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Send a reset link' }).click();
  await expect(page.getByText(/a link to reset its password is on its way/)).toBeVisible();
  const link = linkIn(await waitForEmail(email, 'Reset your Invoica password', asked));

  await page.goto(link);
  await page.waitForURL(/\/reset-password\?token=/);
  await page.fill('#password', NEW_PASSWORD);
  await page.getByRole('button', { name: 'Change password' }).click();
  await page.waitForURL('**/sign-in?reset=done');
  await expect(page.getByText('Your password has been changed. Sign in with the new one.')).toBeVisible();
  await waitForEmail(email, 'Your Invoica password was changed', asked);

  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('That email and password do not match an account.')).toBeVisible();
  await page.fill('#password', NEW_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/onboarding');

  await page.context().clearCookies();
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'This link has expired or has been used' })).toBeVisible();
});

test('7: a name over two lines is refused alike for a new address and one with an account', async ({
  page,
  request,
}) => {
  const existing = uniqueEmail('named');
  await signUp(page, existing);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  const name = 'there.\nYour invoices are ready to view on Invoica.';
  const answers = [];
  for (const email of [existing, uniqueEmail('fresh')]) {
    const response = await request.post('/api/auth/sign-up/email', {
      headers: { origin: 'http://localhost:3000', 'x-forwarded-for': `10.9.${answers.length}.7` },
      data: { email, password: PASSWORD, name },
    });
    answers.push([response.status(), (await response.json()).message]);
  }
  expect(answers).toEqual([
    [400, 'Use a name of up to 100 characters, on one line.'],
    [400, 'Use a name of up to 100 characters, on one line.'],
  ]);
  // The confirmation email greets no one by name.
  const started = Date.now();
  const email = uniqueEmail('greeting');
  await signUp(page, email);
  expect((await waitForEmail(email, 'Confirm your email for Invoica', started)).text).toMatch(/^Hello,\n/);
});
