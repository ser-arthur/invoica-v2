# 0004. Launch market and tax

- **Status:** Accepted, 18 October 2026 (Kobby).
- **Related:** `0003-audience-and-v1-scope.md`, foundation sections 1, 4 and 6.

## Context

Kobby's decision, 18 October 2026:

- Anyone should be able to use Invoica, with the pound as the default currency.
- Tax is fully customisable by the business owner: whether to charge VAT at all, at what rate, and whether there are extra taxes. Many new businesses are not VAT registered, and the product must suit them.
- The UK and Ghana are studied properly, and their VAT systems are built in.

That matches how the established tools work. Measured from their help pages on 18 October 2026:

| Tool | What the owner controls |
| --- | --- |
| Zoho Invoice | Own tax names and rates; tax groups, so several taxes apply to one line and each is shown; a compound tax inside a group; prices with tax included, added on, or a choice per invoice |
| Wave | Own tax name, short name and rate; compound taxes; recoverable taxes; the business's tax number shown on invoices |
| Square | Own tax names and rates; tax added on or included in the price; taxes applied to chosen items only; exemptions |
| Invoice Ninja | Taxes included in prices at company, client or invoice level; tax rates on each line when switched on |

## Decision

1. **Every organisation controls its own tax.** It can:
   - say whether it is registered for VAT, or for another sales tax;
   - charge no tax at all;
   - create its own taxes, each with a name, a rate and the date it applies from;
   - put more than one tax on a line, including a tax charged on top of another (compound);
   - choose whether its prices include tax or have tax added;
   - mark items or lines as exempt or zero-rated;
   - show its tax number on documents.
2. **The UK and Ghana come with their systems built in.** For each, the rates, the extra taxes or levies, and what an invoice must show are researched from the official source (GOV.UK; the Ghana Revenue Authority), loaded as ready-made presets with their dates, and tested. The owner can still change them.
3. **Anywhere else, the owner sets things up.** Invoica works in any currency and any country with the owner's own taxes, and does not claim to know that country's rules until they have been researched.

## Consequences

- From the first migration: several taxes per line, each stored with its name, rate and the rule used; tax-included or tax-added prices; currencies with their real number of decimal places (ISO 4217).
- The money module handles compound taxes and prices that include tax, and the rounding rule covers both (to be decided and tested).
- Research tasks before the invoice spec is written: UK VAT invoice requirements and rates (GOV.UK); Ghana's VAT, levies and invoice requirements (GRA).
- **Ghana's E-VAT.** As vendors summarise it (to confirm with the GRA), businesses registered for VAT in Ghana are being moved, in batches chosen by the GRA, onto a system where each invoice is sent to the GRA, which signs it and returns a QR code before the invoice is issued. For those users, an invoice is only valid once the GRA has signed it. Invoica can support them by connecting to the GRA's system, which needs the GRA's certification. It is a later feature for that group; it does not affect anyone who is not VAT registered, or anyone outside Ghana.
- Countries with similar schemes (for example Italy and Belgium now, the UK from April 2029) are handled the same way if and when Invoica researches them.
