import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { schema } from '@invoica/db';
import { getDb } from './db';
import { env } from './env';
import { clientAddressOptions } from './request-guards';

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
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
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
