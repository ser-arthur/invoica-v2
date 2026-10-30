# Spike: the PDF of record on Vercel

30 October 2026. The question from the hosting decision of 27 October (Vercel Pro and Neon in London): can Vercel's
functions make Invoica's PDFs exactly as the pinned Chromium does (decision 0006)?

## The answer

Yes, with `@sparticuz/chromium` 141.0.0, the Chromium build made for serverless functions (Chromium 141.0.7390.0,
against the pinned 141.0.7390.37). Run in this repository's container with the launch settings below, the whole PDF
test pack passed, the visual baselines included:

| Run | Chromium | Launch settings | Tests |
| --- | --- | --- | --- |
| 1 | pinned 141.0.7390.37 | Invoica's own | 231 of 231 (every CI run) |
| 2 | serverless 141.0.7390.0 | Invoica's own | 231 of 231 |
| 3 | serverless 141.0.7390.0 | the package's own, as published | 48 of 231 |
| 4 | serverless 141.0.7390.0 | the package's, without `--single-process` | 231 of 231 |
| 5 | serverless 141.0.7390.0 | as run 4, also without `--disable-web-security` and `--allow-running-insecure-content` | 231 of 231 |

Run 3 failed because `--single-process` closes the whole browser when one page's context closes, and Invoica opens
and closes a context for every PDF. Run 5 is the setting to use: it also drops two flags that loosen the browser's
security, which a PDF of our own HTML, with scripts off and every request but `data:` refused, never needs.

Times, one PDF of the hard pack in this container:

| Chromium | First PDF (start and render) | Each after |
| --- | --- | --- |
| pinned | 590 ms | 252 to 398 ms |
| serverless | 278 ms | 131 to 213 ms |

The serverless package unpacks its browser on a function's first use, about 2 seconds here, so a cold function's
first PDF takes about 2.5 seconds. The binary is 66 MB packed, 197 MB unpacked into `/tmp`.

## The build Vercel would deploy

`vercel build` (CLI 63.1.2), run on a copy of the repository with the project's settings (root `apps/web`, Next.js,
Node 22) and no secrets: it built, and every function of the app carries the serverless package's four archives
(`chromium.br`, `al2023.tar.br`, `fonts.tar.br`, `swiftshader.tar.br`). Each is about 85 MB unpacked, under Vercel's
250 MB limit; the middleware is 2 MB. The drain allows 120 seconds and the PDF check 60.

## The database roles on Neon

Neon's admin role is not a superuser. In a PostgreSQL 16 standing in for it (an admin with `createdb` and
`createrole` only), the role statements of `docs/deploy.md` step 2 ran as written; `create database invoica owner
invoica_owner` failed with "must be able to SET ROLE" until the admin was granted `invoica_owner`, and then every
migration, 0001 to 0028, applied as `invoica_owner`.

## What this leaves to prove on Vercel itself

The container is not Vercel's runtime. After the first deployment, `GET /api/health/pdf` (with the `CRON_SECRET`
bearer token) renders one invoice and answers how long it took; one call cold and one warm settle it. If it fails
there, the fallback is a small container service for PDFs only (the existing `Dockerfile`), called by the app.

## Every upgrade

`@sparticuz/chromium` follows Chromium's version numbers. It moves with `playwright-core` (pinned 1.56.0, Chromium
141), and the PDF test pack runs against both on every upgrade.
