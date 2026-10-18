import type { NextConfig } from 'next';

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
        ],
      },
    ];
  },
};

export default config;
