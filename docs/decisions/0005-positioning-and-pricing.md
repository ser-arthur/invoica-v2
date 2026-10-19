# 0005. Positioning and pricing

- **Status:** Accepted, 18 October 2026 (Kobby).
- **Related:** `0003-audience-and-v1-scope.md`; the reasoning, market prices and sources are in the project doc `invoica-product-directions.md`.

## Context

Invoicing alone is crowded, and much of it is free: Square, Zoho and UK banks such as Mettle and Starling give it away, and paid invoicing tools charge about £6 to £20 a month (prices checked 18 October 2026). Kobby wants Invoica to stand out and become more than an invoicing app, so it need not lead with invoicing.

Five positions were considered: look established from day one; get paid on time; know what you can pay yourself; from first message to paid; bill in a sentence.

What Kobby wants a user to say a year from now: their invoices look incredible, setting up is easy, getting from creating an invoice to being paid is quick, and tracking invoices and clients is easy.

## Decision

**Positioning.** v1 leads with *look established from day one*: everything a business's clients see from it, done properly. *Get paid on time* is the next promise, followed by simple tracking of invoices, clients and money. The line Invoica works towards:

> Beautiful invoices, set up in minutes, paid fast, and everything easy to keep track of.

**Pricing model.** A reverse trial: every new account gets the full paid plan for 30 days with no card, then moves to the free plan unless it upgrades.

**Plans.**

| | Free | Pro | Studio |
| --- | --- | --- | --- |
| Price | £0 | £7 a month, or £70 a year | £15 a month, or £150 a year |
| Clients | 3 active | unlimited | unlimited |
| Invoices, credit notes, PDFs, sending by email | unlimited | unlimited | unlimited |
| Templates | the signature Invoica template | all templates, own logo and colour | all, plus several brands or businesses |
| "Made with Invoica" mark | shown | removed | removed |
| Reminders and payment links, once built | | included | included |
| People | 1 | 1 | up to 5 |

**Rules that go with it.**

- Credit notes, correct numbering and kept PDFs are in every plan. Producing a correct invoice is never paywalled.
- The free plan is limited by clients. Invoices are never counted.
- Lower prices in countries where incomes are lower (for example Ghana and Nigeria), charged in local currency.
- No fee taken from clients' payments at launch.
- **Founding offer:** the first 200 paying customers pay £5 a month for Pro, for as long as they keep subscribing, whatever the price later becomes.

## Consequences

- Billing, the trial, the free plan's limit and the mark are part of the foundations work, behind feature flags until launch.
- Before anyone is charged: confirm whether prices are shown with or without VAT, and when Invoica must register for VAT (GOV.UK); choose the billing provider, including how it handles tax on subscriptions in other countries.
- The prices are tested with ten or more people from the first audience before launch.
- Prices are reviewed when reminders and payment links ship, since they add the "get paid" value.
