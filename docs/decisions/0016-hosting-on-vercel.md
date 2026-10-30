# 0016: Hosting on Vercel, with Neon, Cloudflare R2, Resend and Cloudflare DNS

Replaces 0010 (Cloudflare in front of one server of our own), which was proposed and never built.

## Context

On 27 October 2026 the owner agreed to host Invoica on Vercel Pro with a Neon database in London, once a spike had shown
Vercel could make the PDF of record. On 30 October he bought `getinvoica.com`, moved its DNS to an Invoica account in
Cloudflare (registration stays at Namecheap until the 60 days are up), forwarded `hello@getinvoica.com` with
Cloudflare Email Routing, and chose Cloudflare R2 for files. The spike passed (`docs/spikes/pdf-on-vercel.md`).

## Decision

| Piece | Where | Notes |
| --- | --- | --- |
| The app | Vercel Pro, functions in London (`lhr1`) | `apps/web/vercel.json`; Pro for commercial use and the five-minute scheduler |
| Database | Neon, London (AWS eu-west-2), PostgreSQL 16 | The app and the worker connect through Neon's pooler; migrations through the direct address |
| Kept PDFs and logos | Cloudflare R2, a bucket kept in the EU | `R2_*` settings; `apps/web/src/lib/storage.ts` |
| PDFs | `@sparticuz/chromium` 141 on Vercel, the pinned Chromium elsewhere | `chromiumLaunch()` in `apps/web/src/lib/pdf.ts` |
| Background jobs | Actions run their jobs straight after answering; Vercel's scheduler calls `GET /api/jobs/drain` every fifteen minutes with the `CRON_SECRET` bearer token | Emails go out within seconds; the scheduler catches retries and reminders |
| Email out | Resend, from `invoices@send.getinvoica.com` | Records on the `send` subdomain in Cloudflare |
| Email in | Cloudflare Email Routing: `hello@` to the owner's inbox | Until a mailbox is wanted |
| DNS | Cloudflare, every record "DNS only" | Vercel's own network protects and serves the app; a proxy in front would hide visitors' addresses |
| Visitors' addresses | `INVOICA_CLIENT_IP_HEADER=x-real-ip` | Vercel overwrites it on every request, so it cannot be forged |

## Consequences

- The database holds tenancy; nothing about row-level security, roles or migrations changes. The pooler runs in
  transaction mode, which the app already suits: its settings are per transaction (`set_config(…, true)`) and its locks
  are transaction locks.
- `docs/deploy.md` is the setup, step by step. The `Dockerfile` and `deploy/compose.yaml` stay for running Invoica on a
  server of its own, which `chromiumLaunch()` and the folder storage still serve.
- After each deployment, `GET /api/health` (the database) and `GET /api/health/pdf` (with the bearer token) say whether
  the app can reach its data and make a PDF.
- The scheduler runs every fifteen minutes, not five. Neon puts a database to sleep after five minutes without use,
  and its free plan gives 100 compute hours a month: a call every five minutes would keep the database awake all
  month (about 180 hours at the smallest size), and Neon then stops it until the month ends. Every fifteen minutes it
  sleeps about two thirds of the time (about 60 hours). Nothing waits on the scheduler but retries, which are at most
  fifteen minutes late, and reminders, whose scan looks three hours either side of each organisation's day.
- Hobby allows a scheduler once a day only, and is for personal use, so the team is on Pro before the first
  deployment with `vercel.json`.
- Files no longer live beside the app. The database's backup is Neon's restore window; the files' is R2's own
  durability, with a second copy still to choose (step 8 of `docs/deploy.md`).
- A deployment from before these settings keeps files on the function's disk, which Vercel does not keep, so going
  back stops at the first deployment with them.
