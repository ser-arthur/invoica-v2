# 0003. Audience and v1 scope

- **Status:** Proposed, 18 October 2026. Kobby's answers recorded; the framing below awaits his yes.
- **Related:** `0004-launch-market.md`, foundation sections 1 and 10.

## Context

Kobby's answers to the foundation's section 1, 18 October 2026, in summary:

- **Who it is for:** freelancers, small agencies and small firms, especially businesses that are just starting.
- **The one job v1 must do well:** let a user set up and produce invoices with very accurate generation, including how page breaks are handled; offer a few styles and templates (professional, more creative, and a signature Invoica style), and be flexible.
- **Current users and data:** none. Everything starts from scratch. Demo data matters for seeing how screens look and for testing.
- **A year from now, users should say:** their invoices look incredible, setting up is easy, getting from creating an invoice to being paid is quick, and tracking invoices and clients is easy. v1 leads with looking established (`0005-positioning-and-pricing.md`).

The audit shows the current app's weakest point is exactly this job: four money calculations that disagree, PDFs rebuilt from live data on every download, a logo the PDF service cannot load, and totals that do not add up on the page (`docs/audit.md`, sections 3 and 4).

## Decision (proposed)

**Audience.** People starting or running a small service business: freelancers, sole traders, small agencies and small firms. They have few or no admin staff, they need to look established from their first invoice, and they want to be paid on time.

**The one job v1 must do well.** *Produce a correct, professional invoice that looks exactly as intended on screen, on paper and as a PDF, however long it is.* Correct means the figures follow one money rule and always add up as printed. Exactly as intended means:

- the PDF is generated from the issued invoice's snapshot and kept, so it never changes afterwards;
- long invoices break across pages cleanly: table headers repeat, a line is never split across a page, the totals block stays together, and pages are numbered "1 of 3";
- what the editor previews is what the PDF shows;
- long names, long descriptions, many lines, every supported currency and both short and long addresses are handled, and each of these has a test.

**Templates in v1.** A range wide enough for very different businesses, from a conservative professional firm to a creative studio, all driven by the same snapshot and each taking the organisation's logo and brand colour. Round 1 offers six (`docs/design/templates-round-1.md`); Kobby chooses which ship in v1. The visual direction is approved before it is built (foundation section 8).

**Line styles.** The data always stores a quantity and a unit price; each line is shown as amount only, quantity × unit price, hours × rate, or a dated entry. When the business is registered for VAT in the UK, quantity, unit price and the VAT rate are shown on every line, as a full VAT invoice requires (GOV.UK, VAT Notice 700/21, section 4). Each document also carries a supply date or service period, an optional project summary, named discounts, and earlier payments such as deposits taken off the balance.

**What v1 includes around that job** (foundation section 10, steps 1 and 2): sign-up and organisations, clients, saved items, invoices from draft to issued, credit notes, numbering, PDFs, sending by email, recording payments, the owner's own taxes with UK and Ghana presets (`0004-launch-market.md`), the 30-day trial and the free plan (`0005-positioning-and-pricing.md`), and demo data for each of the three seed scenarios.

**What v1 leaves out:** quotes, recurring invoices, reminders, online payment, expenses, bank import, forecasts and team roles beyond the owner. Reminders and payment links come first after v1, because getting paid quickly is the next promise (`0005-positioning-and-pricing.md`).

## Consequences

- The PDF engine becomes the riskiest technical choice, so it is settled by a spike before the core loop is built (`0002-stack.md`).
- Page-break behaviour is written as acceptance criteria in the invoice document spec, with a fixed pack of hard test documents rendered on every change and compared with approved images.
- The three templates need real content and references before any layout work.
- "Flexible" is scoped in v1 to logo, brand colour, template choice, line style, and which blocks show (bank details, mobile money, terms, notes, project summary). A free-form template designer waits until after v1.
- The old app stays a reference: its flows, its three styles, its demo scenarios and what the audit lists as worth keeping. Its Python code itself does not carry over, because the stack changes.
