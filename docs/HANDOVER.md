# Handover

Read `docs/BLUEPRINT.md` first, then this file. Update both at the end of every session.

## Current state (19 October 2026, about 01:15)

This is the **v2 repository**: a re-architecture from scratch (decision 0001). The old Flask app lives in the old repository (`ser-arthur/invoica`) as a reference and receives no changes. Docs from the old repository's patches 01 to 04 were carried over into `docs/`.

**Working end to end, locally:** sign up, onboarding (country, currency, time zone, VAT registration with the UK or Ghana tax preset loaded), settings (business, logo, tax, rounding choices allowed for the country, numbering, brand colour, template with live previews, bank and mobile money details, tax codes), clients, saved items, the invoice editor with live totals and a live preview, issuing with a gapless number and a frozen snapshot, the kept PDF in seven templates, sending by email through the outbox (development mailbox), recording and removing payments, credit notes (whole, lines or an amount, with a live preview of the figures), voiding, duplicating, the invoice list with filters, client pages with what each owes, a dashboard computed from records, data export (JSON and CSV), and a landing page.

**Checks (last full run, 19 October 2026, about 01:00):**

| Suite | Count | Result |
| --- | --- | --- |
| Core unit and property tests (money, tax, totals, credits, rounding, states, snapshot) | 150 | pass |
| Database tests (tenancy, immutability, numbering, payments, credit notes, review 1 guards, outbox, dashboard, schema drift) | 51 | pass |
| Schemas | 4 | pass |
| Document view and rendering | 8 | pass |
| PDF (fonts embedded, one page for an ordinary invoice, page breaks and numbers on a long one, every template) | 15 | pass |
| Web unit | 5 | pass |
| End to end, desktop and phone (invoice flow, two payments and a line credit from one page, cross-business access, email, axe in light and dark, sideways scroll at 320 to 430px) | 14 | pass |
| Format, copy rules, lint, typecheck, production build | | pass |

No test was skipped. CI on GitHub has not run (no access yet).

**Review:** the first independent review (`docs/reviews/review-1.md`) found no tenancy holes and 17 money and guard findings; all are fixed, and its Resolution section maps each finding to its fix and tests. A second independent review of those fixes is running; its report goes to `docs/reviews/review-2.md`.

**Local databases:** `invoica` (manual testing) and `invoica_demo` (seeded; three demo businesses). Both are migrated to 0005. Migration 0005 has run, so it is never edited: changes go in 0006.

## Delivery method

The v2 repository is delivered as a **git bundle in a numbered zip** (`invoica-repo-NN.zip`), because Claude has no GitHub access yet. Each zip holds `invoica.bundle` (the full history), `VERIFY.md` and `verify.sh`.

To set up the first time:

```
unzip invoica-repo-02.zip -d ~/Downloads/invoica-repo-02
git clone ~/Downloads/invoica-repo-02/invoica.bundle invoica
cd invoica
sh ~/Downloads/invoica-repo-02/verify.sh
```

To take a later bundle into an existing clone: `git pull ~/Downloads/invoica-repo-NN/invoica.bundle main`.

The switch to pull requests (foundation section 7) is still blocked on GitHub access: "link your GitHub account to let Claude access repositories". When it is unblocked, Kobby creates a new empty GitHub repository for v2 and pushes this history to it.

## What changed last

Session of 18 to 19 October 2026 (Kobby away, full autonomy for the night): phases 1a to 2g built and checked; PDF engine spike (decision 0006, proposed, built); UK and Ghana tax research (`docs/specs/tax-uk.md`, `docs/specs/tax-ghana.md`); tax rounding (0007, proposed, built); first design critique applied (`docs/design/app-critique-1.md`); email through the outbox, logo upload, duplicate, export, landing page; four new templates; review 1 and all its fixes (commits `de2c825`, `92819ac`). Round 2 templates are on the design canvas, page "Round 2, built".

## Next steps

1. Act on review 2 when it lands: fix what it confirms, tests first, in migration 0006 where the database is involved.
2. Design polish (phase 2h): quick actions in the invoice list, the owed figure on the dashboard, the editor on phones, empty states, a dark mode pass.
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
