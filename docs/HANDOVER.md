# Handover

Read `docs/BLUEPRINT.md` first, then this file. Update both at the end of every session.

## Current state (19 October 2026, early morning)

This is the **v2 repository**: a re-architecture from scratch (decision 0001). The old Flask app lives in the old repository (`ser-arthur/invoica`) as a reference and receives no changes. Docs from the old repository's patches 01 to 04 were carried over into `docs/`.

**Working end to end, locally:** sign up, onboarding (country, currency, time zone, VAT registration with the UK or Ghana tax preset loaded), settings (business, tax, rounding, numbering, brand colour, template, bank and mobile money details, tax codes), clients, saved items, the invoice editor with live totals and a live preview, issuing with a gapless number and a frozen snapshot, the kept PDF, marking as sent, an email draft through the user's own mail app, recording and removing payments, credit notes, voiding, the invoice list with filters, client pages with what each owes, and a dashboard computed from records.

**Checks (last full run, 18 October 2026, about 23:55):**

| Suite | Count | Result |
| --- | --- | --- |
| Core unit and property tests | 118 | pass |
| Database tests (tenancy, immutability, numbering, payments, credit notes, outbox, dashboard, schema drift) | 29 | pass |
| Schemas | 4 | pass |
| Document view and rendering | 7 | pass |
| PDF (fonts embedded, page breaks, page numbers) | 2 | pass |
| Web unit | 2 | pass |
| End-to-end, desktop and phone (invoice flow, cross-business access, axe in light and dark, sideways scroll at 320 to 430px) | 10 | pass |
| Lint, typecheck, formatting, copy rules | | pass |

Not yet run: `pnpm build` (production build) in this session; CI on GitHub (no access yet).

## Delivery method

The v2 repository is delivered as a **git bundle in a numbered zip** (`invoica-repo-NN.zip`), because Claude has no GitHub access yet. Each zip holds `invoica.bundle` (the full history), `VERIFY.md` and `verify.sh`.

To set up the first time:

```
unzip invoica-repo-01.zip -d ~/Downloads/invoica-repo-01
git clone ~/Downloads/invoica-repo-01/invoica.bundle invoica
cd invoica
sh ~/Downloads/invoica-repo-01/verify.sh
```

To take a later bundle into an existing clone: `git pull ~/Downloads/invoica-repo-NN/invoica.bundle main`.

The switch to pull requests (foundation section 7) is still blocked on GitHub access: "link your GitHub account to let Claude access repositories". When it is unblocked, Kobby creates a new empty GitHub repository for v2 and pushes this history to it.

## What changed last

Session of 18 to 19 October 2026 (Kobby away, full autonomy for the night): phases 1a to 2d built and checked; PDF engine spike done (decision 0006, proposed, built); UK and Ghana tax research done (`docs/specs/tax-uk.md`, `docs/specs/tax-ghana.md`); tax rounding decision drafted (0007, proposed, built); first design critique applied (`docs/design/app-critique-1.md`).

## Next steps

See the phase table in `docs/BLUEPRINT.md`. Next in order: fixes from the independent money and tenancy review, logo upload, sending by email through the outbox, data export, then invoice templates round 2.

## Open questions for Kobby

1. Approve or change decisions 0003, 0006 and 0007.
2. Which invoice templates ship in v1 (round 2 to come).
3. Is `invoica.com` Invoica's domain (audit I-M11)? Demo data uses `example` domains.
4. Keep Claude's co-author lines on commits (they are on every commit so far)?
5. GitHub access for pull requests.
6. Email provider for sending invoices (Postmark, Resend or Amazon SES) and the hosting region (decision to come).
7. Ghana: whether service providers must register for VAT at any turnover (sources disagree; `docs/specs/tax-ghana.md`), and whether Invoica should pursue GRA E-VAT certification.

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
