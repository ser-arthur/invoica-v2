import 'server-only';
import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint, formCsrfMiddleware } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import * as z from 'zod';
import { confirmationAddress } from './confirmation-link';

export const INVALID_PASSWORD = 'That is not the password for this account.';

/**
 * docs/specs/sign-in-by-email.md, rule 1: `POST /api/auth/confirm-email` confirms an address only with the token
 * from its link and the account's password, then signs in. A wrong password changes nothing. An address already
 * confirmed is refused before any password is checked (`ALREADY_CONFIRMED`): signing in is then sign-in's job, so the
 * link is never a second way to try passwords. Limited and guarded against other sites like sign-in.
 */
export function confirmWithPassword() {
  return {
    id: 'confirm-with-password',
    endpoints: {
      confirmEmailWithPassword: createAuthEndpoint(
        '/confirm-email',
        {
          method: 'POST',
          // Refused from another site, as sign-in is, so no page elsewhere can sign a visitor in to its account.
          use: [formCsrfMiddleware],
          body: z.object({ token: z.string().min(1).max(4096), password: z.string().min(1).max(256) }),
        },
        async (ctx) => {
          const email = await confirmationAddress(ctx.body.token, ctx.context.secret);
          const found = email
            ? await ctx.context.internalAdapter.findUserByEmail(email, { includeAccounts: true })
            : null;
          if (!email || !found) {
            throw new APIError('BAD_REQUEST', {
              code: 'INVALID_TOKEN',
              message: 'This link has expired or has been used.',
            });
          }
          if (found.user.emailVerified) {
            throw new APIError('BAD_REQUEST', {
              code: 'ALREADY_CONFIRMED',
              message: 'This address is already confirmed. Sign in to continue.',
            });
          }
          const hash = found.accounts.find(
            (account) => account.providerId === 'credential' && account.accountId === found.user.id,
          )?.password;
          const right = hash
            ? await ctx.context.password.verify({ hash, password: ctx.body.password })
            : (await ctx.context.password.hash(ctx.body.password), false);
          if (!right)
            throw new APIError('UNAUTHORIZED', { code: 'INVALID_PASSWORD', message: INVALID_PASSWORD });
          await ctx.context.internalAdapter.updateUserByEmail(email, { emailVerified: true });
          const session = await ctx.context.internalAdapter.createSession(found.user.id);
          if (!session) {
            throw new APIError('INTERNAL_SERVER_ERROR', {
              code: 'FAILED_TO_CREATE_SESSION',
              message: 'Something went wrong. Try again.',
            });
          }
          await setSessionCookie(ctx, { session, user: { ...found.user, emailVerified: true } });
          return ctx.json({ status: true });
        },
      ),
    },
    rateLimit: [{ pathMatcher: (path: string) => path === '/confirm-email', window: 10, max: 3 }],
  } satisfies BetterAuthPlugin;
}
