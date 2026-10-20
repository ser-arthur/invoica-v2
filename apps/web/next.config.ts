import { join } from 'node:path';
import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

/** For `next build`: a self-contained server for the container image (Dockerfile), with the fonts PDFs embed. */
const standalone: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: join(import.meta.dirname, '../..'),
  outputFileTracingIncludes: { '/**': ['../../packages/documents/fonts/**'] },
};

const config: NextConfig = {
  transpilePackages: ['@invoica/core', '@invoica/schemas', '@invoica/db', '@invoica/documents'],
  serverExternalPackages: ['pg', 'playwright-core'],
  poweredByHeader: false,
  agentRules: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
    ];
  },
};

// The development server leaves these out: with them it reloads the page in a loop.
export default (phase: string): NextConfig =>
  phase === PHASE_DEVELOPMENT_SERVER ? config : { ...config, ...standalone };
