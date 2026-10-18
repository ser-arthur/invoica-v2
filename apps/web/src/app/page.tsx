import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ButtonLink, Wordmark } from '@/components/ui';
import { getUser } from '@/lib/session';

export default async function HomePage() {
  if (await getUser()) redirect('/dashboard');
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark className="text-2xl" />
        <nav className="flex items-center gap-2">
          <Link href="/sign-in" className="px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink">
            Sign in
          </Link>
          <ButtonLink href="/sign-up" size="sm">
            Create account
          </ButtonLink>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-5 pb-20 sm:px-8">
        <h1 className="max-w-[16ch] font-display text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[72px]">
          Look established from your first invoice.
        </h1>
        <p className="mt-6 max-w-[52ch] text-lg text-muted">
          Invoices that are typeset properly, add up to the penny and never change once sent. Then see at a
          glance who owes you what, and since when.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/sign-up" size="lg">
            Start your 30 days free
          </ButtonLink>
          <ButtonLink href="/sign-in" size="lg" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
        <p className="mt-4 text-[14px] text-muted">
          No card needed. Free for up to three clients after the trial.
        </p>
      </main>
    </div>
  );
}
