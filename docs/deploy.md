# Deploying Invoica

How Invoica runs for real, following decision 0016: the app on Vercel Pro in London, the database on Neon in London,
kept PDFs and logos in Cloudflare R2 in the EU, email out through Resend, and the domain's DNS at Cloudflare. Every
step is the owner's; the commands run in a terminal on his own machine, in the clone at `~/Downloads/_DEV/invoica-v2`.

| Piece | What it is | Where |
| --- | --- | --- |
| App | The Next.js app: pages, server actions, background jobs and PDFs (`@sparticuz/chromium`) | Vercel, functions in London (`apps/web/vercel.json`) |
| Scheduler | Calls `/api/jobs/drain` every fifteen minutes: reminders, retries, anything an action left | Vercel's cron jobs (`apps/web/vercel.json`) |
| Database | PostgreSQL 16 with the three roles, row-level security and every migration | Neon, AWS London (eu-west-2) |
| Files | Kept PDFs and logos, each written once under a new key | Cloudflare R2, bucket `invoica-files`, kept in the EU |
| Email out | Invoices, reminders, confirmations and password resets | Resend, from `invoices@send.getinvoica.com` |
| Email in | `hello@getinvoica.com`, forwarded to the owner's inbox | Cloudflare Email Routing |
| DNS | `getinvoica.com`, every record "DNS only" | Cloudflare, the Invoica account |

Do steps 2 to 5 before the first deployment with these settings (step 6). Until every setting in step 5 is in place,
a production server stops at start with a list of what is missing, so pages that need the server answer with an error.

## 1. Domain and DNS (done 30 October 2026)

- `getinvoica.com` is registered at Namecheap, with Cloudflare's nameservers. Registration can move to Cloudflare once
  the 60 days after buying are up.
- In Cloudflare (the Invoica account): the records Vercel asked for, "DNS only" (grey cloud). Vercel's own network
  protects and serves the app, and a Cloudflare proxy in front would hide visitors' addresses from sign-in's limits.
- In Vercel: `getinvoica.com` is the production domain, and `www.getinvoica.com` redirects to it (308).
- Email Routing sends `hello@getinvoica.com` to the owner's inbox. Catch-all is off.
- Still to do: turn on DNSSEC (Cloudflare, DNS, Settings; then the DS record at Namecheap).

## 2. Database: Neon

