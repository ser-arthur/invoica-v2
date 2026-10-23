# Invoica

A business tool for client management, invoicing, cash flow and dashboards, shipped as a product. Real people's money and client records depend on it.

## Commands

- Install: `pnpm install` (Node 22, pnpm 10)
- Local database, first time: `DATABASE_ADMIN_URL=postgres://postgres@localhost:5432/postgres pnpm --filter @invoica/db setup:dev` (creates the three roles and the `invoica` database, then migrates; prints the three connection URLs)
- Migrate: `pnpm db:migrate` (uses `DATABASE_OWNER_URL`)
- Seed demo data: `pnpm db:seed`
- Dev server: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Unit tests (core): `pnpm test:core`
- Database tests: `TEST_DATABASE_ADMIN_URL=postgres://postgres@localhost:5432/postgres pnpm test:db`
- End-to-end tests: `pnpm test:e2e`
- Everything CI runs: `pnpm check` (format, copy rules, lint, types, tests), then `pnpm build`

## Layout

- `packages/core`: money, currencies, quantities, tax, document totals, numbering, document states, business dates, receivables. Pure TypeScript, no dependencies, no I/O. Every figure anywhere in the product comes from here.
- `packages/schemas`: Zod schemas for every input, shared by forms, server actions and imports.
- `packages/db`: SQL migrations (`migrations/`, the source of truth), the Drizzle schema that mirrors them, row-level security, and the data functions the app calls (clients, items, documents, payments, dashboard).
- `packages/documents`: invoice templates, rendering a snapshot to HTML, and the PDF adapter.
- `apps/web`: the Next.js app.
- `docs/`: `BLUEPRINT.md` (plan and progress), `HANDOVER.md`, `decisions/`, `specs/`, `domain.md`, `audit.md`, `design/`.

## Every session

- Start by reading `docs/BLUEPRINT.md`, then `docs/HANDOVER.md`.
- End by updating both: state, what changed, the next step, open questions.
- A decision with lasting effect gets a record in `docs/decisions/NNNN-short-title.md` (context, decision, consequences).
- A feature starts from a spec in `docs/specs/` with acceptance criteria. Each criterion becomes a test.
- Domain words mean what `docs/domain.md` says they mean.

## Workflow

- Explore, then plan, then code. For anything bigger than a small fix, the plan is approved before code is written.
- Small changes, one concern per branch: `feat/...`, `fix/...`, `chore/...`.
- Commit messages: a short subject (72 characters at most) saying what changed, and a body of a few lines only when the reason is not obvious. No co-author or session lines, and no mention of the AI assistant in commits, pull requests or code comments.
- Every commit is authored and committed as the owner, Kobby S. Arthur <kobbyarthur95@gmail.com> (GitHub `ser-arthur`), whichever account the work runs under. Check `git config user.name` and `git config user.email` before the first commit of a session.
- Deliver the way `docs/HANDOVER.md` says. Never push to main, merge your own pull request or force-push.
- Tests first for any calculation, rule or state change. A new test must fail before the change that makes it pass.
- Before calling anything done, run the full CI command and report the counts: run, passed, failed, skipped. A check that examined nothing has failed.

## Money and records

- Amounts are integers in minor units with an ISO 4217 currency code. Quantities are thousandths. Tax rates are parts per million. No floats in any money path; ESLint refuses `parseFloat` and `Math.round`.
- All money arithmetic goes through `@invoica/core`, which owns the rounding rule.
- Issued invoices and credit notes never change: the database refuses it (`app.guard_document`). Each stores a snapshot and its PDF.
- Invoice numbers run in sequence per organisation with no gaps, assigned at issue inside a transaction (`number_counter`).
- A line stores the tax code it used.
- Instants in UTC. Business dates are `YYYY-MM-DD` calendar dates in the organisation's time zone.
- Dashboard figures are derived from records.

## Tenancy and security

- The app connects as `invoica_app`, which owns nothing and cannot bypass row-level security. Every query runs inside `withOrganisation(db, actor, fn)`; the actor's user id comes from the verified session.
- Background jobs are claimed and finished as `invoica_worker`, which can call only the two outbox functions and the two reminder scans; each job's work then runs as `invoica_app` inside the job's organisation.
- `packages/db/test/tenancy.test.ts` must pass.
- Authorisation is checked on the server for every request. Inputs are validated with `@invoica/schemas`.
- Never commit secrets. `.env.example` lists variable names only.
- No real customer data in dev, tests, fixtures or screenshots. Use the seed data.
- Never connect to production. Never edit a migration that has run anywhere: add a new one. The migration runner refuses changed files.

## Ask first

Destructive migrations, deleting data, changing auth or tenancy rules, adding a dependency that handles money, auth or personal data, and any legal or tax wording.

## Writing

UI text, docs and commit messages: British spelling, no em dashes, none of the banned constructions listed in the foundation, no emoji (`pnpm copy:check`). Comments describe what the code does now, never its history.
