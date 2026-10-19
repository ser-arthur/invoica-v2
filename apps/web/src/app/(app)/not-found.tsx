import { ButtonLink, PaperMark, Panel } from '@/components/ui';

export default function NotFoundInApp() {
  return (
    <Panel className="flex flex-col items-start gap-3 px-5 py-10 sm:items-center sm:text-center">
      <PaperMark />
      <h1 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink">
        Nothing here
      </h1>
      <p className="max-w-[46ch] text-muted">
        This page does not exist, or it belongs to another business. The link may be out of date.
      </p>
      <ButtonLink href="/invoices" variant="secondary" className="mt-1">
        Back to invoices
      </ButtonLink>
    </Panel>
  );
}
