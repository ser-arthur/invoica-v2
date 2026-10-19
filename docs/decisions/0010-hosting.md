# 0010. Hosting

- **Status:** Proposed, 19 October 2026. The owner asked for Cloudflare (the free plan for static pages, Workers Paid for the app) or a better alternative; this record proposes the alternative and waits for a yes.

## Context

The app is one Next.js 16 server, a background worker that drains the outbox (emails and PDFs), a pinned Chromium that makes the PDF of record, and PostgreSQL 16 with row-level security. Checked on 19 October 2026:

- Next.js 16 runs `proxy.ts` on the Node.js runtime. It sets the content security policy with a nonce and refuses server actions from another origin.
- The OpenNext adapter for Cloudflare lists Node middleware as not yet supported, so `proxy.ts` would have to be reworked for Workers.
- Workers cannot run Chromium. PDFs would come from Cloudflare's Browser Rendering (10 browser hours a month on Workers Paid, then $0.09 an hour; 10 minutes a day on the free plan), a Chromium version Invoica does not pin, so the approved-image tests would no longer prove what customers receive (decision 0006).
- Postgres is not hosted by Cloudflare; Workers would reach it through Hyperdrive.
- A small virtual server costs little: Hetzner's CX23 is €5.49 a month after its June 2026 price change.

Sources: [Next.js 16](https://nextjs.org/blog/next-16), [OpenNext for Cloudflare](https://opennext.js.org/cloudflare), [Browser Rendering pricing](https://developers.cloudflare.com/browser-rendering/pricing/), [Hetzner price change](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do).

## Proposal

- **Cloudflare, free plan:** the domain's DNS, the landing page, and the proxy in front of the app, with TLS. The app reads the visitor's address from `cf-connecting-ip` (`INVOICA_CLIENT_IP_HEADER=cf-connecting-ip`), which Cloudflare sets on every request.
- **One small server in the UK or EU** runs a container image with the web app, the worker and the pinned Chromium. Only Cloudflare's addresses may reach it.
- **A managed PostgreSQL 16 in the same region,** with daily backups and point-in-time restore, and the three roles the migrations expect (owner, app, worker). Options to be priced when hosting is set up.
- **Files** (kept PDFs and logos) move from the local folder to object storage (Cloudflare R2 or the database host's), behind the existing storage adapter.

## Consequences

- The code runs as it does in development and CI; nothing is reworked for a different runtime.
- Someone looks after the server: operating system updates, the container restart policy, and alerts if it stops. A managed container platform in the same region is the alternative if that is unwanted.
- Moving to Workers later stays possible once the adapter supports Node middleware and PDFs are settled.
