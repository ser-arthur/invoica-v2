# Handover

Read `docs/BLUEPRINT.md` first, then this file. Update both at the end of every session.

## Current state (20 October 2026, about 07:30)

This is the **v2 repository**: a re-architecture from scratch (decision 0001). The old Flask app lives in the old repository (`ser-arthur/invoica`) as a reference and receives no changes.

**Working end to end, locally:** sign up with email confirmation, password reset, onboarding, settings (business, logo, tax, rounding choices allowed for the country, numbering, brand colour, template with live previews, bank and mobile money, tax codes with the country's standard codes on a button, reminders, the rate method for VAT in sterling), clients, saved items, the invoice editor with live totals and preview, issuing with a gapless number and a frozen snapshot, the kept PDF in seven templates, sending by email through the outbox (Resend in production, a development mailbox locally), payments, credit notes of every kind with refunds when they go above the balance, VAT in sterling on UK VAT invoices in other currencies, reminders on a schedule and on demand, voiding, duplicating, quick actions, client pages, a dashboard that names who to chase first, data export, the trial and free plan behind `INVOICA_PLANS=enforced` (off: everyone has everything, which is the free version), a health check and a container image.

**Checks (last full run, 20 October 2026, about 07:00, on `5bc7615`):**

| Suite | Count | Result |
| --- | --- | --- |
| Core (money, tax, totals, the credit ledger, refunds, VAT in sterling with its credit note ledger and tax point, reminders, dates and time zones, plans, property tests) | 236 | pass |
| Database (tenancy with exact policy and grant snapshots, immutability, numbering, payments, refunds, credit notes, review guards, reminders with an hourly scan across time zones, the worker role, journeys against a reference model, operations at the same moment, edge cases) | 205 | pass |
| Schemas | 5 | pass |
| Document view and rendering | 28 | pass |
| PDF | 64 | pass |
| Web unit (settings check, connection handling, sender names, sign-up names, sign-in emails, drain route, CSV, ids, paging, secrets) | 72 | pass |
| End to end, desktop and phone, against the production build run from a copy elsewhere with production settings | 112 | 77 passed, 35 skipped by design (one width only), 0 failed |
| Format, copy rules, lint, typecheck, production build | | pass |

610 unit and database tests run, 610 passed, 0 failed, 0 skipped. The journeys suite runs 40 random journeys by default; `JOURNEY_RUNS=1500` ran clean in about 24 minutes (before this round).

**Running the end-to-end suite.** Against the development server: `pnpm dev`, then `E2E_BASE_URL=http://localhost:3000 pnpm test:e2e`. Against a production build: `pnpm build`, start `apps/web/.next/standalone/apps/web/server.js` with `NODE_ENV=production`, `BETTER_AUTH_URL=http://localhost:3100`, `EMAIL_PROVIDER=file`, `MAILBOX_DIR`, `FILE_STORAGE_DIR`, `CRON_SECRET` and `INVOICA_CLIENT_IP_HEADER=x-forwarded-for` (the suite gives each sign-up its own address in that header, so the sign-up limit holds), then run the suite with `E2E_BASE_URL=http://localhost:3100` and the same `MAILBOX_DIR`. If the development server reloads a page over and over after a change to `next.config.ts`, stop it, delete `apps/web/.next/dev` and start it again. Editing files while the suite runs against the development server makes tests fail at random; run it against a production build to keep working meanwhile.

**Production readiness.** `docs/deploy.md` is the runbook for decision 0010: the domain and Cloudflare tunnel, the database roles, Resend, the server, a settings file per container, the first start, upgrades and backups. A production server checks its settings when it starts and stops with a list of what to fix. `/api/health` answers whether the database is reachable. The container image cannot be built here (Docker Hub is blocked); CI builds both images on every commit and runs the migration image against an empty database (job `image`), and runs the end-to-end suite against the production server as well as the development server (jobs `e2e-production` and `e2e`). CI on GitHub has not run yet (no access).

**Waiting for approval:**

- The branch `fix/confirm-then-sign-in` (review 8, R8-M2; review 9, R9-M4), rebased onto `main` this round: a confirmation link confirms the address and signs nobody in, and sign-in asks for the password. On the branch the sign-in, real-world and connection end-to-end tests pass (27 passed, 25 skipped by design) and the web unit tests pass (69). It changes an auth rule.
- A further step review 9 suggests, not built: someone who signs up with another person's address can still have the account confirmed by that person's click, and then use it. Asking for the account's password on the confirmation page (so a click by someone who does not know it confirms nothing), or letting the person who confirms choose the password there, would close that. Either changes sign-in, so it needs the owner's choice.

**Reviews:** reviews 1 to 9 (`docs/reviews/`), each with a Resolution section mapping findings to fixes and tests.

**Local databases:** `invoica` (manual testing), `invoica_demo` (seeded; the end-to-end tests against the development server also write into it) and `invoica_prodcheck` (for the production build's runs), all at migration 0023. Migrations that have run are never edited: changes go in a new one.

## Delivery method

The v2 repository is delivered as a **git bundle in a numbered zip** (`invoica-repo-NN.zip`) until GitHub is linked. Each zip holds `invoica.bundle` (the full history), `VERIFY.md` and `verify.sh`.

**The history was rewritten on 19 October 2026** (author, shorter messages), before any push. A clone made from bundle 08 or earlier cannot pull later bundles: make a new clone.

To set up the first time:

```
unzip invoica-repo-10.zip -d ~/Downloads/invoica-repo-10
git clone ~/Downloads/invoica-repo-10/invoica.bundle invoica
cd invoica
sh ~/Downloads/invoica-repo-10/verify.sh
```

To take a later bundle into an existing clone: `git pull ~/Downloads/invoica-repo-NN/invoica.bundle main`.

The switch to pull requests (foundation section 7) waits on GitHub: the owner connects GitHub in Settings, Connectors, and creates an empty private repository. The history is then pushed as a branch `start`, which the owner renames to `main` (the assistant never pushes to `main`). From then on every change arrives as a pull request.

## What changed last

Morning of 20 October 2026: review 9 and its fixes (migrations 0022 and 0023). A balance credit note checks the balance confirmed; the tax point is worked out in one place and a period takes both dates; the editor sends what each exchange rate was entered for; retried actions name the invoice number, and a page from before a new version says to reload; extra decimal places are refused again and amounts are retyped on a currency change; sign-in emails greet only confirmed accounts by name; server settings files are kept out of git and images, and the guide covers database certificates; reminders are chosen with the app's own business date; the database refuses money dated well after today; CI runs the end-to-end suite against the production server.

Night of 19 to 20 October 2026: testing as the business will use it (journeys against a model, operations at the same moment, edge cases, a dropped connection, two tabs and stale dialogs), with the faults it found fixed; production readiness (health check, start-up settings check, container image, deploy runbook); review 8 and its fixes (migrations 0016 to 0019). The owner chose a free version before billing.

Session 2, 19 October 2026, afternoon: phases 2q to 2w (Resend, email verification and password reset, the worker role, credit note wording and tax defaults, refunds, VAT in sterling, reminders).

## Next steps

1. Approval of `fix/confirm-then-sign-in`, then merge it; and the owner's choice on asking for the password when an address is confirmed (above).
2. When the owner has the domain and approves decision 0010: follow `docs/deploy.md`.
3. When GitHub is linked: push the history as `start`, then pull requests with CI (which also builds the container image).
4. Billing (2x) once the free version has been used and a provider is chosen; then plan limits in the database and the deferred number counter check (2y).
5. Templates round 2 review (phase 3).

## Open questions

The list is kept in `docs/BLUEPRINT.md`, "Open questions" (8 items).

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
| 0008 | Email provider | Accepted: Resend |
| 0009 | Credit notes worked out slot by slot | Proposed, built |
| 0010 | Hosting | Proposed |
