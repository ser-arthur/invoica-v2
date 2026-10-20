import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { schema } from '@invoica/db';
import { getDb } from './db';
import { env } from './env';
import { clientAddressOptions } from './request-guards';
import {
  existingAccountEmail,
  passwordChangedEmail,
  resetPasswordEmail,
  verificationEmail,
} from './auth-emails';
import { inBackground, sendAuthEmail, sendLater } from './auth-mail';
import { signUpNameProblem } from './sign-up-name';
import { confirmWithPassword } from './auth-confirm';
import { confirmationUrl } from './confirmation-link';

function createAuth() {
  return betterAuth({
    appName: 'Invoica',
    secret: env.authSecret,
    baseURL: env.authUrl,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: {
        user: schema.authUser,
        session: schema.authSession,
        account: schema.authAccount,
        verification: schema.authVerification,
      },
    }),
    // docs/specs/sign-in-by-email.md: an account signs in once its email is confirmed, sign-up answers alike for
    // new and existing addresses, and every email goes out after the response.
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => sendAuthEmail(user.email, resetPasswordEmail({ url })),
      onExistingUserSignUp: async ({ user }) =>
        sendAuthEmail(user.email, existingAccountEmail({ appUrl: env.authUrl })),
      // Opening a reset link proves the mailbox, as a confirmation link does, so a reset also confirms the address
      // (docs/specs/sign-in-by-email.md, rule 8): the owner of an address someone else signed up with takes the
      // account over with a reset and then signs in.
      onPasswordReset: async ({ user }) => {
        if (!user.emailVerified) {
          await (await getAuth().$context).internalAdapter.updateUser(user.id, { emailVerified: true });
        }
        inBackground(sendAuthEmail(user.email, passwordChangedEmail({ appUrl: env.authUrl })));
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      // The link opens a page that asks for the account's password, and only that confirms the address
      // (`confirmWithPassword`), so a click by someone who does not know the password confirms nothing.
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, token }) =>
        sendLater(user.email, verificationEmail({ url: confirmationUrl(env.authUrl, token) })),
    },
    // Confirms an address on opening its link; the route handler sends those links to the password page instead.
    disabledPaths: ['/verify-email'],
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: { enabled: true, window: 60, max: 30 },
    // Checked before the account is looked up, so the answer is the same for new and existing addresses.
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-up/email') return;
        const problem = signUpNameProblem(String((ctx.body as { name?: unknown } | undefined)?.name ?? ''));
        if (problem) throw new APIError('BAD_REQUEST', { message: problem, code: 'INVALID_NAME' });
      }),
    },
    advanced: {
      ipAddress: clientAddressOptions({
        header: env.clientIpHeader,
        proxies: env.trustedProxies,
        production: env.secureCookies,
      }),
      useSecureCookies: env.secureCookies,
      backgroundTasks: { handler: inBackground },
    },
    telemetry: { enabled: false },
    plugins: [confirmWithPassword(), nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { invoicaAuth?: Auth };

export function getAuth(): Auth {
  if (!globalForAuth.invoicaAuth) globalForAuth.invoicaAuth = createAuth();
  return globalForAuth.invoicaAuth;
}