1. Create the project at [neon.com](https://neon.com) directly. Vercel's Neon integration connects the app as the
   project's admin role, which can bypass row-level security, so it is not used.
2. New project: name `Invoica`, Postgres version 16, AWS, region Europe West 2 (London). The free plan is enough while
   testing.
3. Make three passwords, one for each role, and keep them in a password manager:

   ```
   openssl rand -hex 24
   openssl rand -hex 24
   openssl rand -hex 24
   ```

4. In Neon's SQL Editor, on the database `neondb`, run this with the three passwords in place. `neondb_owner` is the
   admin role Neon made with the project (its name is in the Connect dialog, if different):

   ```sql
   create role invoica_owner login password 'OWNER_PASSWORD' nosuperuser nobypassrls createdb;
   create role invoica_app login password 'APP_PASSWORD' nosuperuser nobypassrls nocreatedb nocreaterole;
   create role invoica_worker login password 'WORKER_PASSWORD' nosuperuser nobypassrls nocreatedb nocreaterole;
   grant invoica_owner to neondb_owner;
   ```

   Then, on its own:

   ```sql
   create database invoica owner invoica_owner;
   ```

   The app connects as `invoica_app`, which cannot bypass row-level security; background jobs are claimed as
   `invoica_worker`; only migrations use `invoica_owner`. Roles made with SQL get no admin rights on Neon. The grant
   lets the admin role make a database owned by `invoica_owner`, which PostgreSQL 16 requires.
5. Click Connect. Copy the host twice: with "Connection pooling" on (the pooled host, with `-pooler` in its name) and
   off (the direct host). The addresses Invoica uses are these, with `?sslmode=verify-full` in place of whatever
   Neon shows after the `?`:

   | For | Address |
   | --- | --- |
   | The app (Vercel) | `postgresql://invoica_app:APP_PASSWORD@POOLED_HOST/invoica?sslmode=verify-full` |
   | Background jobs (Vercel) | `postgresql://invoica_worker:WORKER_PASSWORD@POOLED_HOST/invoica?sslmode=verify-full` |
   | Migrations (your terminal only) | `postgresql://invoica_owner:OWNER_PASSWORD@DIRECT_HOST/invoica?sslmode=verify-full` |

   The pooler suits the app: its settings and locks last one transaction each. Migrations use the direct host.
6. Apply every migration, from your terminal:

   ```
   cd ~/Downloads/_DEV/invoica-v2
   read -s "OWNER_PW?invoica_owner password: "
   DATABASE_OWNER_URL="postgresql://invoica_owner:${OWNER_PW}@DIRECT_HOST/invoica?sslmode=verify-full" pnpm db:migrate
   unset OWNER_PW
   ```

   `read -s` takes the password without showing it, so it stays out of the shell's history and off the screen.

   It answers `Applied: 0001_init.sql, …, 0028_user_preference.sql. Already applied: 0.` Never run the seed against
   this database, and never give Vercel the owner's address.

The free plan gives 100 compute hours a month and puts the database to sleep after five minutes without use. With the
scheduler every fifteen minutes the database sleeps about two thirds of the time, about 60 hours a month at the
smallest size. When customers arrive, move to the Launch plan (Billing) and set the restore window to 7 days.

## 3. Files: Cloudflare R2

1. In the Invoica Cloudflare account, R2 Object Storage: turn R2 on if asked. Cloudflare may want a card on file; the
   free allowance (10 GB stored) covers Invoica for a long time.
2. Create bucket: name `invoica-files`, location "Specify jurisdiction", European Union (EU), storage class Standard.
   Leave public access off: the app reads every file itself.
3. R2, Manage API tokens, Create API token: name `invoica-app`, permission "Object Read & Write", applied to the bucket
   `invoica-files` only, no expiry. Copy the Access Key ID, the Secret Access Key (shown once) and the EU endpoint,
   `https://ACCOUNT_ID.eu.r2.cloudflarestorage.com`.

## 4. Email out: Resend

1. In Resend, Domains, Add domain: `send.getinvoica.com`, region Ireland (eu-west-1).
2. Add every record it shows in Cloudflare's DNS, exactly as shown. They sit on the `send` subdomain, so Email
   Routing's records on `getinvoica.com` stay as they are. If Resend offers to add them in Cloudflare for you, that
   works too. Click Verify and wait for "Verified".
3. If the domain has no DMARC record yet, add one in Cloudflare: TXT, name `_dmarc`, content `v=DMARC1; p=none;`.
4. API Keys, Create: permission "Sending access", domain `send.getinvoica.com`. Copy the key.

An invoice's email comes from `Business name <invoices@send.getinvoica.com>`, with replies going to the business's own
address.

## 5. Vercel

1. Move the team to Pro (team settings, Billing) before deploying this version. Hobby allows a cron job once a day
   only and refuses the deployment, and it is for personal use. To test on Hobby first, set the schedule in
   `apps/web/vercel.json` to `0 6 * * *` (once a day) and put `*/15 * * * *` back on moving to Pro.
2. Project settings: Root Directory `apps/web` (as now); Build and Deployment, Node.js Version 22.x.
3. Two secrets, from your terminal:

   ```
   openssl rand -base64 36
   openssl rand -hex 20
   ```

4. Settings, Environment Variables: add each of these for **Production only** (untick Preview and Development, so a
   preview never reaches the real database), marked Sensitive:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the app's address from step 2 |
   | `DATABASE_WORKER_URL` | the background jobs' address from step 2 |
   | `BETTER_AUTH_SECRET` | the first secret (48 characters) |
   | `BETTER_AUTH_URL` | `https://getinvoica.com` |
   | `CRON_SECRET` | the second secret (40 letters and digits) |
   | `EMAIL_PROVIDER` | `resend` |
   | `RESEND_API_KEY` | the key from step 4 |
   | `EMAIL_FROM` | `Invoica <invoices@send.getinvoica.com>` |
   | `INVOICA_CLIENT_IP_HEADER` | `x-real-ip` |
   | `R2_ENDPOINT` | the EU endpoint from step 3 |
   | `R2_BUCKET` | `invoica-files` |
   | `R2_ACCESS_KEY_ID` | from step 3 |
   | `R2_SECRET_ACCESS_KEY` | from step 3 |

   Vercel sends `CRON_SECRET` as the scheduler's bearer token by itself. Left unset on purpose: `DATABASE_OWNER_URL`,
   `FILE_STORAGE_DIR`, `CHROMIUM_PATH`, `MAILBOX_DIR`, and `INVOICA_PLANS` (unset, everyone has everything: the free
   version before billing). Vercel overwrites `x-real-ip` on every request with the visitor's address, so it cannot be
   forged.

Sign-in works at `https://getinvoica.com` only: the `vercel.app` address is a different origin, and sign-in refuses it.

## 6. First deployment

1. Pull the bundle into `main` and push, as its `VERIFY.md` says. Vercel builds and deploys production.
2. Check the database and the PDFs (run the PDF check twice: the first call starts a cold function):

   ```
   curl -sS https://getinvoica.com/api/health
   curl -fsS -H "Authorization: Bearer CRON_SECRET" https://getinvoica.com/api/health/pdf
   curl -fsS -H "Authorization: Bearer CRON_SECRET" https://getinvoica.com/api/health/pdf
   ```

   The first answers `{"status":"ok"}` when the app reaches the database as both `invoica_app` and
   `invoica_worker`. The PDF check answers `{"status":"ok","ms":…,"bytes":…}`: a few seconds cold, under a second
   warm. A `503` from the PDF check means Chromium did not start on Vercel; the function's log says why, and the
   fallback is in `docs/spikes/pdf-on-vercel.md`.

   When the health check answers `{"status":"unavailable"}`, the function's log in Vercel (Logs, path
   `/api/health`) names the setting and the reason, for example
   `health check: DATABASE_URL: 28P01 password authentication failed for user "invoica_app"`. To try an address from
   your terminal before putting it in Vercel, paste it when asked:

   ```
   cd ~/Downloads/_DEV/invoica-v2
   read -s "CHECK_URL?Address to check: "
   CHECK_URL="$CHECK_URL" pnpm -s db:check
   unset CHECK_URL
   ```

   It answers `Connected as invoica_app to invoica, PostgreSQL 16…`, or `Could not connect:` and the reason. It never
   prints the address.
