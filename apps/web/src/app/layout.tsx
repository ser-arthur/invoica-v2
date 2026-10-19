import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Invoica', template: '%s | Invoica' },
  description:
    'Invoices that make a new business look established, and an easy way to keep track of what is owed.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1310' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preference = (await cookies()).get('invoica_theme')?.value ?? 'light';
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
