# 0008. Email provider

- **Status:** Accepted, 19 October 2026: Resend for email the product sends; the company mailbox stays on Zoho Mail.

## Context

Invoices are sent by email with their kept PDF attached, through the outbox (`document.email` jobs), so a slow or failed send is retried and never blocks the person sending. The adapter in `apps/web/src/lib/email.ts` has one implementation today: a development mailbox that writes each email to `.data/mail` as an `.eml` file. Nothing leaves the machine.

A provider processes personal data (client names and email addresses) and sends on Invoica's behalf, so it needs a processor agreement, a sending domain with SPF, DKIM and DMARC, and a data region that matches the hosting decision.

## Options

Checked on each provider's own pages on 19 October 2026. Prices in US dollars, before tax.

| | Postmark | Resend | Amazon SES |
| --- | --- | --- | --- |
| Price | Basic $15.00 a month for 10,000 emails, then $1.80 per 1,000 (Pro $16.50 with $1.30 overage) | Pro $20 a month for 50,000 emails, then $0.90 per 1,000; free plan 3,000 a month, 100 a day | $0.10 per 1,000 emails sent, plus $0.12 per GB of attachments |
| Where data is held | United States (Deft, near Chicago, and AWS); "no plans to add servers in the EU" | Sending region per domain (Ireland available), but "all account data, including email metadata, logs, and API records, is stored in the United States" | The AWS region chosen, London (eu-west-2) included |
| Transfer terms | DPA in the terms of service with Standard Contractual Clauses; no mention of the UK addendum or IDTA | DPA (last updated 31 December 2025) with the EU SCCs, and the UK SCCs as amended by the UK Addendum for transfers from the UK (section 6.4) | Data stays in the chosen region; AWS DPA |
| Set-up | Simple; known for deliverability of transactional email | Simple; developer-friendly API | More work: leave the sandbox, set up bounce and complaint notifications |

Sources: [Postmark pricing](https://postmarkapp.com/pricing), [Postmark EU privacy](https://postmarkapp.com/euprivacy), [Resend pricing](https://resend.com/pricing), [Resend regions](https://resend.com/docs/dashboard/domains/regions), [Resend DPA](https://resend.com/legal/dpa), [Resend domains on Cloudflare](https://resend.com/docs/dashboard/domains/cloudflare), [Amazon SES pricing](https://aws.amazon.com/ses/pricing/).

## Decision

Resend, chosen by the owner on 19 October 2026. The recommendation had been Amazon SES in London, for data location; Resend is simpler to set up and its DPA covers transfers from the UK.

- Invoica sends from a subdomain of the product's domain (Resend's advice, for example `send.<domain>`), with the sending region set to Ireland. Its MX and SPF records sit on that subdomain, so the Zoho Mail records on the main domain are untouched.
- The adapter calls Resend's HTTP API with `fetch`; no SDK is added.
- Development and the end-to-end tests keep the file mailbox. A deployed copy without a provider set still fails with a clear message.

## Consequences

- Client names, email addresses and invoice PDFs pass through Resend, whose account data is held in the United States under its DPA. The privacy notice must name Resend as a processor.
- Bounces and complaints need a webhook (a later job), so a bad address is shown on the invoice.
- Switching provider later is one adapter behind `EmailAdapter`, plus environment variables.
