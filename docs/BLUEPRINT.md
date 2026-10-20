# Invoica blueprint

The plan for building Invoica v2, and where the work stands. Updated at the end of every phase. A new chat starts here.

Last updated: 20 October 2026, about 05:00 (session 2 of the build, through the night).

---

## How to pick this up in a new chat

1. In the project "Invoica", start a new chat.
2. Attach the latest repository bundle (`invoica-repo-NN.zip`, from the last session's final message). It holds a git bundle of the whole repository with its history.
3. Say: "Continue the Invoica build from the blueprint." The session unpacks the bundle (`git clone invoica.bundle invoica`), reads this file, then `docs/HANDOVER.md`, then `CLAUDE.md`.
4. The project docs (`invoica-foundation.md`, `claude/invoica-product-directions.md`, `claude/invoica-blueprint.md`) carry the standards and the thinking; the repository carries everything the code depends on. If the two disagree, the repository wins.

## What we are building

Invoica v2: a re-architecture from scratch (decision 0001) that keeps the old app's intent. v1 leads with "look established from day one": correct invoices that look exactly as intended on screen, on paper and as a PDF, however long they are (0003, 0005). Then getting paid on time, then easy tracking of invoices, clients and money.

**Style direction for the app (Kobby, 18 October 2026):** build on the old app's look, sleeker and more modern. **Light mode first, with a dark mode option.** The old app's DNA kept: the "invoiça." wordmark with its cedilla and full stop, the emerald accent (hue about 145), top navigation on desktop, a bottom tab bar with a central "new" button on phones, status pills, figures up front on the dashboard. Visual work goes through the design skills (frontend design, design system, design critique, accessibility review) before it is called done.

**Invoice templates:** round 1 (six mocks) was judged too old-school. Kobby wants templates that feel bespoke, different and unique. To iterate later (phase 3).

## Stack in force

TypeScript throughout (0002). pnpm workspaces. Next.js 16 (App Router) with React 19. PostgreSQL 16 with row-level security; Drizzle for typed queries; migrations are plain SQL run by our own runner, which refuses edited migrations. Zod 4 for inputs. Better Auth for sign-in. Vitest and fast-check for tests; Playwright for end-to-end and PDF; axe-core for accessibility. Tailwind CSS 4 with design tokens as CSS variables. Pinned versions live in each `package.json`.

## Phases

Each phase ends with its checks run and counted, a commit, and this file updated.

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Audit and decisions | Done (old repository, patches 01 to 04) |
| 1a | Repository, tooling, CI workflow, copy checker, `CLAUDE.md` | Done |
| 1b | `packages/core`: money, currencies, quantities, tax (components, compound, tax-inclusive, reverse charge), document totals, discounts, numbering, states, business dates, receivables, snapshot assembly, UK and Ghana presets | Done |
| 1c | `packages/db`: schema, migrations, row-level security, immutability triggers, audit log, outbox, cross-organisation suite, schema drift test, data functions | Done |
| 1d | `apps/web`: shell, design tokens (light first, dark option), sign-up and sign-in, onboarding, settings, tax codes | Done |
| 2a | Clients and saved items | Done |
| 2b | Invoice editor with live totals and live preview, line styles, issue with gapless numbers and a snapshot | Done |
| 2c | Templates (Signature, Studio, Counsel), PDF of record, payments, credit notes, void, background jobs | Done (sending by email: mail-app draft only) |
| 2d | Dashboard from records, demo data for three businesses | Done |
| 2e | Independent money and tenancy review (review 1) and all 17 fixes; logo upload; duplicate an invoice | Done |
| 2f | Sending by email through the outbox: adapter, development mailbox, marking sent on delivery | Done for development; the production provider waits on decision 0008 |
| 2g | Data export: everything as JSON; invoices, payments and clients as CSV | Done |
| 2h | Review 2 of the review-1 fixes and its fixes (credit notes rebuilt as a ledger by tax group, migration 0006); design polish: quick actions on invoice rows, the owed figure says who to chase first, folded lines in the editor on phones, empty states, dark mode pass, keyboard check; the hard document pack (decision 0003) on every template | Done |
| 2i | The 30-day trial and the free plan behind a feature flag (decision 0005): three active clients, the Signature template, the "Made with Invoica" mark (`docs/specs/plans.md`, `INVOICA_PLANS=enforced`) | Done; off unless the flag is set |
| 2j | Review 3 of the credit ledger and its fixes: credit notes worked out slot by slot from what the invoice kept (decision 0009), "Everything still owed", migration 0007 | Done |
| 2k | Robustness and checks: dialogs keep focus, not-found and error pages, the credit notes list shows what each credits, approved-image tests for every template, the end-to-end suite in CI, axe with dialogs open; VAT in sterling (spec and calculation; printing waits on wording); reminders proposal (`docs/specs/reminders.md`) | Done |
| 2l | Review 4 of the slot ledger and the plans, and its fixes: "everything still owed" settles every balance, bases are the net taken, numbering cannot repeat, archived clients can be invoiced, migration 0008 | Done |
| 2m | Review 5 of the review 4 fixes, and its fixes (migration 0010); performance at 2,000 invoices (migration 0009, paged invoice list) | Done |
| 2n | Review 6, a security review of the web layer: a content security policy with nonces, archive checks, the drain secret; the sign-in fixes on the branch `fix/auth-hardening`, waiting for approval | Done on `main`; branch waiting |
| 2o | Review 7 of the latest fixes, and its fixes (migration 0011): taxes above a price refused, the amount hint's search, criteria narrowed to what holds | Done |
| 2p | Answers of 19 October recorded; commit history cleaned (author, short messages, no assistant lines); sign-in fixes merged; demo data wiped and reseeded | Done |
| 2q | Sending through Resend (decision 0008), behind the email adapter | Done |
| 2r | Password reset and email verification; sign-up no longer reveals an existing account | Done; confirming without signing in waits on the branch `fix/confirm-then-sign-in` |
| 2s | The outbox worker's own database role (migration 0012) | Done |
| 2t | Approved credit note wording; tax-only notes allowed; prices exclude tax by default; a button that adds a country's standard tax codes | Done |
| 2u | Refunds: crediting a paid invoice records the money returned (migration 0013) | Done |
| 2v | VAT in sterling printed, HMRC period rate by default (migration 0014) | Done |
| 2w | Reminders (`docs/specs/reminders.md`), with the narrow database function and the default wording (migration 0015) | Done |
| 2z | Testing as the business will use it: journeys against a reference model, operations at the same moment, edge cases (currencies, time zones, clock changes, month ends, large figures), a dropped connection, two tabs, stale dialogs; production readiness (health check, start-up settings check, container image, deploy runbook); review 8 and its fixes (migrations 0016 to 0019) | Done |
| 2x | Billing for the plans, then the plans turned on | Waits for the billing provider; the free version comes first (owner, 20 October) |
| 2y | Plan limits enforced by the database; the deferred number counter check (review 7, R7-L1) | After 2x |
| 3 | Invoice templates round 2: four new templates (Ledger, Poster, Letter, Ticket) beside Signature, Studio and Counsel; template picker with live previews of your own details; landing page built around real invoices | Built; waiting for Kobby's review on the design canvas |
| 4 | Getting paid: payment links | After v1 |
| 5 | Cash flow and dashboards beyond v1 | After v1 |

## How to run it locally

1. Postgres 16 running locally. `DATABASE_ADMIN_URL=postgres://postgres@localhost:5432/postgres pnpm --filter @invoica/db setup:dev` creates the roles and the `invoica` database and migrates it.
2. `apps/web/.env.local` with `DATABASE_URL`, `DATABASE_OWNER_URL`, `BETTER_AUTH_SECRET` (any 32+ random characters), `BETTER_AUTH_URL=http://localhost:3000`, and `CHROMIUM_PATH` if Playwright's Chromium is not installed (`pnpm --filter @invoica/pdf exec playwright-core install chromium`).
3. `pnpm db:seed` loads three demo businesses; sign in as `demo@invoica.example`, `agency@invoica.example` or `ghana@invoica.example` with the password the script prints.
4. `pnpm dev`, then open http://localhost:3000.

## Progress log

- **18 Oct 2026, 22:30 onwards.** Kobby handed over with full autonomy for about ten hours: scope into phases, build, check, continue. Background work started: a PDF engine spike (decision 0006 draft) and UK and Ghana tax research (`docs/specs/`). Phases 1a to 1c built and checked: 113 core tests (including property tests and the audit's worked examples W1 to W7, each mutation-checked), 13 database tests (tenancy suite and schema drift).
- **18 Oct, 23:00 to midnight.** Phases 1d to 2d built: the web app end to end. Tax research landed: Ghana's 2026 structure (VAT 15%, NHIL 2.5%, GETFund 2.5%, none compound, 20% in all) and HMRC's rounding rules, giving decision 0007. The PDF spike landed: Chromium with CSS margin boxes passed 91 of 91 checks, giving decision 0006; the footer now uses the document's own font. End-to-end tests pass at desktop and phone widths with zero axe violations. First design critique applied. Repository bundle 01 delivered.
- **19 Oct, midnight to 01:15.** Email sending through the outbox (development mailbox), logo upload, duplicate, data export (JSON and CSV), a landing page built around real invoices, and a template picker that previews your own details. Templates round 2: Ledger, Poster, Letter and Ticket, each fitting an ordinary invoice on one page. Independent review 1 (`docs/reviews/review-1.md`): no tenancy holes; 3 high, 6 medium and 8 low findings, all fixed with tests written first (credit notes rebuilt from the invoice as issued, repeat-request fingerprints, migration 0005 guards, rounding fixes in core). Checks: core 150, schemas 4, documents 8, PDF 15, database 51, web unit 5, end to end 14 (desktop and phone, accessibility included); all passed. A second independent review of the fixes started. Round 2 templates added to the design canvas. Repository bundle 02 delivered.
- **19 Oct, 01:15 to 02:15.** Review 2 (`docs/reviews/review-2.md`) checked the review-1 fixes: the cases review 1 described were fixed, but mixing line and amount credits, amount credits in parts, and line credits under "rounded down" did not add up row by row (1 high, 3 medium, 5 low). Credit notes were rebuilt as a ledger by tax group (`docs/specs/credit-notes.md`), with a property test over random mixes of credits; migration 0006 adds the database checks. Design polish: quick actions on invoice rows, the owed figure names who to chase first, folded editor lines on phones, empty states, client rows that fit narrow phones, dialogs above the tab bar, a VOID mark on screen. The hard document pack (long names, unbroken references, a description longer than a page, 120 lines, every currency) runs on every template and found references that pushed four templates past the page edge; fixed. Decision 0008 filled with checked provider facts and a recommendation. Checks: core 152, database 59, documents 10, PDF 50, schemas 4, web unit 5, end to end 19 passed with 3 skipped by design. Repository bundle 03 delivered.

- **19 Oct, 02:15 to 03:30.** Phase 2i: the trial and the free plan behind `INVOICA_PLANS=enforced` (`docs/specs/plans.md`), off by default; the editor's line fields fit their row. Review 3 (`docs/reviews/review-3.md`) of the credit ledger: it met its spec in every random run (no critical or high findings), with 1 medium and 6 low. After a part payment, an invoice priced excluding VAT could be left with a penny no credit could clear; a whole line under VAT per line credited a share of its group's rounding; crediting depended on working old figures out again. Credit notes are now worked out slot by slot from what the invoice kept at issue (decision 0009), with "Everything still owed" crediting the balance exactly and the amount hint giving the most the balance allows. Migration 0007 guards a document's kind, its printed number and the tax of unlinked credit lines. The dashboard shows invoiced and credited beside the net figure. Tests first, all failing before the change. Checks: core 168, database 71, documents 11, PDF 50, schemas 4, web unit 5, end to end 21 passed with 3 skipped by design. Repository bundle 04 delivered.

- **19 Oct, 03:30 onwards.** Review 4 (an independent review of the slot ledger and the plans) started. Meanwhile: one dialog for every modal that keeps focus inside and returns it; not-found and error pages in Invoica's own words; the credit preview reads like the document; dashboard figures line up; the credit notes list shows what each credits; every template compared with approved images (`packages/pdf/test/visual.test.ts`, `UPDATE_BASELINES=1` to approve a change); the end-to-end suite added to CI; VAT in sterling for invoices in another currency, spec (`docs/specs/vat-in-sterling.md`) and core calculation, with the printed wording waiting on Kobby; a reminders proposal.

- **19 Oct, about 03:45 to 04:30.** Review 4 (`docs/reviews/review-4.md`): no critical or high findings; 1 medium and 7 low. Under Ghana's defaults a last pesewa could not be credited; after a settling note, removing its payment could leave a penny; long amount-credit descriptions were cut; a prefix change could repeat a number; the database did not check a credit note's figures; archived clients could not be invoiced from the editor on the free plan. All fixed with tests first except plan limits in the database (a tenancy question for Kobby). Checks: core 179, database 79, documents 11, PDF 64, schemas 4, web unit 5, end to end 29 passed with 3 skipped by design. Repository bundle 05 delivered.

- **19 Oct, 04:30 onwards.** Review 5 of the review 4 fixes started. Performance measured on a business with 2,000 invoices of six lines each, half part paid and a tenth with a credit note: the invoice list's query took 260 ms and the dashboard's 285 ms; lists now read only summary columns and work out payments and credits in the same query (65 ms and 100 ms), credit notes are indexed by the invoice they credit (migration 0009), and the invoice list shows fifty at a time. A full export of that business is 22 MB and takes half a second.

- **19 Oct, about 05:00 to 05:45.** Review 5 (`docs/reviews/review-5.md`): no critical, high or medium findings; 6 low. A pesewa of levy could stick after a settling note, a reversed payment and a part payment again; migration 0008 could still be passed by direct SQL; the numbering check read before it locked; the two series could share a prefix; totals past the safe range were stored a penny out. All fixed with tests first (migration 0010). Checks: core 184, database 86, documents 11, PDF 64, schemas 4, web unit 8, end to end 29 passed with 3 skipped by design. Repository bundle 06 delivered.

- **19 Oct, about 05:45 to 06:40.** Review 6 (`docs/reviews/review-6.md`), a security review of the web layer run over HTTP against a production build: tenancy sound (no record of one business reachable by another or by anyone signed out), output escaping sound; 1 medium and 5 low findings. The sign-in limit could be reset with a forged `X-Forwarded-For`; there was no content security policy; archiving another business's item reported success; the drain route could answer 500. Fixed on `main` except the sign-in findings, which change auth and wait for approval on `fix/auth-hardening`. Checks: core 184, database 89, documents 11, PDF 64, schemas 4, web unit 10, end to end 31 passed with 3 skipped by design. Repository bundle 07 delivered, with the branch.

- **19 Oct, about 06:45 to 07:45.** Review 7 (`docs/reviews/review-7.md`) of everything since review 5: no critical, high or medium findings; 5 low. On UK and Ghana codes no note for everything still owed was refused in any run; the lists match the invoice page in every state, and no figure from another business reached a list. Fixed: taxes rounded above a price including them are refused, so no invoice has a net below zero; the amount hint searches further; credit note tax rows keep the invoice's charged or shown status (migration 0011); criteria 10 and 16 narrowed to the codes they hold for. Two direct-SQL gaps in the database guards are recorded as the next step. The dashboard's net figure is labelled "Net invoiced this month". Repository bundle 08 delivered.

- **19 Oct, about 13:25 to 13:50 (session 2).** The owner answered the open questions (see "Answered on 19 October 2026"). The commit history was rewritten before its first push: the owner as author, short messages, no assistant lines; the review documents point at the new commit ids. The sign-in fixes were merged. The local databases were dropped, recreated at migration 0011 and reseeded. Decision 0008 accepted (Resend); decision 0010 (hosting) proposed.

- **19 Oct, about 13:50 to 15:10 (session 2).** Phases 2q to 2w built with tests first: Resend behind the email adapter; email verification and password reset, with sign-up answering alike for new and existing addresses; the worker's own database role; the approved credit note wording; refunds; VAT in sterling printed with HMRC's period rate by default; reminders with the narrow scan function and the approved wording.

- **20 Oct, about 01:50 to 05:00.** The owner asked for testing as the business will really use it. Added: journeys against a reference model (1,500 random runs of issuing, paying, removing, crediting with refunds, voiding, sending, pausing, scanning and settings changes, every figure checked after every step and every refused step leaving nothing changed), operations at the same moment (refunds against removals, two credits, repeats, two scans), edge cases (yen and dinars, very large figures, drafts changed after a rate, Auckland, London and Los Angeles clock changes, month ends, leap days, missed days, unicode names), property tests of refunds, sterling and reminders, and end-to-end journeys (a draft kept across a reload and a new sign-in, two tabs issuing one draft, a stale tab overpaying, double clicks, the back button, a reset on another device, a dropped connection and a lost answer). These found and fixed: payments, deposits and refunds dated after today; a dropped connection replacing the page and losing what was typed; links told apart by colour alone; "Draft saved." often not showing; prices with extra zeros unreadable in yen. Production readiness: `/api/health`, a start-up settings check, a container image, `deploy/compose.yaml` and `docs/deploy.md`; the standalone build was run from a copy elsewhere with production settings and passed the whole end-to-end suite. Review 8 (`docs/reviews/review-8.md`): 3 medium and 5 low findings, all fixed with tests first (migrations 0016 to 0019), except confirming an email without signing in, which changes an auth rule and waits on `fix/confirm-then-sign-in`. The owner chose a free version before billing.

## Decisions in force

| Record | Title | Status |
| --- | --- | --- |
| 0001 | Rewrite strategy | Accepted |
| 0002 | Stack | Accepted |
| 0003 | Audience and v1 scope | Proposed |
| 0004 | Launch market and tax | Accepted |
| 0005 | Positioning and pricing | Accepted |
| 0006 | PDF engine | Proposed; built (Chromium, CSS margin boxes) |
| 0007 | Tax rounding | Proposed; built (UK per line, nearest penny; Ghana per document) |
| 0008 | Email provider | Accepted: Resend |
| 0009 | Credit notes worked out slot by slot | Proposed; built |
| 0010 | Hosting | Proposed: Cloudflare in front, one small server, managed Postgres |

## Choices made during the build (reversible, flagged for Kobby)

- **Better Auth adopted** for sign-in, as named in 0002, under the autonomy Kobby gave for this session. Auth sits behind one module in the web app, so it can be swapped.
- **Tax model:** a tax code holds one or more components (name, rate in parts per million, compound or not). This covers no tax, UK VAT rates, Ghana's stacked levies, compound taxes and tax-inclusive prices with one rule.
- **Rounding:** decision 0007. UK businesses default to VAT per line, to the nearest penny; Ghana to each tax on the invoice total; others per line. UK businesses that are not retailers may choose "on the total, rounded down".
- **PDF engine:** decision 0006. The PDF of record is made with the pinned Chromium; footers and page numbers are CSS margin boxes in the document's own font; the first PDF made for an issued document is kept and never replaced.
- **Templates in the app:** seven on one view model: Signature (Invoica's own), Studio, Counsel, Ledger, Poster, Letter and Ticket. Every one renders the same snapshot, embeds its fonts, repeats its table heading on long invoices and fits an ordinary invoice on one page (tests).
- **Sending:** "Send" queues the email with the kept PDF through the outbox; it is marked as sent once delivered. In development the email is written to `.data/mail`; deployed copies send through Resend (decision 0008).
- **Known gaps:** fonts embed as Type 3 in PDFs (Chromium's handling of variable fonts); static font files would embed as TrueType. Large objects can still be created by any database role (the functions belong to the database's superuser).
- **VAT in sterling wording:** "VAT in sterling £X" with "£1 = 1.1500 EUR, HMRC period rate for October 2026" was chosen under the owner's "pick the best way"; it is statutory wording, so it is listed below for a final look.
- **A dropped connection:** every call from the browser to the server answers a message when it fails on the way, and the page keeps what was typed. Payments, credit notes, emails, reminders and new drafts carry a request key, so trying again records them once.
- **Discounts** are named, per document, percentage or amount, applied before tax and shared across lines in proportion.
- **Deposits** taken before an invoice are entered on the draft and become payments when it is issued, so the invoice shows the balance due.
- **Credit notes** have their own number sequence (CN-0001) and reduce the balance of the invoice they credit. They credit the whole invoice (only while nothing is paid or credited), quantities of its lines, an amount in the invoice's price basis, or everything still owed, to the penny. Price and tax always come from the invoice as issued, slot by slot (decision 0009, `docs/specs/credit-notes.md`): a whole line under VAT per line credits the VAT it was charged, and credits in any order and mix add up to the invoice row by row. Invoices keep their slots at issue and credit notes keep what they took; an invoice whose records came from an earlier version and cannot be read with certainty cannot be credited, and says so. A credit note cannot be voided; an invoice with credit notes cannot be voided. A line credited in parts can show an amount a penny away from its own quantity times price, so the parts add up exactly.
- **States:** "Paid" means money received. An invoice closed by credit notes alone is "Credited"; by payments and credit notes together, "Settled". A partial credit with nothing paid leaves the invoice "Issued" or "Sent".
- **Not registered for tax:** such a business cannot issue an invoice whose lines carry a tax rate, zero-rated included (GOV.UK: no VAT on invoices before registration). Confirmed on 19 October.
- **Repeated requests:** payments, credit notes, sends and the first save of a new invoice carry a key made when the dialog opens; the server stores a fingerprint of the request with it, returns the earlier result for a true repeat and refuses a reused key with a different request.
- **Commits:** made on a local `main` and delivered as bundles. Once GitHub is linked, work moves to branches and pull requests. Messages are short, with no co-author or session lines (`CLAUDE.md`, Workflow).
- **Numbering:** invoice and credit note prefixes must differ by more than digits, and a change that would repeat a used number is refused.
- **Outstanding** has one definition (issued or sent, balance above zero), and amounts in different currencies are never added together.

## Answered on 19 October 2026

1. Hosting: Cloudflare, or a better alternative. Proposed in decision 0010; waiting for a yes.
2. Email: Resend for what the product sends; Zoho Mail keeps the company mailbox (decision 0008).
3. GitHub: to be linked through the GitHub connector in Settings; the owner creates an empty repository. The first copy of `main` is pushed as a branch and renamed by the owner.
4. Domain: `invoicer.io` has lapsed; another domain will be bought (the `.com` is taken).
5. Commits and code comments never mention the AI assistant, and messages stay short. The history was rewritten before any push to match.
6. Sign-in fixes (`fix/auth-hardening`): merged.
7. Password reset and email verification: build them.
8. The outbox worker's own database role: build it.
9. Plan limits in the database: later, once billing is built.
10. Reminders: build them with the narrow database function; the default wording is approved.
11. Free plan: billing is built first. Changed on 20 October: a free version comes first, with every feature on for everyone, and billing once a provider is chosen.
12. Crediting a paid invoice: a refund record (no client credit balance).
13. Zero-rated lines for businesses not registered for tax: stay refused.
14. Tax defaults: prices exclude tax by default in every country; a country's standard tax codes are added by default and from a button, and stay editable.
15. Templates: any for now; architecture, everything working and every test passing come first.
16. Credit note wording approved: "Total before VAT" on every credit note; "Reverse charge: customer to account for the output tax adjustment of £X to HMRC"; "Total before taxes" in Ghana; "Zero-rated reduction". Tax-only credit notes are allowed. VAT in sterling uses the HMRC period rate by default, with the method recorded on each invoice.
17. Demo data: wiped and reseeded.

## Open questions

1. Hosting: approve decision 0010 (`docs/deploy.md` is the runbook for it).
2. Merge `fix/confirm-then-sign-in`? Opening a confirmation link would confirm the address and sign nobody in; sign-in then asks for the password. It changes an auth rule (review 8, R8-M2), so it waits for a yes.
3. Billing provider, when the free version has been used: Paddle as merchant of record (recommended; about 5% + 50p a sale, no monthly fee, it handles VAT on your sales), or Stripe (1.5% + 20p a UK card plus 0.7% for subscriptions, no monthly fee); Paystack later for mobile money in Ghana.
4. The domain to buy, then the sending subdomain for Resend.
5. The GitHub repository's owner and name, and the email address to author commits with (GitHub's private noreply address, if preferred).
6. Which invoice templates ship in v1. All seven are on the design canvas, page "Round 2, built".
7. Approve or change 0003, 0006 and 0007.
8. The printed VAT in sterling wording, chosen under "pick the best way" (see "Choices made during the build").

## Files a new chat needs

- The latest `invoica-repo-NN.zip` (repository bundle). Latest: `invoica-repo-09.zip`. The history was rewritten on 19 October: clones from bundle 08 or earlier need a new clone.
- Nothing else: everything else is in the repository or the project docs.
