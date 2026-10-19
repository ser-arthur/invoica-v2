import { NextResponse, type NextRequest } from 'next/server';
import { actionOriginAllowed } from './lib/request-guards';

/**
 * Sets a Content-Security-Policy with a fresh nonce on every page. Next.js puts the nonce on its own scripts; the one
 * inline script of the app (the theme switch in the root layout) reads it from the `x-nonce` request header. Scripts
 * from anywhere else, plugins, other sites framing the app and forms posting elsewhere are refused, and so is a server
 * action that does not come from the app's own origin.
 */
export function proxy(request: NextRequest) {
  // A server action is accepted only from the app's own origin, so a request without one is refused too.
  const app = process.env.BETTER_AUTH_URL;
  if (app && !actionOriginAllowed(request.method, request.headers, app)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV !== 'production';
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not API routes, files, fonts or Next.js's own static files, and not prefetches.
      source: '/((?!api|files|doc-fonts|_next/static|_next/image|icon.svg).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
