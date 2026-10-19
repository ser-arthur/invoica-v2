# Invoice templates: round 1

Status: mocks for Kobby's reaction, 18 October 2026. Nothing here is a decided visual direction yet (foundation section 8: mock, get his yes, then record as tokens and components).

The six mocks are on the design canvas "Invoica invoice templates, round 1" (private to the owner until shared), as PDFs in `round-1/pdf/`, and as code in `round-1/mock/` (`npm install`, then `node build.js`). Every business, person, address and account number in them is invented.

---

## What the references taught

**Kobby's own recent invoices** (two PDFs he shared; reviewed and not stored here, because they hold real client and bank details):

- A tutoring invoice: one line priced as hours × rate, a second line of detail under the title, a discount with its own name ("friends and family"), the total in a filled panel, a payment block that tells the client which reference to use, and a short thank-you.
- A website invoice: a short project summary at the top, eight numbered deliverables each with a title, a description and an amount only (no quantity or rate), a large total, and payment terms stated in a sentence.

**The old app's three styles** (rendered from a local copy with its demo data):

- Modern: white, green table header, the totals in a tinted box.
- Creative: a dark page with a green gradient total. Heavy on ink when printed, and hard to read on paper.
- Monochrome: grey and monospace, with the payment details as a labelled list.
- Defects seen while rendering, in addition to the audit's list: "None" printed where a client has no address; the demo data's tax rate printed as "VAT (2000%)"; the payment block cut off at the bottom of the preview panel.

**Product-company invoices** (Stripe and Apple style): the amount due and the date due stated first, in one line; quiet grey labels; one accent colour; a link to pay online.

**What UK law asks of the layout** (GOV.UK, checked 18 October 2026):

- Every invoice: a unique number; the business's name, address and contact details; the customer's name and address; a clear description; **the supply date**; the invoice date; the amounts; any VAT; the total owed. A limited company shows its full registered name. [Invoicing and taking payment from customers](https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include)
- A full VAT invoice also shows the supplier's VAT number, the time of supply, **the quantity and unit price for each line**, the VAT rate for each line, the total excluding VAT, and the VAT total in sterling. Simplified VAT invoices are allowed up to £250 including VAT. [Record keeping for VAT, Notice 700/21, section 4](https://www.gov.uk/guidance/record-keeping-for-vat-notice-70021) (last updated 18 March 2024)

Ghana's requirements are a separate research task (`0004-launch-market.md`).

---

## Line styles

Kobby's point: some invoices list an item and an amount only. The data always stores a quantity and a unit price (an amount-only line is quantity 1 at the amount), and each line or document chooses how it is shown:

| Line style | Shows | Fits |
| --- | --- | --- |
| Amount only | title, description, amount | project phases, deliverables, fixed fees |
| Quantity × unit price | title, quantity with its unit, unit price, amount | goods, seats, licences, months |
| Hours × rate | title, hours, hourly rate, amount | consulting, coaching, tutoring |
| Dated entries | date, title, hours or quantity, rate, amount | time logs, day rates |

When the business is registered for VAT in the UK, the template shows quantity, unit price and the VAT rate on every line, because a full VAT invoice must. Amount-only lines then show "1" and the amount as the unit price.

Other things the references asked for, and the mocks show: a second line of description under each title; a project summary; named discounts; deposits and earlier payments taken off the total ("balance due"); a supply date or a service period; the reference the client should quote; payment by bank transfer and by mobile money; a personal note.

---

## The six templates

Each takes the business's logo and brand colour; the colours in the mocks are examples.

| Template | For | What sets it apart | Type |
| --- | --- | --- | --- |
| Counsel | solicitors, accountants, consultancies | a centred letterhead in small capitals, a double rule, a full VAT table with a VAT summary, the legal footer on every page | Source Serif 4 |
| Receipt | tech and product companies | the amount and due date as the opening line, a pay-online link, quiet grey labels | Inter |
| Studio | creative agencies and studios | a full-width band in the brand colour with the studio's name set large, numbered project phases, the balance due set very large | Bricolage Grotesque with Instrument Sans |
| Folio | coaches, tutors, photographers, personal services | a warm serif voice, hours × rate, a named discount, the total in a soft panel, a personal note | Fraunces |
| Source | developers and technical freelancers | a grey details column down the left like a spec sheet, weekly time entries, figures in a monospaced face | IBM Plex Sans with IBM Plex Mono |
| Plain | any business, anywhere | the quietest and most legible; shown for a Ghanaian supplier in cedis with two taxes (sample rates) and mobile money | Public Sans |

All fonts are open-licence and embedded in the PDF, so a document looks the same on every machine.

---

## What the mocks taught about the PDF engine

Rendered with headless Chromium (Playwright 1.56) from HTML and CSS:

- **Page breaks behaved.** On a 22-line invoice the table headings repeated on page 2, no line was split across pages, the totals and payment block stayed together, and the footer numbered the pages "1 of 2".
- **Per-page footers are limited.** Chromium's footer feature cannot use the document's own web fonts: a footer that tried to embed one printed nothing, so the legal footer falls back to a system serif. A spike criterion.
- **Content cannot sit in the page margin.** A footer placed in the margin with CSS pushed itself onto a second page.
- **Fonts must be local.** With fonts loaded from files and the browser waiting for them, every mock rendered with its intended faces.

These feed the PDF engine spike (`HANDOVER.md`, next tasks).
