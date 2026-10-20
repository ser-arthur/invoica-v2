# Domain language

The words Invoica uses for its domain, and what each one means. Code, UI text and docs use these words and no others. When a new term is needed, it is added here first.

Started 18 October 2026 from the foundation and the Phase 0 audit; template terms added the same evening from Kobby's v1 answer. Terms marked **proposed** follow from the foundation's rules but are not yet decided; terms marked **[Placeholder]** wait on an answer from Kobby, and on a current official source where tax or law is involved.

The last line of each entry maps the term to the current app, so the characterisation tests and any data import can translate.

---

## People and accounts

**Organisation.** The business that uses Invoica: it issues documents, has clients and owns every record. Every row of customer data belongs to exactly one organisation, and the database enforces it. An organisation has a legal name, address, tax registration details, a base currency and a time zone.
*Current app:* there is no organisation. `user` plays the part, and `company_details` holds the profile.

**Member.** A person who signs in and acts for an organisation. A member has a role in each organisation they belong to. **Proposed:** one person may be a member of more than one organisation. **[Placeholder: the roles, for example owner, admin, staff, accountant.]**
*Current app:* `user`; one user is one business.

**Client.** A person or business the organisation bills. A client belongs to one organisation. Client details are copied into each document's snapshot when the document is issued, so later edits to the client never change an issued document.
*Current app:* `client`. Clients are created from the client form (name unique per user) or from the invoice editor (no uniqueness check).

**Client field.** An extra labelled value kept on a client, such as a tax number or purchase order reference.
*Current app:* `client_custom_field`.

---

## Documents

**Document.** Anything Invoica issues to a client and numbers: an invoice or a credit note now; a quote later. Every document moves through the document states below, and once issued it never changes.

**Invoice.** A document asking a client to pay an amount by a due date.
*Current app:* `invoice`, editable at any time in any status.

**Credit note.** A document that reduces the amount a client owes on an issued invoice, or records money returned. Corrections to an issued invoice are made with a credit note, never by editing the invoice. A credit note credits the whole invoice, quantities of its lines, an amount, or everything still owed; its figures are worked out slot by slot, a slot being each place the invoice's tax was worked out (`docs/specs/credit-notes.md`). **[Placeholder: whether credit notes share the invoice number sequence or have their own.]**
*Current app:* does not exist.

**Quote.** A document offering work at a price before any invoice. Listed in the foundation's "Beyond" ideas; not in scope until decided.
*Current app:* does not exist.

**Line.** One row on a document: a description, a quantity, a unit price, and the tax rate it uses. A line stores the tax rate it used.
*Current app:* `line_item`. No tax on the line; quantity is an integer column.

**Item.** A saved product or service the organisation reuses on lines (name, default description, default unit price, default tax rate). Listed in the core loop (foundation section 10).
*Current app:* does not exist.

**Template.** A layout for issued documents: how the parts of a document are arranged and typeset across pages. v1 has three: a professional one, a more expressive one, and a signature Invoica one. Every template renders from the same snapshot.
*Current app:* "styles" (`modern`, `creative`, `monochrome`), chosen on the preview page.

