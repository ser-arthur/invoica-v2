# 0008. Email provider

- **Status:** Open, 19 October 2026. Needs Kobby's choice, with the hosting region (foundation section 3, item 5).

## Context

Invoices are sent by email with their kept PDF attached, through the outbox (`document.email` jobs), so a slow or failed send is retried and never blocks the person sending. The adapter in `apps/web/src/lib/email.ts` has one implementation today: a development mailbox that writes each email to `.data/mail` as an `.eml` file. Nothing leaves the machine.

A provider processes personal data (client names and email addresses) and sends on Invoica's behalf, so it needs a processor agreement, a sending domain with SPF, DKIM and DMARC, and a data region that matches the hosting decision. `CLAUDE.md` asks for Kobby's yes before adding anything that handles personal data.

## Options

- **Postmark:** transactional email only, strong deliverability, simple API; data in the United States.
- **Resend:** simple API built for developers, EU region available; younger company.
- **Amazon SES:** cheapest at volume, any AWS region including London; more set-up (sandbox exit, bounce handling).

Prices, regions and terms to be checked on each provider's own pages when deciding.

## Decision

To be made. Until then, "Send" works end to end in development, and in a deployed copy it fails with a clear message.

## Consequences

- Adding a provider is one adapter of about 40 lines behind `EmailAdapter`, plus environment variables.
- Bounces and complaints need a webhook (a later job), so a bad address is shown on the invoice.
