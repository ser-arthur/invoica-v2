import { expect, test } from '@playwright/test';
import { PASSWORD, confirmAndSignIn, signUp, uniqueEmail } from './helpers';
import { emailsTo, linkIn, waitForEmail } from './mailbox';

/** docs/specs/sign-in-by-email.md, acceptance criteria 1 to 9. */

test.skip(({ isMobile }) => isMobile, 'The flows are the same at every width; the desktop run covers them.');

const NEW_PASSWORD = 'a different long passphrase';

test('1: sign-up waits for the email link, which asks for the password, then confirms the address and signs in', async ({
  page,
}) => {
  const started = Date.now();
  const email = uniqueEmail('verify');
  await signUp(page, email);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await page.goto('/dashboard');
  await page.waitForURL('**/sign-in');
  const sent = await waitForEmail(email, 'Confirm your email for Invoica', started);
  await confirmAndSignIn(page, email, linkIn(sent));
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

test('4: a broken confirmation link says so and can send a new one; a used one opens sign-in', async ({
  page,
}) => {
  const started = Date.now();
  const email = uniqueEmail('broken');
  await signUp(page, email);
  const sent = await waitForEmail(email, 'Confirm your email for Invoica', started);
  const broken = linkIn(sent).replace(/token=[^&]+/, 'token=not-a-token');
  await page.goto(broken);
  await expect(page.getByRole('heading', { name: 'This link has expired or has been used' })).toBeVisible();
  await expect(page.locator('#password')).toHaveCount(0);
  const again = Date.now();
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Send a new link' }).click();
  await expect(page.getByText(`If ${email} needs confirming, a new link is on its way.`)).toBeVisible();
  const link = linkIn(await waitForEmail(email, 'Confirm your email for Invoica', again));
  await confirmAndSignIn(page, email, link);
  // Opened again once the address is confirmed: signed in, it goes on to the app; signed out, to sign-in.
  await page.goto(link);
  await page.waitForURL('**/onboarding');
  await page.context().clearCookies();
  await page.goto(link);
  await page.waitForURL('**/sign-in?confirmed=1');
  await expect(page.getByText('Your email address is confirmed. Sign in to continue.')).toBeVisible();
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
  await confirmAndSignIn(
    page,
    email,
    linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started)),
  );
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
      headers: { origin: new URL(page.url()).origin, 'x-forwarded-for': `10.9.${answers.length}.7` },
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

test('8: someone who signs up with another person’s address cannot have it confirmed by that person’s click', async ({
  page,
  browser,
}) => {
  const started = Date.now();
  const email = uniqueEmail('owner');
  // Someone else signs up with the owner's address and a password of their own.
  await signUp(page, email);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  const link = linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started));
  // The owner of the address opens the link in their own browser: it asks for a password they do not know.
  const owner = await browser.newContext();
  const ownerPage = await owner.newPage();
  await ownerPage.goto(link);
  await ownerPage.waitForURL(/\/confirm-email\?token=/);
  await expect(ownerPage.getByText(email)).toBeVisible();
  await ownerPage.fill('#password', 'a guess at the password');
  await ownerPage.getByRole('button', { name: 'Confirm and sign in' }).click();
  await expect(ownerPage.getByText('That is not the password for this account.')).toBeVisible();
  // The link in the form Invoica used to send confirms nothing either: it opens the same page.
  const token = new URL(link).searchParams.get('token')!;
  await ownerPage.goto(`/api/auth/verify-email?token=${token}&callbackURL=%2Fconfirm-email`);
  await ownerPage.waitForURL(/\/confirm-email\?token=/);
  await expect(ownerPage.locator('#password')).toBeVisible();
  expect((await owner.cookies()).some((c) => c.name.includes('session_token'))).toBe(false);
  await owner.close();
  // So the address is still unconfirmed, and the person who signed up with it cannot sign in.
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByText('Confirm your email address first. We have sent you a new link.'),
  ).toBeVisible();
});

test('9: a wrong password on the confirmation page confirms nothing, and the right one then does', async ({
  page,
}) => {
  const started = Date.now();
  const email = uniqueEmail('mistyped');
  await signUp(page, email);
  const link = linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started));
  await page.goto(link);
  await page.fill('#password', 'correct horse batteries');
  await page.getByRole('button', { name: 'Confirm and sign in' }).click();
  await expect(page.getByText('That is not the password for this account.')).toBeVisible();
  await expect(page).toHaveURL(/\/confirm-email\?token=/);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Confirm and sign in' }).click();
  await page.waitForURL('**/onboarding');
});

test('10: confirming with the password is refused from another site, and limited like sign-in', async ({
  page,
  request,
}) => {
  const started = Date.now();
  const email = uniqueEmail('limited');
  await signUp(page, email);
  const token = new URL(
    linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started)),
  ).searchParams.get('token')!;
  const origin = new URL(page.url()).origin;
  const confirm = (password: string, from: string, address: string) =>
    request.post('/api/auth/confirm-email', {
      headers: { origin: from, 'x-forwarded-for': address },
      data: { token, password },
    });
  // Another site cannot sign a visitor in to an account it holds the link and password for.
  expect((await confirm(PASSWORD, 'https://elsewhere.example', '10.8.0.1')).status()).toBe(403);
  // A token changed by hand is refused as a broken link.
  const changed = await request.post('/api/auth/confirm-email', {
    headers: { origin, 'x-forwarded-for': '10.8.0.2' },
    data: { token: `${token.slice(0, -2)}xx`, password: PASSWORD },
  });
  expect([changed.status(), (await changed.json()).code]).toEqual([400, 'INVALID_TOKEN']);
  // Three tries every ten seconds from one address; the fourth waits, even with the right password.
  const answers = [];
  for (const password of ['guess one', 'guess two', 'guess three', PASSWORD])
    answers.push((await confirm(password, origin, '10.8.0.3')).status());
  expect(answers).toEqual([401, 401, 401, 429]);
  // Nothing was confirmed along the way.
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByText('Confirm your email address first. We have sent you a new link.'),
  ).toBeVisible();
});

test('11: before the page’s script runs, sign-in cannot be sent, so a password never goes in the address', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  await page.fill('#email', 'someone@example.test');
  await page.fill('#password', PASSWORD);
  await page.press('#password', 'Enter');
  await page.waitForTimeout(1000);
  expect(page.url()).not.toContain('password');
  await context.close();
});