**Brand settings.** The organisation's logo, brand colour and the choice of which blocks a document shows (bank details, mobile money, terms, notes). Applied by every template.
*Current app:* a colour picker (remembered in the browser's local storage) and block toggles (not remembered) on the preview page; neither is saved with the invoice or the account.

**Line style.** How a line is shown on a document: amount only, quantity × unit price, hours × rate, or a dated entry. The line always stores a quantity and a unit price whatever its style.

**Supply date.** The date the goods or services were provided, or the period they cover. UK invoices must show it; it can differ from the issue date.
*Current app:* not recorded.

**Project summary.** An optional short paragraph at the top of a document saying what the work was.

**Deposit.** A payment received before the final invoice, shown on it as taken off the total to give the balance due.

**Snapshot.** The frozen copy of everything an issued document shows: its lines, prices, tax rates, totals, and both parties' details. The PDF is generated from the snapshot and kept.
*Current app:* does not exist. Previews and PDFs read live data.

**Document number.** The identifier printed on a document. Numbers run in sequence per organisation, without gaps, and are assigned at the moment of issue inside a database transaction. A voided document keeps its number. **[Placeholder: the number format, and whether the organisation chooses a prefix.]**
*Current app:* `invoice_number`, suggested when the form opens as `INV-` plus three digits, and editable at any time.

**Payment terms.** The organisation's standard rule for when payment is due. **Proposed:** terms set the due date (for example, a number of days after the issue date), and can be changed per document before issue. **[Placeholder: whether terms are a number of days, free text, or both.]**
*Current app:* `payment_terms_text`, free text printed on the invoice; due dates are typed by hand.

---

## Document states

A document is in exactly one state. Every transition is explicit, tested and logged.

| State | Meaning |
| --- | --- |
| **Draft** | Being prepared. No number yet, freely editable, not visible to the client. |
| **Issued** | Final. Numbered, snapshotted, immutable. |
| **Sent** | Issued and delivered to the client (by email or another recorded channel). |
| **Part paid** | Issued, with at least one payment recorded and a balance above zero. |
| **Paid** | Payments recorded equal the total. |
| **Credited** | Closed by credit notes alone; nothing was received. |
| **Settled** | Closed by payments and credit notes together. |
| **Void** | Cancelled after issue, before any payment or credit note. Keeps its number and its snapshot; nothing is owed. |

A credit note alone does not make an invoice part paid: with nothing received, a part-credited invoice keeps its own state (issued or sent) with a lower balance. Credit notes cannot be voided.

**Overdue.** Not a state. A document is overdue when it is issued, has a balance above zero, and its due date is before today's date in the organisation's time zone. It is derived every time it is shown and never stored.

*Current app:* statuses `Draft`, `Pending` (the de facto issued state), `Paid`, and `Sent` (seed data only). Overdue is derived, but only from `Sent`, so invoices created in the app never show as overdue.

---

## Money

**Amount.** A sum of money: an integer number of minor units together with an ISO 4217 currency code. Never a floating-point number.
*Current app:* floats with no rounding.

**Minor unit.** The smallest unit of a currency as ISO 4217 defines it: pence for GBP, pesewas for GHS, cents for USD. Some currencies have no minor unit in use (for example XOF), and the money module knows each currency's exponent.

**Currency.** The currency a document is issued in. A document has one currency.

**Base currency.** The organisation's reporting currency, used to show totals across documents in different currencies.
*Current app:* `company_details.base_currency`.

**Exchange rate.** The rate used to express an amount in another currency, stored with the date it applies to and its source. An old document is never recomputed at today's rate.
*Current app:* fetched live, never stored; a missing rate counts the amount as zero.

**Money module.** The one place that does money arithmetic: adding, multiplying by a quantity or rate, rounding, and splitting an amount across parts without losing a minor unit. It owns the single rounding rule.

**Rounding rule.** How an exact result becomes a whole number of minor units. **[Placeholder: the rule, and whether tax rounds per line or per document. Recorded as a decision, then tested.]**

**Subtotal.** The sum of a document's line amounts before discount, charges and tax.

**Discount.** A reduction of the amount charged. **[Placeholder: per line, per document, or both; and its order relative to tax. Today it is one amount off the whole invoice, before tax.]**

**Shipping.** A charge for delivery added to a document. **[Placeholder: whether it stays a separate field or becomes an ordinary line; and how it is taxed. Today it is one amount, added before tax, so it is taxed.]**
*Current app:* `shipping_charge`.

**Tax rate.** A named percentage of tax, versioned by the dates it applies between. Each line stores the rate it used. The document shows the tax's real name (VAT is one tax among several) and the exact rate. Organisations create their own; UK and Ghana presets are researched and loaded ready (`docs/decisions/0004-launch-market.md`).

**Tax group.** Several tax rates applied to a line together, each shown separately on the document.

**Compound tax.** A tax charged on the price plus another tax already applied.

**Tax-inclusive price.** A price that already contains its tax; the tax amount is worked out from it. The organisation chooses whether its prices include tax or have tax added.

**Tax registration.** Whether an organisation is registered for VAT or another sales tax, and its tax number. An organisation that is not registered charges no tax.
*Current app:* one `vat_rate` per invoice, stored as a fraction (seed data stores a percentage), printed as `VAT` with the rate truncated to a whole number.

**Tax amount.** The tax due on a line or a document, in minor units, computed by the money module.
*Current app:* `vat_amount`.

**Total.** What the client is asked to pay: subtotal, less discounts, plus charges, plus tax. It always equals the sum of its parts as printed.
*Current app:* `total_incl_vat`.

**Balance.** What is still owed on an issued document: its total, less payments (net of refunds) and credit notes applied to it.
*Current app:* not tracked; an invoice is either paid in full or not.

**Outstanding.** The sum of balances on issued documents that are not paid or void, for a client or the organisation. One definition, used on every screen.
*Current app:* three different definitions (`docs/audit.md`, section 3.6).

---

## Payments and cash flow

**Payment.** Money received against one or more documents: an amount, a date, a method, and a reference. Recording a payment is idempotent: a repeated request or a double click never records it twice. Paid and part paid are derived from payments, less refunds. A payment, a deposit and a refund are dated on or before today in the organisation's time zone, never after.

**Refund.** Money paid back to a client with a credit note above the balance owed: exactly the part above it (`docs/specs/refunds.md`).
*Current app:* no payment records; "mark as paid" sets a status and sometimes a date.

**Payment date.** The calendar date the money was received, in the organisation's time zone.
*Current app:* `paid_date`, the instant of the click, and only on one of three paths.

**Payment method.** How the money arrived, for example bank transfer, card or mobile money. **[Placeholder: the list for the launch market.]**

**Expense.** Money the organisation spends, recorded with an amount, date, category and supplier. Part of cash flow (foundation section 10, step 3).
*Current app:* does not exist.

**Cash position.** The money the organisation holds at a date, derived from records (payments in, expenses out, and bank data once imported).
*Current app:* does not exist.

**Invoiced this month.** The totals of invoices issued this month, less the totals of credit notes issued this month, per currency. Drafts and void invoices are not counted. When credit notes were issued this month, the dashboard labels it "Net invoiced this month" and shows what was invoiced and what was credited beneath it.

**Forecast.** A projection of future cash position from records and stated assumptions. A forecast always states its assumptions and shows them on screen.

**Assumption.** A stated rule a forecast relies on, for example "clients pay on the due date".

---

## Dates and time

**Business date.** A plain calendar date with no time, in the organisation's time zone: issue date, due date, payment date.

**Issue date.** The business date a document is issued.
*Current app:* `invoice_date`, a timestamp whose stored value depends on the database's time zone.

**Due date.** The business date by which payment is expected.
*Current app:* `due_date`, already a plain date.

**Instant.** A moment in time, stored in UTC: when a record was created, when a document was sent, when a member signed in.

**Organisation time zone.** The time zone the organisation's business dates are in. "Today" for overdue, and month boundaries for dashboards, use it.

---

## Records

**Audit log entry.** An append-only record of who did what, to which record, and when. Entries are never edited or deleted.

**Retention period.** How long a kind of record must be kept before it may be deleted. **[Placeholder: periods to confirm for the launch market.]**

**Export.** A complete copy of an organisation's data, as CSV and JSON, that a member can download.

---

## Words not to use

| Avoid | Use | Why |
| --- | --- | --- |
| user (for the business) | organisation | the business and the people who sign in are different things |
| company details | organisation profile | |
| Pending, Unpaid | issued, sent, or "has a balance" | the current app's Pending covers several states |
| VAT (for any tax) | tax, or the tax's real name | VAT is one tax |
| total_incl_vat | total | |
| paid (as a stored flag) | payments, balance | paid is derived |
| lifetime value | paid to date | says what is counted |
