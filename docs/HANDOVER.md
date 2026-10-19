# Handover

Read `docs/BLUEPRINT.md` first, then this file. Update both at the end of every session.

## Current state (19 October 2026, about 04:30)

This is the **v2 repository**: a re-architecture from scratch (decision 0001). The old Flask app lives in the old repository (`ser-arthur/invoica`) as a reference and receives no changes.

**Working end to end, locally:** sign up, onboarding, settings (business, logo, tax, rounding choices allowed for the country, numbering with the real next numbers, brand colour, template with live previews, bank and mobile money, tax codes, plan line), clients (archived ones can still be invoiced), saved items, the invoice editor with live totals and preview (lines fold on phones), issuing with a gapless number and a frozen snapshot, the kept PDF in seven templates, sending by email through the outbox (development mailbox), payments, credit notes (whole, lines, an amount, or everything still owed, worked out slot by slot with a live preview), voiding, duplicating, quick actions on invoice rows, client pages, a dashboard that names who to chase first, data export, the trial and free plan behind `INVOICA_PLANS=enforced`, not-found and error pages, and a landing page.

**Checks (last full run, 19 October 2026, about 04:30):**

| Suite | Count | Result |
| --- | --- | --- |
| Core (money, tax, totals, the credit ledger with property tests over random mixes of credits, part payments and removed payments, VAT in sterling, plans, rounding, states, receivables, snapshot) | 179 | pass |
| Database (tenancy, immutability, numbering, payments, credit notes, review 1 to 4 guards, plans, outbox, dashboard, schema drift) | 79 | pass |
| Schemas | 4 | pass |
| Document view and rendering | 11 | pass |
| PDF (fonts, one page for an ordinary invoice, page breaks, the hard document pack on every template, and 14 approved images) | 64 | pass |
| Web unit | 5 | pass |
| End to end, desktop and phone (invoice flow, payments and credits, everything still owed, quick actions, folded lines, cross-business access, email, missing pages, dialogs keeping focus, axe in light and dark with dialogs open, nothing cut off at 320 to 430px, keyboard focus) | 29 | pass; 3 skipped by design (one screen size only) |
| Format, copy rules, lint, typecheck, production build | | pass |

Run the end-to-end suite against the development server (`pnpm dev`, then `E2E_BASE_URL=http://localhost:3000 pnpm test:e2e`). Against the production server the sign-up rate limit refuses some of the many sign-ups the suite makes ("Too many requests"). CI runs it the same way (`.github/workflows/ci.yml`, job `e2e`); CI on GitHub has not run yet (no access).

After an intended change to a template, look at the new pages and approve them with `UPDATE_BASELINES=1 pnpm --filter @invoica/pdf test visual`.

**Reviews:** reviews 1 to 4 (`docs/reviews/`), each with a Resolution section mapping findings to fixes and tests.

**Local databases:** `invoica` (manual testing) and `invoica_demo` (seeded; the end-to-end tests also write into it). Both are migrated to 0008. Credit notes in them from before decision 0009 kept no ledger, so their invoices cannot be credited again (open question 13). Migrations that have run are never edited: changes go in a new one.

## Delivery method

The v2 repository is delivered as a **git bundle in a numbered zip** (`invoica-repo-NN.zip`), because Claude has no GitHub access yet. Each zip holds `invoica.bundle` (the full history), `VERIFY.md` and `verify.sh`.

To set up the first time:

```
unzip invoica-repo-05.zip -d ~/Downloads/invoica-repo-05
git clone ~/Downloads/invoica-repo-05/invoica.bundle invoica
cd invoica
sh ~/Downloads/invoica-repo-05/verify.sh
```

To take a later bundle into an existing clone: `git pull ~/Downloads/invoica-repo-NN/invoica.bundle main`.

The switch to pull requests (foundation section 7) is still blocked on GitHub access: "link your GitHub account to let Claude access repositories". When it is unblocked, Kobby creates a new empty GitHub repository for v2 and pushes this history to it.

## What changed last

Session of 18 to 19 October 2026 (Kobby away, full autonomy for the night): phases 1a to 2l built and checked. Most recently: review 4 and its fixes (migration 0008); dialogs that keep focus; not-found and error pages; approved-image tests for every template; the end-to-end suite in CI; VAT in sterling (spec and calculation, printing waits on wording); a reminders proposal. Round 2 templates are on the design canvas, page "Round 2, built".

## Next steps

1. Kobby's answers to the open questions, then templates round 3 from his comments on the canvas.
2. With approval: VAT in sterling printed on invoices (question 14), reminders (question 15), password reset (question 16).
3. When GitHub is linked: push the history, open pull requests from then on, and let CI run.

## Open questions for Kobby

The list is kept in `docs/BLUEPRINT.md`, "Open questions for Kobby" (18 items). New this session: 11 to 18.

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
| 0009 | Credit notes worked out slot by slot | Proposed, built |
