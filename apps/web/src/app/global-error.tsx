'use client';

import './globals.css';
import { buttonClass } from '@/components/ui';

/** Shown when the app's outer frame itself fails, in place of the whole page. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-GB" data-theme="light">
      <body>
        <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center gap-3 px-5">
          <h1 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            Invoica could not be loaded
          </h1>
          <p className="text-muted">
            Nothing was changed. Try again; if it fails again, send us the reference below.
          </p>
          {error.digest ? <p className="text-[13px] text-muted">Reference {error.digest}</p> : null}
          <button type="button" onClick={reset} className={buttonClass('primary', 'md', 'mt-2 self-start')}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
