# Plans: the trial and the free plan

What decision 0005 means in the product, before billing exists. Everything here is behind one setting, `INVOICA_PLANS=enforced`. Without it, every organisation has everything, as today.

## Plans

- **Trial:** every new organisation, for 30 days from when it is created. Everything Pro has.
- **Free:** after the trial, without a subscription.
- **Pro** and **Studio:** with a subscription. Billing is not built yet, so no organisation has one.

## What the free plan limits

| | Free | Trial, Pro, Studio |
| --- | --- | --- |
| Active clients | 3 | unlimited |
| Template | Signature, in any of its styles | any |
| Own logo and brand colour on documents | no: Invoica's colour, no logo | yes |
| "Powered by Invoica" on documents | shown (Signature carries it) | on Signature only |

Never limited, on any plan: drafting and issuing invoices to any client already in the account, credit notes, kept PDFs, sending by email, payments, export. Producing a correct invoice is never paywalled (decision 0005). Archived clients count as in the account: the editor lists them apart, under "Archived clients", so they can be invoiced without being restored.

The limits are kept by the application. The database does not enforce them (review 4, R4-L6): a direct database change, or a defect, could add a fourth active client or move the trial's end. Enforcing them in the database changes tenancy rules, so it waits for Kobby.

## Acceptance criteria

Each is a test in `packages/core/test/plans.test.ts`, `packages/db/test/plans.test.ts` or `packages/db/test/review-4.test.ts`.

1. An organisation is on the trial until its trial ends, then free, unless it has a subscription.
2. With plans enforced, a free organisation with three active clients cannot add a client or restore an archived one; archiving one makes room. A trial organisation can add any number.
3. Clients added during the trial stay usable after it: invoices can still be issued to them.
4. With plans enforced, a document issued on the free plan uses Signature in the style chosen (Night head when another template was chosen), Invoica's colour and no logo, and carries "Powered by Invoica" as every Signature does (26 October 2026, `invoice-templates.md`). The editor's preview shows the same.
5. On the trial, or with plans not enforced, documents keep the organisation's template, colour and logo, without the mark.
6. Archived clients are offered in the editor, marked as archived, so a client already in the account can always be invoiced (review 4, R4-L6).
