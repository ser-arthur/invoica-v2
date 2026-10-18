# Invoica blueprint

The plan for building Invoica v2, and where the work stands. Updated at the end of every phase. A new chat starts here.

Last updated: 18 October 2026, night (session 1 of the build).

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
| 1b | `packages/core`: money, currencies, quantities, tax (components, compound, tax-inclusive), document totals, discounts, numbering, states, business dates, receivables | Done |
| 1c | `packages/db`: schema, migrations, row-level security, immutability triggers, audit log, outbox, cross-organisation test suite, schema drift test | Done |
| 1d | `apps/web`: shell, design tokens (light first, dark option), sign-up and sign-in, onboarding, organisation settings, taxes | Next |
| 2a | Clients and saved items | Planned |
| 2b | Invoice editor with live totals from the core, line styles, issue with gapless numbers and a snapshot | Planned |
| 2c | Rendering the snapshot, PDF of record, payments, credit notes, void, sending through the outbox | Planned |
| 2d | Dashboard from records, demo data for the three seed scenarios | Planned |
| 2e | Independent review of money and tenancy; end-to-end tests at phone and desktop widths; accessibility | Planned |
| 3 | Invoice templates round 2: bespoke and distinctive, built on the PDF engine decision | Planned |
| 4 | Getting paid: payment links, reminders | After v1 |
| 5 | Cash flow and dashboards beyond v1 | After v1 |

## Progress log

- **18 Oct 2026, 22:30 onwards.** Kobby handed over with full autonomy for about ten hours: scope into phases, build, check, continue. Background work started: a PDF engine spike (decision 0006 draft) and UK and Ghana tax research (`docs/specs/`). Phases 1a to 1c built and checked: 113 core tests (including property tests and the audit's worked examples W1 to W7, each mutation-checked), 13 database tests (tenancy suite and schema drift).

## Decisions in force

| Record | Title | Status |
| --- | --- | --- |
| 0001 | Rewrite strategy | Accepted |
| 0002 | Stack | Accepted |
| 0003 | Audience and v1 scope | Proposed |
| 0004 | Launch market and tax | Accepted |
| 0005 | Positioning and pricing | Accepted |
| 0006 | PDF engine | In progress (spike) |
| 0007 | Tax rounding | To draft after the UK research |

## Choices made during the build (reversible, flagged for Kobby)

- **Better Auth adopted** for sign-in, as named in 0002, under the autonomy Kobby gave for this session. Auth sits behind one module in the web app, so it can be swapped.
- **Tax model:** a tax code holds one or more components (name, rate in parts per million, compound or not). This covers no tax, UK VAT rates, Ghana's stacked levies, compound taxes and tax-inclusive prices with one rule.
- **Rounding:** the organisation chooses where tax is rounded (per document or per line) and how (half up, half even, down). The default stays "per document, half up" until decision 0007 settles it from HMRC's rules.
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

- The latest `invoica-repo-NN.zip` (repository bundle).
- Nothing else: everything else is in the repository or the project docs.
