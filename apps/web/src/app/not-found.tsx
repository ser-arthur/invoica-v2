import Link from 'next/link';
import { ButtonLink, PaperMark, Wordmark } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Invoica home">
          <Wordmark className="text-2xl" />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-5 pt-10 pb-16 sm:pt-24">
        <div className="flex max-w-[420px] flex-col items-start gap-3">
          <PaperMark />
          <h1 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            This page does not exist
          </h1>
          <p className="text-muted">The link may be mistyped or out of date.</p>
          <ButtonLink href="/" className="mt-2">
            Go to Invoica
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
