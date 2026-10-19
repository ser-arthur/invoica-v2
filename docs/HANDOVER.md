# Handover

Read `docs/BLUEPRINT.md` first, then this file. Update both at the end of every session.

## Current state (19 October 2026, about 02:15)

This is the **v2 repository**: a re-architecture from scratch (decision 0001). The old Flask app lives in the old repository (`ser-arthur/invoica`) as a reference and receives no changes.

**Working end to end, locally:** sign up, onboarding, settings (business, logo, tax, rounding choices allowed for the country, numbering, brand colour, template with live previews, bank and mobile money, tax codes), clients, saved items, the invoice editor with live totals and preview (lines fold on phones), issuing with a gapless number and a frozen snapshot, the kept PDF in seven templates, sending by email through the outbox (development mailbox), payments, credit notes (whole, lines or an amount, worked out from a ledger by tax group, with a live preview), voiding, duplicating, quick actions on invoice rows, client pages, a dashboard that names who to chase first, data export, and a landing page.

**Checks (last full run, 19 October 2026, about 02:10):**

| Suite | Count | Result |
| --- | --- | --- |
| Core (money, tax, totals, the credit ledger with a property test over random mixes of credits, rounding, states, receivables, snapshot) | 152 | pass |
| Database (tenancy, immutability, numbering, payments, credit notes, review 1 and review 2 guards, outbox, dashboard, schema drift) | 59 | pass |
| Schemas | 4 | pass |
| Document view and rendering | 10 | pass |
| PDF (fonts, one page for an ordinary invoice, page breaks, and the hard document pack on every template) | 50 | pass |
| Web unit | 5 | pass |
| End to end, desktop and phone (invoice flow, payments and credits from one page, quick actions, folded lines, cross-business access, email, axe in light and dark, nothing cut off at 320 to 430px, keyboard focus) | 19 | pass; 3 skipped by design (one screen size only) |
| Format, copy rules, lint, typecheck, production build | | pass |

CI on GitHub has not run (no access yet).

**Reviews:** review 1 (`docs/reviews/review-1.md`) and review 2 (`docs/reviews/review-2.md`), each with a Resolution section mapping findings to fixes and tests. Review 3, of the credit ledger, is running; its report goes to `docs/reviews/review-3.md`.

**Local databases:** `invoica` (manual testing) and `invoica_demo` (seeded). Both are migrated to 0006. Migrations that have run are never edited: changes go in a new one.

## Delivery method

The v2 repository is delivered as a **git bundle in a numbered zip** (`invoica-repo-NN.zip`), because Claude has no GitHub access yet. Each zip holds `invoica.bundle` (the full history), `VERIFY.md` and `verify.sh`.

To set up the first time:

```
unzip invoica-repo-03.zip -d ~/Downloads/invoica-repo-03
git clone ~/Downloads/invoica-repo-03/invoica.bundle invoica
cd invoica
sh ~/Downloads/invoica-repo-03/verify.sh
```

To take a later bundle into an existing clone: `git pull ~/Downloads/invoica-repo-NN/invoica.bundle main`.

The switch to pull requests (foundation section 7) is still blocked on GitHub access: "link your GitHub account to let Claude access repositories". When it is unblocked, Kobby creates a new empty GitHub repository for v2 and pushes this history to it.

## What changed last

Session of 18 to 19 October 2026 (Kobby away, full autonomy for the night): phases 1a to 2g built and checked; PDF engine spike (decision 0006, proposed, built); UK and Ghana tax research (`docs/specs/tax-uk.md`, `docs/specs/tax-ghana.md`); tax rounding (0007, proposed, built); first design critique applied (`docs/design/app-critique-1.md`); email through the outbox, logo upload, duplicate, export, landing page; four new templates; review 1 and all its fixes (commits `de2c825`, `92819ac`). Round 2 templates are on the design canvas, page "Round 2, built".

## Next steps

1. Act on review 3 when it lands, tests first; database changes in migration 0007.
2. Phase 2i: the trial and the free plan behind a feature flag (decision 0005).
3. Kobby's answers to the open questions, then templates round 3 from his comments on the canvas.

## Open questions for Kobby

1. Approve or change decisions 0003, 0006 and 0007.
2. Which invoice templates ship in v1. All seven are on the design canvas.
3. Is `invoica.com` Invoica's domain (audit I-M11)? Demo data uses `example` domains.
4. Keep Claude's co-author lines on commits (they are on every commit so far)?
5. GitHub access for pull requests.
6. Email provider for sending invoices (Postmark, Resend or Amazon SES) and the hosting region (decision 0008).
7. Ghana: whether service providers must register for VAT at any turnover (sources disagree; `docs/specs/tax-ghana.md`), and whether Invoica should pursue GRA E-VAT certification.
8. Review 1, L3: a separate database role for the outbox worker. Ready to build; it changes tenancy rules, so it waits for approval.
9. Should a business that is not registered for tax be able to mark lines zero-rated? Currently refused.
10. Crediting a paid invoice (review 2, R2-L5): a credit note above the balance owed needs a refund or a client credit balance. Which should Invoica offer?

## Decisions

| Record | Title | Status |
| --- | --- | --- |
| 0001 | Rewrite strategy | Accepted |
| 0002 | Stack | Accepted |
| 0003 | Audience and v1 scope | Proposed |
| 0004 | Launch market and tax | Accepted |
| 0005 | Positioning and pricing | Accepted |
| 0006 | PDF engine | Proposed, built |
| 0007 | Tax rounding | Proposed, built |
| 0008 | Email provider | Open |
