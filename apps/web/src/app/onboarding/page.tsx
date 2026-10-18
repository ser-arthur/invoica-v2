import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { myOrganisations } from '@invoica/db';
import { Wordmark } from '@/components/ui';
import { getDb } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Set up your business' };

export default async function OnboardingPage() {
  const user = await requireUser();
  if ((await myOrganisations(getDb(), user.id)).length > 0) redirect('/dashboard');
  return (
    <div className="min-h-dvh">
      <header className="px-5 py-5 sm:px-8">
        <Wordmark className="text-2xl" />
      </header>
      <main className="mx-auto max-w-[560px] px-5 pt-4 pb-20 sm:pt-10">
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          Tell us about your business
        </h1>
        <p className="mt-2 max-w-[52ch] text-muted">
          This sets the currency, dates and taxes your invoices start with. You can change any of it in
          Settings.
        </p>
        <OnboardingForm />
      </main>
    </div>
  );
}
