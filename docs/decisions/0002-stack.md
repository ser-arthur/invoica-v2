# 0002. Stack

- **Status:** Accepted, 18 October 2026 (Kobby): TypeScript throughout. The tools named in the table are confirmed one by one as each is adopted.
- **Depends on:** `0001-rewrite-strategy.md` and `0003-audience-and-v1-scope.md`. The hosting region and payment provider wait on the launch market (foundation section 1) and the hosting decision (foundation section 3, item 5).
- **Evidence:** `docs/audit.md`, sections 2 to 4.

Versions, prices and maintenance status of every tool named here must be checked against its own current documentation when this is approved. Nothing below pins a version.

## Context

The foundation's criteria: typed end to end; a relational database with transactions and constraints (Postgres unless the audit gives a reason otherwise); mature authentication; background jobs with retries; PDF generation and transactional email; a payments provider that keeps card data off Invoica's servers; hosting with a choice of region.

The audit adds four requirements that weigh heavily:

1. **One rule, one place, including in the browser.** The invoice editor shows live totals while the user types. Today that is a second copy of the money rules in JavaScript, and it disagrees with the server (I-H2: £13.13 on screen, £13.12 on the invoice). The new stack has to let the editor and the server run the same core code, or have the server compute every figure the editor shows.
2. **Tenancy enforced in the database.** Row-level security in Postgres, with the organisation set per transaction (foundation section 4). The database layer must not get in its way.
3. **Documents of record.** PDFs generated from a stored snapshot and kept (I-M6), so PDF generation should not depend on loading live pages.
4. **The people building it.** Kobby is self-taught, strongest in Python and data work, and has written the current Alpine.js front end. An AI coding assistant does the bulk of the building. A mainstream stack with a large ecosystem suits both.

Postgres stays: nothing in the audit argues against it, and it gives transactions, constraints, row-level security and exact `bigint` arithmetic.

## Options considered

**A. TypeScript throughout.** A React framework for the web app, a framework-free TypeScript core package, Postgres through a typed SQL-first layer.
- Meets requirement 1 directly: the same `core` package runs in the editor and on the server, so the live total and the saved total are one computation.
- Typed end to end with no code-generation step: database rows, validation schemas, server actions and components share types.
- The largest ecosystem for auth libraries, PDF, email and payment SDKs. Vercel previews per pull request keep working.
- Cost: Kobby learns TypeScript, React and the framework's server model. Next.js in particular has real complexity (server components, caching rules). No built-in admin screens.

**B. Python with Django, and HTMX for interactivity.** Django, Postgres, django-allauth (which has multi-factor support), a Postgres-backed or Redis-backed job queue, WeasyPrint for PDF. The core is a pure Python package.
- Meets requirement 1 by having the server compute every figure: the editor sends its form on each change and the server returns the totals fragment. One rule, one place, at the cost of a round trip per change.
- Plays to Kobby's Python. Django's admin gives back-office screens for free. Very mature.
- Typing is partial: mypy with django-stubs covers Python, templates are untyped, and any richer browser code (charts, dashboards) is JavaScript outside the type system.

**C. Python API and a TypeScript front end.** FastAPI or Django REST, a React front end, types shared through a generated OpenAPI client.
- Typed across the boundary, but two languages, two toolchains and two test setups for a small team, and the core rules live in Python, so the editor needs a round trip or a second copy.

**D. Rails, Laravel or Phoenix.** Mature and productive, each with strong conventions. All are a new language for Kobby with no other advantage here.

## Decision

**Option A, TypeScript throughout,** shaped like this:

