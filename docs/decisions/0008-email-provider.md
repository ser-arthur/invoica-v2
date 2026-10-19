# 0008. Email provider

- **Status:** Open, 19 October 2026. Needs Kobby's choice, with the hosting region (foundation section 3, item 5).

## Context

Invoices are sent by email with their kept PDF attached, through the outbox (`document.email` jobs), so a slow or failed send is retried and never blocks the person sending. The adapter in `apps/web/src/lib/email.ts` has one implementation today: a development mailbox that writes each email to `.data/mail` as an `.eml` file. Nothing leaves the machine.

A provider processes personal data (client names and email addresses) and sends on Invoica's behalf, so it needs a processor agreement, a sending domain with SPF, DKIM and DMARC, and a data region that matches the hosting decision. `CLAUDE.md` asks for Kobby's yes before adding anything that handles personal data.

## Options

Checked on each provider's own pages on 19 October 2026. Prices in US dollars, before tax.

| | Postmark | Resend | Amazon SES |
| --- | --- | --- | --- |
| Price | Basic $15.00 a month for 10,000 emails, then $1.80 per 1,000 (Pro $16.50 with $1.30 overage) | Pro $20 a month for 50,000 emails, then $0.90 per 1,000; free plan 3,000 a month, 100 a day | $0.10 per 1,000 emails sent, plus $0.12 per GB of attachments |
| Where data is held | United States (Deft, near Chicago, and AWS); "no plans to add servers in the EU" | Sending region per domain (Ireland available), but "all account data, including email metadata, logs, and API records, is stored in the United States" | The AWS region chosen, London (eu-west-2) included |
| Transfer terms | DPA in the terms of service with Standard Contractual Clauses; no mention of the UK addendum or IDTA | To check in its DPA | Data stays in the chosen region; AWS DPA |
| Set-up | Simple; known for deliverability of transactional email | Simple; developer-friendly API | More work: leave the sandbox, set up bounce and complaint notifications |

At Invoica's expected volume (hundreds to low thousands of invoices a month, each with a PDF of about 100 KB), SES costs cents a month; Postmark and Resend cost their plan fee.

Sources: [Postmark pricing](https://postmarkapp.com/pricing), [Postmark EU privacy](https://postmarkapp.com/euprivacy), [Resend pricing](https://resend.com/pricing), [Resend regions](https://resend.com/docs/dashboard/domains/regions), [Amazon SES pricing](https://aws.amazon.com/ses/pricing/).

## Recommendation (Claude, for Kobby to decide)

Amazon SES in London, if the app is hosted in the UK or EU. It is the only option that keeps client names, addresses and invoice PDFs in the UK, which is the simplest position under UK GDPR for a product that holds other businesses' client records, and it costs almost nothing at this volume. The extra set-up (sandbox exit, bounce handling) is work Invoica needs anyway, since a bounced invoice email must show on the invoice. If deliverability tooling and speed of set-up matter more than data location, Postmark is the alternative; it would need its transfer terms checked for UK data.

## Decision

To be made. Until then, "Send" works end to end in development, and in a deployed copy it fails with a clear message.

## Consequences

- Adding a provider is one adapter of about 40 lines behind `EmailAdapter`, plus environment variables.
- Bounces and complaints need a webhook (a later job), so a bad address is shown on the invoice.
