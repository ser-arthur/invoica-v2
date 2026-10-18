# Invoica blueprint

The plan for building Invoica v2, and where the work stands. Updated at the end of every phase. A new chat starts here.

Last updated: 19 October 2026, about midnight (session 1 of the build).

---

## How to pick this up in a new chat

1. In the claude.ai project "Invoica", start a new chat.
2. Attach the latest repository bundle (`invoica-repo-NN.zip`, from the last session's final message). It holds a git bundle of the whole repository with its history.
3. Say: "Continue the Invoica build from the blueprint." Claude unpacks the bundle (`git clone invoica.bundle invoica`), reads this file, then `docs/HANDOVER.md`, then `CLAUDE.md`.
4. The project docs (`invoica-foundation.md`, `claude/invoica-product-directions.md`, `claude/invoica-blueprint.md`) carry the standards and the thinking; the repository carries everything the code depends on. If the two disagree, the repository wins.

## What we are building

Invoica v2: a re-architecture from scratch (decision 0001) that keeps the old app's intent. v1 leads with "look established from day one": correct invoices that look exactly as intended on screen, on paper and as a PDF, however long they are (0003, 0005). Then getting paid on time, then easy tracking of invoices, clients and money.

**Style direction for the app (Kobby, 18 October 2026):** build on the old app's look, sleeker and more modern. **Light mode first, with a dark mode option.** The old app's DNA kept: the "invoiça." wordmark with its cedilla and full stop, the emerald accent (hue about 145), top navigation on desktop, a bottom tab bar with a central "new" button on phones, status pills, figures up front on the dashboard. Visual work goes through the design skills available to Claude (frontend design, design system, design critique, accessibility review) before it is called done.

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
| 2e | Independent money and tenancy review, and its fixes; logo upload; duplicate an invoice; quick actions in lists | In progress |
| 2f | Sending by email through the outbox (adapter, dev mailbox, provider to choose), marking sent on delivery | Planned |
| 2g | Data export (CSV and JSON), account and organisation settings, retention placeholders | Planned |
| 3 | Invoice templates round 2: bespoke and distinctive; template gallery with live previews; landing page showing a real invoice | Planned |
| 4 | Getting paid: payment links, reminders | After v1 |
| 5 | Cash flow and dashboards beyond v1 | After v1 |

## How to run it locally

1. Postgres 16 running locally. `DATABASE_ADMIN_URL=postgres://postgres@localhost:5432/postgres pnpm --filter @invoica/db setup:dev` creates the roles and the `invoica` database and migrates it.
2. `apps/web/.env.local` with `DATABASE_URL`, `DATABASE_OWNER_URL`, `BETTER_AUTH_SECRET` (any 32+ random characters), `BETTER_AUTH_URL=http://localhost:3000`, and `CHROMIUM_PATH` if Playwright's Chromium is not installed (`pnpm --filter @invoica/pdf exec playwright-core install chromium`).
3. `pnpm db:seed` loads three demo businesses; sign in as `demo@invoica.example`, `agency@invoica.example` or `ghana@invoica.example` with the password the script prints.
4. `pnpm dev`, then open http://localhost:3000.

## Progress log

- **18 Oct 2026, 22:30 onwards.** Kobby handed over with full autonomy for about ten hours: scope into phases, build, check, continue. Background work started: a PDF engine spike (decision 0006 draft) and UK and Ghana tax research (`docs/specs/`). Phases 1a to 1c built and checked: 113 core tests (including property tests and the audit's worked examples W1 to W7, each mutation-checked), 13 database tests (tenancy suite and schema drift).
- **18 Oct, 23:00 to midnight.** Phases 1d to 2d built: the web app end to end. Tax research landed: Ghana's 2026 structure (VAT 15%, NHIL 2.5%, GETFund 2.5%, none compound, 20% in all) and HMRC's rounding rules, giving decision 0007. The PDF spike landed: Chromium with CSS margin boxes passed 91 of 91 checks, giving decision 0006; the footer now uses the document's own font. End-to-end tests pass at desktop and phone widths with zero axe violations. First design critique applied. Repository bundle 01 delivered.

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

## Choices made during the build (reversible, flagged for Kobby)

- **Better Auth adopted** for sign-in, as named in 0002, under the autonomy Kobby gave for this session. Auth sits behind one module in the web app, so it can be swapped.
- **Tax model:** a tax code holds one or more components (name, rate in parts per million, compound or not). This covers no tax, UK VAT rates, Ghana's stacked levies, compound taxes and tax-inclusive prices with one rule.
- **Rounding:** decision 0007. UK businesses default to VAT per line, to the nearest penny; Ghana to each tax on the invoice total; others per line. UK businesses that are not retailers may choose "on the total, rounded down".
- **PDF engine:** decision 0006. The PDF of record is made with the pinned Chromium; footers and page numbers are CSS margin boxes in the document's own font; the first PDF made for an issued document is kept and never replaced.
- **Templates in the app:** Signature (Invoica's own), Studio and Counsel, rebuilt from the round-1 ideas on one view model. Round 2 (bespoke) is still to come.
- **Sending:** until an email provider is chosen, "Email" opens the user's own mail app with the text filled in, and the user marks the invoice as sent.
- **Known gaps:** UK VAT invoices in a foreign currency must show the VAT in sterling; Invoica does not yet capture an exchange rate, so this case is not handled. Fonts embed as Type 3 in PDFs (Chromium's handling of variable fonts); static font files would embed as TrueType.
- **Discounts** are named, per document, percentage or amount, applied before tax and shared across lines in proportion.
- **Deposits** taken before an invoice are entered on the draft and become payments when it is issued, so the invoice shows the balance due.
- **Credit notes** have their own number sequence (CN-0001) and reduce the balance of the invoice they credit.
- **Outstanding** has one definition (issued or sent, balance above zero), and amounts in different currencies are never added together.

## Open questions for Kobby

1. Which invoice templates ship in v1 (round 2 to come).
2. Approve or change 0003.
3. Is `invoica.com` Invoica's domain (audit I-M11)?
4. Commit attribution lines: this build adds Claude's co-author lines; keep or drop.
5. GitHub access for pull requests: "link your GitHub account to let Claude access repositories".

## Files a new chat needs

- The latest `invoica-repo-NN.zip` (repository bundle). Latest: `invoica-repo-01.zip`.
- Nothing else: everything else is in the repository or the project docs.
