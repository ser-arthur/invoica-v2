import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { pageTheme } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Invoica', template: '%s | Invoica' },
  description:
    'Invoicing for freelancers and small businesses. Invoices that make a new business look established, followed all the way to paid.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1310' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The signed-in person's account theme, else this device's (docs/specs/theme-on-the-account.md).
  const { theme: preference } = await pageTheme();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en-GB" data-theme={preference === 'dark' ? 'dark' : 'light'} suppressHydrationWarning>
      <head>
        {preference === 'system' ? (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html:
                "if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark'",
            }}
          />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
