'use client';

import { Button, ButtonLink, PaperMark, Panel } from '@/components/ui';

/** Shown inside the app when a page fails to load. Nothing is saved by loading a page, so nothing has changed. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Panel className="flex flex-col items-start gap-3 px-5 py-10 sm:items-center sm:text-center">
      <PaperMark />
      <h1 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink">
        This page could not be loaded
      </h1>
      <p className="max-w-[46ch] text-muted">
        Nothing was changed. Try again; if it fails again, send us the reference below.
      </p>
      {error.digest ? <p className="text-[13px] text-muted tabular">Reference {error.digest}</p> : null}
      <div className="mt-1 flex flex-wrap gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/dashboard" variant="secondary">
          Go to the dashboard
        </ButtonLink>
      </div>
    </Panel>
  );
}
