import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
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
import { inBackground, sendAuthEmail } from './auth-mail';

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
      sendResetPassword: async ({ user, url }) =>
        sendAuthEmail(user.email, resetPasswordEmail({ name: user.name, url })),
      onExistingUserSignUp: async ({ user }) =>
        sendAuthEmail(user.email, existingAccountEmail({ name: user.name, appUrl: env.authUrl })),
      onPasswordReset: async ({ user }) =>
        inBackground(
          sendAuthEmail(user.email, passwordChangedEmail({ name: user.name, appUrl: env.authUrl })),
        ),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) =>
        sendAuthEmail(user.email, verificationEmail({ name: user.name, url })),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: { enabled: true, window: 60, max: 30 },
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
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { invoicaAuth?: Auth };

export function getAuth(): Auth {
  if (!globalForAuth.invoicaAuth) globalForAuth.invoicaAuth = createAuth();
  return globalForAuth.invoicaAuth;
}