| Concern | Proposal | Alternatives kept open |
| --- | --- | --- |
| Language | TypeScript, strict mode, on a Node LTS release | |
| Repository | One repository with workspaces: `packages/core` (money, tax, totals, numbering rules, document states, cash flow: pure functions, no dependencies, no I/O), `packages/db` (schema, migrations, queries), adapters for email, PDF, payments and storage, and `apps/web` | |
| Web app | Next.js (React), deployed with a preview per pull request | React Router (the former Remix) or SvelteKit, if Next.js's server model proves too heavy |
| Database | PostgreSQL; amounts in `bigint` minor units with a currency code; row-level security on every customer table; the app connects as a role that cannot bypass it | |
| Database access | Drizzle ORM, with migrations as plain SQL files reviewed on their own | Kysely; Prisma |
| Validation | Zod schemas shared by forms, server actions, jobs and imports | Valibot |
| Authentication | Better Auth: a self-hosted library that keeps users in our own Postgres and has organisation and two-factor plugins | A hosted provider (Clerk, WorkOS) if running auth ourselves is unwelcome, subject to where it stores data |
| Background work | A transactional outbox: each job row is written in the same transaction as the change that needs it, then a worker delivers it with retries and an idempotency key. The runner is chosen with the hosting decision: a hosted runner (Inngest, Trigger.dev) or a scheduled drain if the app stays on Vercel; pg-boss or Graphile Worker if there is a long-running worker | |
| PDF | Chosen by a spike before the core loop, because accurate generation is v1's one job (`0003-audience-and-v1-scope.md`). Candidates: `@react-pdf/renderer` (no browser), headless Chromium through Playwright printing HTML and CSS, and a dedicated paged-media engine. Each renders the same pack of hard documents from a snapshot and is judged on page breaks, repeated table headers, totals kept together, page numbering, fonts, file size and speed. The spike also tries printing from the user's own browser, as a convenience. The PDF of record is always made on the server with one pinned engine and embedded fonts, so it comes out the same every time; the file is stored in object storage in the chosen region | |
| Email | A transactional provider behind the email adapter, chosen with the region decision (Postmark, Resend, Amazon SES) | |
| Payments | Hosted checkout or payment links only, so card data never reaches Invoica. Stripe for card markets; Paystack where mobile money matters, for example Ghana. Coverage to confirm once the launch market is set | |
| Tests and checks | Vitest; fast-check for property tests in the core; Playwright end to end at phone and desktop widths; axe-core for accessibility; `tsc` for types; ESLint with typescript-eslint; one formatter | |
| Errors and logs | Sentry in the chosen data region; structured logs with personal and financial fields redacted | |
| Hosting | Vercel can stay for the web app, with its function region set next to the database. The database moves to a Postgres project in the region the launch market needs; the current Neon project is in AWS us-east-1 and Neon cannot change a project's region (I-M9) | To be settled in the hosting and data residency record |

## Why A wins

The deciding reason is requirement 1. With one TypeScript core, the editor, the server, the PDF and the dashboards call the same function, so the class of bug behind I-H2 and I-C1 cannot come back through a second copy. Option B can meet the same rule by keeping every calculation on the server, and it is a sound second choice; it gives up end-to-end typing and makes the editor depend on a round trip for every keystroke.

After that: typing across every layer without a generated boundary, the depth of the ecosystem for the integrations the foundation lists, and keeping the Vercel preview workflow Kobby already uses.

## Consequences

- Nothing from the Python code carries over. The audit and the characterisation tests carry the behaviour.
- Kobby's learning curve is TypeScript and React more than the domain. The core package is plain TypeScript with no framework, which is the easiest place to start reading and the part that matters most.
- No admin screens come free. Back-office needs (support, refunds, account lookups) are built as small internal pages, or handled in the database console under a written procedure, until they are needed.
- Python can return later where it is strongest, for example forecasting or analysis reading from a replica, as a separate service.
- The tools named are well known today; each is confirmed against its own documentation before it is adopted, and anything that handles money, auth or personal data is added only with Kobby's yes (`CLAUDE.md`, "Ask first").

## What would change this

- A strong preference from Kobby to stay in Python: choose B, with every editor figure computed on the server.
- A launch market whose e-invoicing scheme needs an integration that only exists for another platform. To check when the launch market is decided.