3. Settings, Cron Jobs shows `/api/jobs/drain` every fifteen minutes. After the first run its log shows `200`.
4. Create an account with your own address at `https://getinvoica.com/sign-up`: the confirmation email
   arrives from `invoices@send.getinvoica.com`. Then add a logo, a client and an invoice, issue it, and download its
   PDF. In R2, the bucket now holds the logo and the PDF under your organisation's id.
5. Point an uptime monitor at `https://getinvoica.com/api/health`.

## 7. Each new version

1. If the bundle's `VERIFY.md` lists a new migration, apply it first with the command in step 2.6. Migrations are only
   ever added, never edited, so the version running now keeps working against the new database.
2. Pull and push. Vercel deploys; check `/api/health`.

To go back, use Instant Rollback on an earlier production deployment in Vercel; never undo a migration by hand. Since
migration 0026 the database answers the reminder scan of every earlier version (decision 0011). Never go back past
the first deployment with these settings: earlier versions keep files on the function's disk, which Vercel does not
keep.

## 8. Backups

- **Database:** Neon's restore window, 6 hours on the free plan and up to 7 days on Launch. Once a quarter, restore to
  a new branch at a past time and sign in against it, to prove it works.
- **Files:** the kept PDFs are records and are never made again. R2 stores each file on several machines, but a file
  deleted by mistake is gone. A second copy, or a bucket lock so nothing can be deleted for a set time, is still the
  owner's choice.

## Not here yet

- Error tracking: a service that receives errors handles personal data, so it is an ask-first choice.
- Bounce handling for email (a Resend webhook).
- A mailbox for sending as `hello@getinvoica.com`.

## A server of its own

The `Dockerfile` and `deploy/compose.yaml` still run Invoica on a server of its own (decision 0010's design), with the
pinned Chromium and files in a folder. CI builds both images on every commit and runs the migration image against an
empty database.

- Settings, next to `deploy/compose.yaml`, never committed and readable by root only, so each container holds only its
  own: `invoica.env` for the app (the names in step 5, with `FILE_STORAGE_DIR` from the compose file in place of the
  R2 settings, and `INVOICA_CLIENT_IP_HEADER=cf-connecting-ip` behind a Cloudflare tunnel); `migrate.env` with
  `DATABASE_OWNER_URL` only; `scheduler.env` with `CRON_SECRET` only; `tunnel.env` with `TUNNEL_TOKEN` only. Git and
  Docker ignore every `*.env` file.
- A database provider that signs with its own authority publishes a root certificate: save it as `deploy/db-ca.crt`,
  add `NODE_EXTRA_CA_CERTS=/etc/invoica/db-ca.crt` to `invoica.env` and `migrate.env`, mount it in the app's
  `volumes` and in the migration's `docker run`.
- First start and each version:

  ```
  docker build --target migrate -t invoica-migrate .
  docker build --target runner -t invoica-app .
  docker run --rm --env-file deploy/migrate.env invoica-migrate
  docker compose -f deploy/compose.yaml up -d
  ```

- The compose file's scheduler calls `/api/jobs/drain` every five minutes, and the `files` volume needs a nightly
  copy elsewhere.
