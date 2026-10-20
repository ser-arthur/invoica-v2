import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth';
import { env } from '@/lib/env';
import { legacyConfirmationRedirect } from '@/lib/confirmation-link';

export async function GET(request: Request) {
  // Better Auth's own confirmation links open the page that asks for the password (sign-in-by-email.md, rule 1).
  const confirm = legacyConfirmationRedirect(new URL(request.url));
  if (confirm) return Response.redirect(new URL(confirm, env.authUrl), 303);
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}
