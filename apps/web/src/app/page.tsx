import Link from 'next/link';
import { redirect } from 'next/navigation';
import { renderDocumentHtml, sampleSnapshot } from '@invoica/documents';
import { ButtonLink, Wordmark } from '@/components/ui';
import { Paper } from '@/components/paper';
import { getUser } from '@/lib/session';

const fontUrl = (f: string) => `/doc-fonts/${f}`;

const STEPS = [
  {
    title: 'Set up once',
    body: 'Your business name, logo, colour, VAT number and how clients pay you. Every invoice carries them from then on.',
  },
  {
    title: 'Write it and see it',
    body: 'Type the lines and watch the invoice take shape beside them, exactly as your client will receive it.',
  },
  {
    title: 'Issue, send, get paid',
    body: 'It gets its number and is kept as sent. Record payments as they arrive and see at a glance who still owes you.',
  },
];

export default async function HomePage() {
  if (await getUser()) redirect('/dashboard');
  const front = renderDocumentHtml(sampleSnapshot({ template: 'signature' }), { fontUrl });
  const middle = renderDocumentHtml(
    sampleSnapshot({ template: 'studio', seller: { name: 'Northlight Studio', brandColour: '#d9480f' } }),
    { fontUrl },
  );
  const back = renderDocumentHtml(
    sampleSnapshot({
      template: 'counsel',
      seller: {
        name: 'Harrow & Vale',
        brandColour: '#1d3c5a',
        taxRegistered: true,
        taxNumber: 'GB 000 0000 00',
      },
    }),
    { fontUrl },
  );

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark className="text-2xl" />
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link href="/sign-in" className="px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink">
            Sign in
          </Link>
          <ButtonLink href="/sign-up" size="sm">
            Create account
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:pt-16">
          <div>
            <h1 className="max-w-[15ch] font-display text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[68px]">
              Look established from your first invoice.
            </h1>
            <p className="mt-6 max-w-[48ch] text-lg text-muted">
              Invoices typeset properly, correct to the penny, and kept exactly as they were sent. Then see at
              a glance who owes you what, and since when.
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
          </div>

          <div
            className="relative mx-auto h-[470px] w-[330px] sm:h-[560px] sm:w-[440px]"
            role="img"
            aria-label="Three invoices in different templates: Signature, Studio and Counsel"
          >
            <Paper
              html={back}
              width={300}
              title="Counsel template"
              className="absolute top-2 right-0 hidden rotate-[4deg] sm:block"
            />
            <Paper
              html={middle}
              width={300}
              title="Studio template"
              className="absolute top-8 left-0 -rotate-[5deg]"
            />
            <Paper
              html={front}
              width={330}
              title="Signature template"
              className="absolute top-24 left-1/2 -translate-x-1/2 sm:top-28"
            />
          </div>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8">
            <h2 className="max-w-[24ch] font-display text-[28px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]">
              From a first invoice to being paid
            </h2>
            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col gap-3">
                  <span className="font-display text-[15px] font-semibold text-brand tabular" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="max-w-[38ch] text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-5 py-8 text-[14px] text-muted sm:flex-row sm:justify-between sm:px-8">
        <Wordmark className="text-lg" />
        <p>Invoices, clients and getting paid, for freelancers, studios and small firms.</p>
      </footer>
    </div>
  );
}
