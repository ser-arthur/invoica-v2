# Deploying Invoica

How to run Invoica for real, following decision 0010 (proposed): Cloudflare in front, one small server for the app, a managed PostgreSQL 16 in the same region. Nothing here has been done yet; each step says who does it.

The pieces:

| Piece | What it is | Where |
| --- | --- | --- |
| App | `Dockerfile`, target `runner`: the Next.js server, the background jobs and the pinned Chromium for PDFs | The server |
| Migrations | `Dockerfile`, target `migrate`: applies new migrations as the owner role, then exits | The server, before each new version |
| Scheduler | Calls `/api/jobs/drain` every five minutes: reminders, emails, PDFs, retries | `deploy/compose.yaml` |
| Tunnel | Cloudflare Tunnel: Cloudflare reaches the app with no port open to the internet | `deploy/compose.yaml` |
| Database | PostgreSQL 16 with daily backups and point-in-time restore | The provider |
| Files | Kept PDFs and logos, in a volume on the server | Backed up nightly (step 8) |

## 1. Domain and Cloudflare (owner)

1. Buy the domain (the blueprint's open question 3) and add it to a Cloudflare account on the free plan.
2. In Cloudflare, Zero Trust, Networks, Tunnels: create a tunnel and copy its token. Add a public hostname, for example `app.<domain>`, pointing to `http://app:3000`.

## 2. Database (owner, with the provider's console)

Create a PostgreSQL 16 database in the UK or EU with daily backups and point-in-time restore. Then, as the provider's admin user, create the three roles and the database (choose long random passwords):

```sql
create role invoica_owner login password '...' nosuperuser nobypassrls createdb;
create role invoica_app login password '...' nosuperuser nobypassrls nocreatedb nocreaterole;
create role invoica_worker login password '...' nosuperuser nobypassrls nocreatedb nocreaterole;
create database invoica owner invoica_owner;
```

The app connects as `invoica_app`, which cannot bypass row-level security; background jobs are claimed as `invoica_worker`; only migrations use `invoica_owner`.

## 3. Email (owner)

In Resend: add the sending subdomain (for example `send.<domain>`) in the Ireland region and add the DNS records it shows in Cloudflare. They sit on the subdomain, so the Zoho Mail records on the main domain stay as they are. Create an API key with sending access only.

## 4. Server (owner, or with help)

A small virtual server in the UK or EU (for example Hetzner CX23), with Docker installed. Allow SSH from your own address only; no other port needs to be open, because the tunnel connects outwards.

## 5. Settings

On the server, next to `deploy/compose.yaml`, create four files (never committed; readable by root only). Each container gets only its own, so the app never holds the owner role's password. Every name is in `.env.example`.

`invoica.env`, for the app:

```
DATABASE_URL=postgres://invoica_app:...@<host>:5432/invoica?sslmode=verify-full
DATABASE_WORKER_URL=postgres://invoica_worker:...@<host>:5432/invoica?sslmode=verify-full
BETTER_AUTH_SECRET=<48 random characters>
BETTER_AUTH_URL=https://app.<domain>
CRON_SECRET=<40 random letters and digits>
EMAIL_PROVIDER=resend
RESEND_API_KEY=<the key>
EMAIL_FROM=Invoica <invoices@send.<domain>>
INVOICA_CLIENT_IP_HEADER=cf-connecting-ip
```

`migrate.env`, for the migration image only: `DATABASE_OWNER_URL=postgres://invoica_owner:...@<host>:5432/invoica?sslmode=verify-full`.

`scheduler.env`, with the same `CRON_SECRET` and nothing else, and `tunnel.env`, with `TUNNEL_TOKEN=<the tunnel token>` and nothing else.

Git and Docker ignore every `*.env` file, so a commit or an image build on the server never takes these files with it.

The database connection is encrypted and checks the server's certificate (`sslmode=verify-full`; the driver Invoica uses, pg 8, reads `sslmode=require` the same way). A provider whose certificate comes from a public authority needs nothing more. A provider that signs with its own authority publishes a root certificate: save it next to the settings files as `db-ca.crt`, add `NODE_EXTRA_CA_CERTS=/etc/invoica/db-ca.crt` to `invoica.env` and `migrate.env`, add `- ./db-ca.crt:/etc/invoica/db-ca.crt:ro` to the app's `volumes` in `deploy/compose.yaml`, and add `-v "$PWD/deploy/db-ca.crt:/etc/invoica/db-ca.crt:ro"` to the `docker run` of the migration image. Without it, the health check fails with a certificate error, and nothing is sent unencrypted.

A production server checks its settings when it starts (`apps/web/src/lib/config-check.ts`) and stops with a list of anything missing or wrong, without repeating any value.

## 6. First start

```
docker build --target migrate -t invoica-migrate .
docker build --target runner -t invoica-app .
docker run --rm --env-file deploy/migrate.env invoica-migrate
docker compose -f deploy/compose.yaml up -d
curl -fsS https://app.<domain>/api/health
```

The health check answers `{"status":"ok"}` when the app reaches its database. Point an uptime monitor at it.

## 7. Each new version

1. Pull the new code (a release tag from `main`).
2. Build both images. If the release adds a migration in the table below, stop the scheduler first. Run the migration image, then `docker compose -f deploy/compose.yaml up -d app`, and start the scheduler again if it was stopped.
3. Check `/api/health` and sign in.

Migrations are only ever added, never edited, so the previous version keeps working against the new database while the new one starts, with the exceptions below. To go back, start the previous image; never undo a migration by hand.

A previous image cannot run the reminder scan against a database with these migrations:

| Migration | Why | What to do |
| --- | --- | --- |
| 0022, 0024 | The scan offers invoices that may have a reminder due, with a margin, and the app chooses. An app from before 0022 queues what it is offered, so some reminders go up to a day early, and one can go before the day the invoice was issued. | Stop the scheduler (`docker compose -f deploy/compose.yaml stop scheduler`) before running the migration image, and start it again (`start scheduler`) once the new app is up. To go back to an image from before 0022, keep the scheduler stopped while it runs. |

## 8. Backups

- **Database:** the provider's daily backups and point-in-time restore. Restore into a new database once a quarter, to prove it works.
- **Files:** the kept PDFs are records and are never made again, so the `files` volume is copied off the server every night, for example to Cloudflare R2 with `rclone`, keeping 30 days. Choosing and setting this up is an open step for the owner.

## Not here yet

- Object storage for files in place of the volume (decision 0010 lists it).
- Error tracking: a service that receives errors handles personal data, so it is an ask-first choice.
- Bounce handling for email (a Resend webhook).
