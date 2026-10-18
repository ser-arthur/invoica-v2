# Phase 0 audit of the current Invoica app

Read-only audit of the code at commit `a0ef5cb` (main, 30 March 2026), carried out on 18 October 2026. No application code was changed. This file is written once and then kept for reference; later changes to the plan belong in `docs/decisions/` and `docs/HANDOVER.md`.

Contents:

1. Scope and method
2. Inventory
3. Behaviour that must survive, with worked examples
4. Issues
5. What is worth keeping
6. Recommendations
7. Characterisation tests to write next
8. What this audit could not check

---

## 1. Scope and method

**What was read.** The code under version control: `app.py` (2,128 lines, every route), `models.py`, `utils/filters.py`, `seed.py`, both migrations, `vercel.json`, `package.json`, `requirements.txt`, `tailwind.config.js`, and the 23 templates. Every money, status, date and data path in the templates was read in full, including the Alpine.js components in `templates/base.html`; marketing and layout markup was skimmed. The git history (7 commits, 16 to 30 March 2026) and the untracked files in the project folder were checked too.

**What was run.** The app was run from a clean copy of the repository (no `.env`, so no production credentials were loaded) against throwaway local databases: PostgreSQL 16 for the main runs, because production uses Postgres, and SQLite for comparison, because that is the local default. It was driven through Flask's test client with the same form fields the browser sends. The editor's JavaScript money code was run in Node 22, which uses the same engine as Chrome, by loading the exact lines from `templates/base.html`. Every figure marked *measured* came from those runs; figures marked *computed* came from running the app's own formatting code on the stated values. The scripts and their raw output are in `docs/audit/evidence/`, with instructions to repeat them.

**How it was checked.** A separate reviewer, which had not written the audit, checked it against the code and the raw output and re-ran a sample of the measurements. It checked 346 individual claims and found 29 problems; every one has been corrected in this version, and the extra measurements it asked for are in `docs/audit/evidence/output/extras.txt`.

**Repository state.** Local `main` and the last-fetched `origin/main` are the same commit, and the working tree matches it. In the project folder and outside version control: `Archive.zip` (19.6 MB, a copy of the project including `.env`), `.env`, `.venv/`, `.idea/`, `__pycache__/` and `.DS_Store` files. Git history holds no secrets (searched for database URLs, keys and secret values).

**Live site.** `invoica-io.vercel.app` was opened read-only on 18 October 2026. It is live, accepts sign-ups, and its Privacy Policy and Terms of Service links point to `#`.

---

## 2. Inventory

### 2.1 Stack

| Layer | What it is |
| --- | --- |
| Server | Python, Flask 3.1, Flask-Login, Flask-WTF (CSRF only), Flask-SQLAlchemy 3.1 on SQLAlchemy 2.0, Flask-Migrate (Alembic) |
| Database | PostgreSQL on Neon, AWS `us-east-1` (from the host name in `.env`; credentials not read out). SQLite at `instance/app.db` when `DATABASE_URL` is unset |
| Pages | Jinja templates rendered on the server, with Alpine.js 3 components for interactivity |
| Styling | Tailwind CSS 3. The built file `static/css/output.css` is committed. `package.json` has a `vercel-build` script, but with the legacy `builds` config in `vercel.json` it is not clear that it runs |
| Browser libraries | Alpine.js, Alpine Collapse, Chart.js 4.4.2, AOS and Lucide, loaded from public CDNs. flatpickr's stylesheet loads but its script tag is commented out (I-M13). Fonts from Google Fonts |
| PDF | PDFShift (hosted HTML to PDF service), called on each download |
| Exchange rates | ExchangeRate-API v6, called on dashboard and list pages |
| Email | Flask-Mail is configured; nothing sends mail |
| Hosting | Vercel, legacy `builds` config with `@vercel/python`; every path routes to `app.py` |

### 2.2 Screens and features

| Route | Screen or action | What it does now |
| --- | --- | --- |
| `GET /` | Home (marketing) | Redirects signed-in users to the dashboard |
| `GET /pricing` | Pricing (marketing) | Three plans in dollars: Starter free, Growth $4.99 a month, Scale $19.99 a month. No billing exists |
| `GET /help` | Help centre | Static page. Mentions live chat, Stripe, PayPal, 2FA, GDPR and data exports, none of which exist |
| `GET, POST /register` | Sign up | Username, email, password (6 characters minimum). Signs in and sends to business setup |
| `GET, POST /login` | Sign in | Email and password |
| `GET /logout` | Sign out | |
| `GET, POST /business/settings` | Business details | Name, logo upload, website, email, phone, address, tax ID, business type, bank details, mobile money (MoMo) details, merchant code, payment terms text, base currency. Required before the first invoice |
| `GET /dashboard` | Dashboard | Three figures (Total owed to you, Paid last 30 days, Overdue invoices), a six-month income chart, recent invoices with status filter |
| `GET /invoices` | Invoice list | Three figures (Total billed, Outstanding, Paid last 30 days), search, status filter, 10 per page, mark as paid |
| `GET, POST /invoice/create` | Invoice editor | Client (pick existing or type a new one, with custom fields), number, issue and due dates, currency, line items, discount, shipping, tax rate, live preview, save as draft or save and preview |
| `GET, POST /invoice/edit/<id>` | Invoice editor | Same form for any saved invoice, whatever its status |
| `POST /preview_unsaved_invoice` | Preview before saving | Renders the invoice from the editor's own figures |
| `GET /invoice/<id>` | Invoice preview | Three designs (modern, creative, monochrome), colour picker, toggles for bank, MoMo and terms blocks, PDF download, send button |
| `GET /invoice/<id>/download` | PDF | Renders HTML, sends it to PDFShift, streams the PDF back. Nothing is stored |
| `POST /invoices/<id>/send_email` | Send by email | Body is `pass`, so it fails with a server error |
| `POST /api/invoice/<id>/mark-paid` | Mark paid | Sets status Paid and the paid date. Used by the invoice list |
| `POST /invoice/<id>/mark_paid` | Mark paid (older) | Sets status Paid without a paid date. No page calls it, but it still answers |
| `GET /clients` | Client list | Search, sort, figures (total clients, with unpaid, top client, repeat clients), a quick-view modal |
| `GET, POST /clients/new`, `/clients/edit/<id>` | Client form | Name (unique per user), contact and address fields, notes, custom fields |
| `GET /client/<id>` | Client detail | Lifetime value, outstanding, invoice count, invoice history |
| `POST /clients/delete/<id>` | Delete client | Refused while the client has invoices. Invoices cannot be deleted or voided, so in practice a client with an invoice stays forever |
| `GET, POST /account/settings` | Account | Change username, email, password; delete account (deletes everything at once) |
| CLI `flask seed` | Seed data | Wipes every table, then creates three demo accounts |

Not present at all: quotes, credit notes, recurring invoices, reminders, partial payments, expenses, time tracking, client portal, teams or members, an API, online payment, password reset, email verification, multi-factor sign-in, data export, audit log. The home and pricing pages advertise several of these (section 4, I-M5).

Unused files: `templates/client_details.html`, `templates/welcome.html`, both email templates (only referenced from commented-out code).

### 2.3 Data model

Six tables. Every amount is a `float` (double precision in Postgres).

```
user 1 ──── 0..1 company_details
user 1 ──── * client 1 ──── * client_custom_field
user 1 ──── * invoice * ──── 1 client
invoice 1 ──── * line_item
```

| Table | Fields | Constraints and notes |
| --- | --- | --- |
| `user` | id, username, email, password_hash | username and email unique (case-sensitive) |
| `company_details` | id, user_id, company_name, company_logo (path), website, email, phone, address lines 1 and 2, city, state_province, postcode, country, tax_id, business_type, bank_name, bank_account_name, bank_account_number, bank_sort_code, momo_account_name, momo_number, merchant_code, base_currency, payment_terms_text | one per user. `base_currency` exists in the model, not in the migrations (I-H9) |
| `client` | id, user_id, name, email, phone, address lines, city, state_province, postcode, country, notes | no uniqueness in the database; the client form checks the name, the invoice form does not |
| `client_custom_field` | id, client_id, label, value | free label and value pairs |
| `invoice` | id, user_id, client_id, invoice_date (timestamp), due_date (date), paid_date (timestamp), notes, status (text, 20), invoice_number (text, 500), vat_rate, vat_amount, shipping_charge, discount_amount, subtotal, total_incl_vat (all float), currency_code (text, 10) | unique (user_id, invoice_number). Model defaults: status `Unpaid`, currency `GHS` |
| `line_item` | id, invoice_id, description, quantity (integer), unit_price (float) | no line total stored; no tax per line; no organisation id |

There is no organisation table. The user is the account: every business record hangs off `user_id`.

### 2.4 Integrations

| Service | Used for | Data sent | Where in code |
| --- | --- | --- | --- |
| Neon Postgres (AWS us-east-1) | All data | Everything | `app.py:60-83` |
| PDFShift | PDF on download | Full invoice HTML: both parties, lines, bank and MoMo details | `app.py:413-492` |
| ExchangeRate-API | Converting totals to the base currency | Base currency code | `app.py:136-165` |
| jsDelivr, unpkg | Browser scripts and styles, unpinned for Alpine (`3.x.x`), the flatpickr stylesheet (no version) and Lucide (`latest`) | Visitor IP | `templates/base.html:16-23` |
| Google Fonts | Fonts on every page | Visitor IP | `templates/base.html:9-14` |
| i.pravatar.cc, svgrepo.com | Decorative images on the sign-in and sign-up pages | Visitor IP | `templates/register.html:113-115`, `login.html:74` |
| cdn.tailwindcss.com, Google Fonts | Scripts and fonts injected into PDF HTML | | `app.py:441-456` |
| ui-avatars.com | Avatar images | The username, and client names on the client pages and modal | `templates/base.html:248`, `368`; `clients_list.html:193`; `client_detail.html:25`, `87`; `create_edit_client.html:180`, `357` |

### 2.5 Background jobs

None. PDF generation and exchange-rate calls happen inside the web request, with no timeout on either call.

### 2.6 Environment variables (names only)

Read by the code: `DATABASE_URL`, `SECRET_KEY`, `PDF_API_KEY`, `EXCHANGE_RATE_API_KEY`, `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USE_TLS`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_DEFAULT_SENDER`.

Present in the local `.env`: the first four. There is no `.env.example`.

### 2.7 Deployment

- `vercel.json` uses the legacy `builds` key: `app.py` with `@vercel/python`, all routes to `app.py`, so Flask also serves `/static`.
- `package.json` defines `vercel-build` to build the Tailwind CSS. Whether Vercel runs it under the legacy `builds` config is unconfirmed; the built file is committed anyway. `package.json` also lists Puppeteer 24.10.2 as a runtime dependency although nothing uses it, plus more than 90 of Tailwind's own sub-dependencies listed by hand.
- Vercel functions have a read-only file system with a writable `/tmp` scratch space ([Vercel runtimes documentation](https://vercel.com/docs/functions/runtimes), updated 12 August 2026). The logo upload writes to `static/uploads/logos`, so in production it most likely fails. To confirm on the live site.
- The function region is not set in the repo. Unless it was set in the Vercel dashboard (unchecked, section 8), Vercel's default applies: `iad1`, Washington DC, per the same page. The database is in `us-east-1`.
- Migrations exist, but a database built from them does not match the models (I-H9). How the production schema was built is unknown.

### 2.8 Tests, CI and tooling

No tests of any kind, no CI workflow, no linter or formatter config, no type checking. Seed data exists (`seed.py`) and is useful.

---

## 3. Behaviour that must survive, with worked examples

Each rule below says what the current code does, where, and a worked example from the code. The last column of each summary table proposes how the new build treats it: **keep**, **change** (a bug, to be fixed on purpose and recorded) or **decide** (a business or tax rule that needs Kobby's answer and, for tax, a current official source for the launch market).

All amounts below are pounds unless stated. "Editor" means the live figures in the invoice editor (browser). "Saved" means what is written to the database. "Invoice" means the server-rendered preview, which is also what the PDF is made from.

### 3.1 The money calculations

There are four separate implementations of the totals, written independently:

| Where | Lines | Used for |
| --- | --- | --- |
| Server, `parse_invoice_form` | `app.py:357-362` | What is saved |
| Editor, Alpine getters | `templates/base.html:1007-1017` | Live figures while editing, the mobile total bar, the unsaved preview |
| Templates, per line | `templates/partials/*.html` (for example `invoice_template_modern.html:97-99`) | Line totals on the invoice and PDF, never stored |
| Seed, `calculate_invoice_totals` | `seed.py:16-22` | Demo data |

A fifth copy, `subtotal_adjusted` in `prepare_invoice_data_for_template` (`app.py:587`), recomputes the tax base without the floor at zero. No template reads it.

**Server formulas (what is saved):**

```
line amount       = quantity × unit_price                    (float, not stored)
subtotal          = Σ line amounts
tax base          = subtotal + shipping − discount, floored at 0
vat_amount        = tax base × vat_rate                      (vat_rate stored as a fraction, 0.2 for 20%)
total_incl_vat    = tax base + vat_amount
```

No step rounds. The stored values are raw doubles.

**Editor formulas:**

```
subtotal      = Σ parseFloat(quantity) × parseFloat(unitPrice)
vatAmount     = max(0, subtotal + shipping − discount) × vatRate / 100     (vatRate held as a percentage, 20)
totalWithVat  = subtotal + shipping − discount + vatAmount                 (no floor)
```

On submit the editor sends `discount` and `shipping` rounded to 2 decimals, the tax rate as `(vatRate / 100).toFixed(4)`, and the line items unrounded (`base.html:1323-1327`). The server recomputes from those.

**Seed formulas:** as the server, except the tax rate is stored as a percentage (`20.0`), so seeded invoices and app-created invoices hold the rate in different units.

| Rule | Current behaviour | New build |
| --- | --- | --- |
| Line amount | quantity × unit price, unrounded, recomputed wherever shown | keep the formula; decide rounding (per line or per invoice) |
| Discount | a single amount off the whole invoice, applied before tax | decide (and confirm the tax treatment for the launch market) |
| Shipping | a single amount added before tax, so it is taxed | decide (and confirm) |
| Tax | one rate for the whole invoice, applied to (subtotal + shipping − discount) | decide; the foundation requires a stored rate per line |
| Floor at zero | server and seed floor the tax base and total at 0; the editor floors only the tax base | change: one rule, in the core |
| Rounding | none in storage; display rounds, and server and browser round differently (3.2) | change: integer minor units, one rounding rule |
| Units of the tax rate | fraction in app data, percentage in seed data and in the editor | change |

#### Worked example W1: two lines at 20% (measured)

Lines: 3 × 33.33 and 1 × 10.00. Tax 20%. No discount or shipping.

| Step | Editor | Saved | Invoice |
| --- | --- | --- | --- |
| Subtotal | £109.99 | 109.99 | £109.99 |
| Tax | £22.00 | 21.998 | VAT (20%) £22.00 |
| Total | £131.99 | 131.988 | £131.99 |

The saved total is 131.988, a value no invoice can show. Every dashboard sum adds these raw values.

#### Worked example W2: a rounding tie at 5% (measured)

One line: 1 × 12.50. Tax 5%.

| Step | Editor | Saved | Invoice and PDF |
| --- | --- | --- | --- |
| Subtotal | £12.50 | 12.5 | £12.50 |
| Tax | **£0.63** | 0.625 | **£0.62** |
| Total | **£13.13** | 13.125 | **£13.12** |

The person creating the invoice is shown £13.13. The invoice they send says £13.12.

#### Worked example W3: 17.5% on £13.00 (measured)

| Step | Editor | Saved | Invoice and PDF |
| --- | --- | --- | --- |
| Subtotal | £13.00 | 13.0 | £13.00 |
| Tax | £2.28 | 2.275 | VAT (17%) £2.27 |
| Total | £15.28 | 15.275 | £15.28 |

The invoice reads £13.00 + £2.27 = £15.28, which does not add up. The rate also prints as 17% (3.3).

#### Worked example W4: discount larger than the subtotal (measured)

One line 1 × 100.00, discount 150.00, tax 20%.

| Step | Editor | Saved | Invoice |
| --- | --- | --- | --- |
| Subtotal | £100.00 | 100.0 | £100.00 |
| Discount | | 150.0 | − £150.00 |
| Tax | £0.00 | 0.0 | £0.00 |
| Total | **−£50.00** | **0.0** | **£0.00** |

#### Worked example W5: shipping and discount (measured)

Lines 2 × 50.00, shipping 10.00, discount 20.00, tax 20%.

Tax base = 100 + 10 − 20 = 90. Tax = 18.00. Total = 108.00. Editor, saved and invoice agree. This pins the current order: shipping is taxed, the discount comes off before tax.

#### Worked example W6: fractional quantities (measured on Postgres and SQLite)

Lines: 1.5 hours × 40.00 and 0.4 × 100.00. No tax.

| | Editor | Saved on Postgres | Invoice on Postgres | Saved on SQLite |
| --- | --- | --- | --- | --- |
| Line 1 quantity | 1.5 | **2** | 2 × £40.00 = £80.00 | 1.5 |
| Line 2 quantity | 0.4 | **0** | 0 × £100.00 = £0.00 | 0.4 |
| Total | £100.00 | 100.0 | £100.00 | 100.0 |
| Reopened in the editor | | | **£80.00** | £100.00 |

`line_item.quantity` is an integer column (`models.py:207`). The total is computed before saving, from 1.5 and 0.4, then Postgres rounds the quantities. The invoice shows lines that add up to £80.00 under a total of £100.00. Opening it to edit shows £80.00, and saving is then refused, because the second line's quantity is now 0, which both the editor and the server reject (measured: "Item 2: Quantity must be greater than zero"). The invoice cannot be saved again until its quantities are retyped. Local development on SQLite stores 1.5, so none of this shows there.

#### Worked example W7: editing an invoice cuts its tax rate by 100 (measured)

Take W1 (20%, total £131.99) and open it in the editor without changing anything, then save.

| | Value |
| --- | --- |
| Rate passed to the editor (`app.py:1097`) | `0.2` (the stored fraction) |
| Editor shows | Tax (0.2%) £0.22, total £110.21 |
| Rate sent on save | `0.0020` |
| Saved before | vat_rate 0.2, vat_amount 21.998, total 131.988 |
| Saved after | vat_rate 0.002, vat_amount 0.21998, total 110.20998 |
| Invoice after | VAT (0%) £0.22, total £110.21 |

The editor treats the rate as a percentage; the server stores a fraction. Every save of an existing invoice divides the rate by 100 again. The same happens when a save fails validation and the form is shown again (`app.py:976`). Seeded invoices hold their rate as 20.0, so they print as "VAT (2000%)" and survive their first edit, which stores 0.2. The second edit divides by 100 like any other (measured: 20% then 0.2%, total £10,200.00 then £8,517.00).

### 3.2 Display rounding

| Where | Method | Example |
| --- | --- | --- |
| Server templates and PDF | Python `f"{value:,.2f}"` on the exact binary value (`utils/filters.py:33`) | 0.625 → 0.62; 2.275 (stored as 2.27499999…) → 2.27 |
| Editor and list pages | Browser `Intl.NumberFormat`, which (measured in Chrome's engine) rounds the shortest decimal form half up | 0.625 → 0.63; 2.275 → 2.28 |

Consequences:

- W2 and W3 above (measured).
- Three invoices with a stored total of 15.275 each show as £15.28 in the list, while a figure summing them shows £45.83. A reader adding the rows gets £45.84 (computed with both formatters).

| Rule | Current | New build |
| --- | --- | --- |
| Rounding mode | depends on which code path displays the value | change: one rule in the money module, applied once when an amount is computed, never at display |

### 3.3 Tax rate label

The invoice prints `int(vat_rate × 100)` (`invoice_template_modern.html:129` and the other two designs). Measured:

| Rate entered | Stored | Label printed |
| --- | --- | --- |
| 20% | 0.2 | VAT (20%) |
| 15% | 0.15 | VAT (15%) |
| 17.5% | 0.175 | VAT (17%) |
| 12.5% | 0.125 | VAT (12%) |
| 21.9% | 0.219 | VAT (21%) |
| 29% | 0.29 | VAT (28%) |
| 20% (seed data) | 20.0 | VAT (2000%) |

The label always says VAT, whatever the tax. | New build: change. The rate is stored per line with its name and printed exactly.

### 3.4 Invoice numbering

Two different rules, plus free editing:

1. **Suggested number on a new invoice** (`app.py:1116-1136`): find every number matching `INV-<digits>` at the start, take the largest first run of digits, add one, format as `INV-` plus at least three digits.
2. **Fallback when the number arrives empty** (`app.py:886-912`, reachable only by a direct request because the editor requires a number): match `<anything>-<digits>`, take the largest, reuse that invoice's prefix.
3. The number field unlocks with one click and saves whatever is typed. Numbers can also be changed on any saved invoice.

Worked example N1 (measured, one account, in order):

| Existing numbers | Suggested next | Fallback rule would give |
| --- | --- | --- |
| none | INV-001 | |
| INV-2024-005 | **INV-2025** | |
| INV-2024-005, PH-010 | INV-2025 | **PH-011** |
| seed INV-1001 to INV-1008 | INV-1009 | |

Saving a number that already exists: the database constraint stops the duplicate, the user sees the raw database error including the SQL statement (I-M3), and the form is lost (redirect to a blank editor).

The number is worked out when the form is opened, outside any transaction, so two invoices saved at the same time get the same suggestion and the second fails. Nothing guarantees a sequence without gaps, and nothing records a voided number, because voiding does not exist.

| Rule | Current | New build |
| --- | --- | --- |
| Format | `INV-` + at least 3 digits, user-editable | decide the format (and whether the user may set a prefix); confirm what the launch market requires |
| Assignment | suggested at form open, editable, changeable after issue | change: assigned at issue inside a transaction, per organisation, no gaps, never edited |
| Uniqueness | per user, enforced by the database | keep (per organisation) |

### 3.5 Statuses

Values written by the code, in practice:

| Status | Written by |
| --- | --- |
| `Draft` | "Save as draft" |
| `Pending` | "Save and preview" and "Save invoice". This is the de facto "issued" state |
| `Paid` | "Mark as paid" in the invoice list (sets the paid date too). Also two paths no page uses: the older route (no paid date), and a hand-made form request with status Paid (no paid date) |
| `Sent` | seed data only. Nothing in the app sets it, because sending does not work |
| `Unpaid` | the model default; never written in practice |
| anything | a hand-made request: the server accepts any text up to 20 characters (measured: `Banana` saved) |

**Overdue is derived and never stored** (`models.py:170-183`), which is the right idea, but it only applies to status `Sent`:

```
computed_status = 'Paid'    if status == 'Paid'
                  'Overdue' if status == 'Sent' and due_date < today (server date)
                  status    otherwise
```

Worked example S1 (measured): an invoice saved through the editor on 1 August 2026, due 31 August 2026, checked on 18 October 2026.

| Check | Result |
| --- | --- |
| Saved status | Pending |
| Computed status | **Pending** (not overdue, 48 days past due) |
| Dashboard "Overdue invoices" | **0** |
| Dashboard "Total owed to you" | £500.00 (Pending counts as owed) |
| Mark as paid from the list | Paid, paid date set |
| Then open it in the editor and save | **Pending again, paid date kept** |
| A hand-made form request with status `Paid` (the editor never sends Paid) | Paid, **no paid date** |
| The older mark-paid route (no page calls it) | Paid, **no paid date** |

Transitions today: every save from the editor sets Draft or Pending, whatever the invoice's status was, so a paid invoice returns to Pending when it is saved. A hand-made request can set any text. Nothing is logged.

| Rule | Current | New build |
| --- | --- | --- |
| Overdue derived from the due date | yes, only for `Sent` | keep the derivation, apply it to every unpaid issued document, in the organisation's time zone |
| Paid date | set by one of three paths | change: a payment record carries its date; paid is derived from payments |
| Editing after issue | allowed, including paid invoices | change: issued documents are immutable; corrections by credit note |

### 3.6 Dashboard and list figures

Each figure, its rule and its code. "Converted" means divided by today's exchange rate (3.7).

| Figure | Page | Rule | Converted | Code |
| --- | --- | --- | --- | --- |
| Total owed to you | Dashboard | sum of totals where computed status is Pending or Overdue | yes | `app.py:1477-1480` |
| Paid (last 30 days) | Dashboard, Invoices | status Paid and paid date within the last 30 × 24 hours (UTC) | yes | `app.py:1483-1486`, `1567-1570` |
| Overdue invoices | Dashboard | count with computed status Overdue | | `app.py:1488` |
| Income chart | Dashboard | paid totals grouped by calendar month of the paid date (UTC), current month and the five before | yes | `app.py:1491-1516` |
| Total billed | Invoices | sum of totals where status is not Draft (includes Paid) | yes | `app.py:1556-1559` |
| Outstanding | Invoices | as Total owed | yes | `app.py:1561-1564` |
| Outstanding per client | Clients list, client modal | sum where raw status is Pending, Overdue or Sent | **no** | `app.py:1637` |
| With unpaid | Clients list | clients whose outstanding is above 0 | | `clients_list.html:280` |
| Top client | Clients list | client with the largest sum of Paid totals | **no** | `app.py:1683-1689` |
| Repeat clients | Clients list | clients with more than one invoice, any status | | `app.py:1679` |
| Lifetime value, Outstanding | Client detail | Paid sum; Pending, Overdue or Sent sum | **no**, and always printed as pounds | `app.py:1842-1850`, `client_detail.html:105-110` |

Three figures are computed on the server for the clients page and never shown: `total_outstanding`, `total_invoiced_lifetime` and `total_clients` (the page counts clients in the browser).

Worked example M1: the seed's demo agency account, run on 18 October 2026 (measured).

| Figure | Value |
| --- | --- |
| Dashboard, Total owed to you | £1,500.00 |
| Dashboard, Paid last 30 days | £3,000.00 |
| Dashboard, Overdue invoices | 1 |
| Invoices, Total billed | £33,240.00 |
| Invoices, Outstanding | £1,500.00 |
| Clients, outstanding per client | £8,760.00 + £1,440.00 + £1,500.00 = **£11,700.00** |
| Income chart, May to October 2026 | 0; 10,200; 3,840; 4,500; 3,000; 0 |

The same account owes £1,500 on the dashboard and £11,700 on the clients page. The dashboard leaves out the two `Sent` invoices that are not yet due; the clients page includes them.

The stress-test invoice in that data (INV-1008) pins the formula at scale: 20 × 150.00 + 5 × 250.00 + 4,500.00 = 8,750.00; + 50.00 shipping − 1,500.00 discount = 7,300.00; + 20% = 1,460.00; total 8,760.00.

| Rule | Current | New build |
| --- | --- | --- |
| What counts as owed | differs by page | change: one definition in the core, used everywhere, shown on screen |
| Totals | sums of stored floats | change: derived by queries from records, every figure traceable |

### 3.7 Currencies and conversion

- Each invoice has one currency, chosen in the editor. The account has a base currency for reporting (default GBP).
- Supported: GHS, GBP, USD, EUR, CAD, NGN, ZAR, XOF (`app.py:25-34`, repeated in `base.html:994-1003` and `utils/filters.py:8-17`). XOF shows no decimals on the server.
- Conversion (`app.py:168-182`): `amount_in_base = amount / rate`, where `rate` is today's "1 base = rate foreign" from the API. If the rate call fails, every invoice in another currency counts as **0** and a warning banner appears. If the call succeeds but one currency is missing, that invoice counts as 0 and the only trace is a log line (`app.py:181`).
- Rates are cached in memory per server instance, keyed by the hour. Nothing is stored, so last March's paid invoices are revalued at today's rate every time the dashboard loads.

Worked example C1 (measured; the rates are made up for the example). Base GBP, one client, three unpaid invoices: $125.00, GH₵1,000.00, £100.00.

| Figure | Rates unavailable | Rates USD 1.25, GHS 15.00 |
| --- | --- | --- |
| Dashboard, Total owed | £100.00 | £100.00 + £100.00 + £66.67 = £266.67 |
| Invoices, Total billed | £100.00 | £266.67 |
| Clients list, outstanding for the client | **£1,225.00** (125 + 1,000 + 100, no conversion) | £1,225.00 |
| Client detail, outstanding | **£1,225.00** | £1,225.00 |

For the seed's EUR account, with rates unavailable, every money figure on the dashboard and invoice list is €0.00 (the overdue count still shows 1) while the clients page shows €12,500.00 and €70,000.00 against two clients.

Formatting differs by page (computed with both formatters): the server prints `GH₵1,000.00`, `CFA1,000` and `£-50.00`; the browser prints `GHS 1,000.00`, `F CFA 1,000` and `-£50.00`.

| Rule | Current | New build |
| --- | --- | --- |
| Conversion | live rate, never stored, missing rate counts as zero | change: store each rate with its date and source; never recompute an old document at today's rate; a missing rate is an error shown to the user |
| Mixed currencies | summed raw on client pages | change |

### 3.8 Dates and time

- The issue date comes from the form as `YYYY-MM-DD`, is turned into midnight UTC with a time zone attached, and is stored in a `timestamp without time zone` column (`app.py:301`, `models.py:150`). Postgres converts it using the database session's time zone. Measured with the same input, 1 October 2026:

| Database session time zone | Stored | Invoice shows |
| --- | --- | --- |
| UTC | 2026-10-01 00:00 | 01 Oct 2026 |
| Europe/London | 2026-10-01 01:00 | 01 Oct 2026 |
| America/New_York | **2026-09-30 20:00** | **30 Sep 2026** |

- The due date is a plain date. That is the right type.
- The paid date is the instant of the click, sent as UTC into the same kind of column, so it is converted to the database session's zone too (measured: a click at 15:05 UTC stored as 16:05 under Europe/London). The dashboard then reads it back as if it were UTC.
- "Today" for overdue is the server's date (`models.py:177`); on Vercel that is UTC. For a UK user in summer, an invoice turns overdue at 01:00 local time.
- A new invoice defaults to today's UTC date (`app.py:1147`), so between midnight and 01:00 in a UK summer it defaults to yesterday.
- The paid-in-30-days window is the last 720 hours, not calendar days. The income chart groups by the month of the stored paid date, so with a database session in UTC, a payment marked at 00:30 BST on 1 September counts in August.
- The browser parses `2026-10-18` as midnight UTC and prints it in the viewer's local zone. Measured in Node: Europe/London prints 18 Oct 2026; America/New_York prints **17 Oct 2026**. An issue date sent to the lists as `2026-10-01T00:00:00+00:00` prints as 30 Sept 2026 in New York.
- The dashboard prints dates in the US style ("Oct 18, 2026"); every other page uses "18 Oct 2026".

| Rule | Current | New build |
| --- | --- | --- |
| Business dates | mix of timestamp and date, shifted by server and browser zones | change: issue, due and payment dates are calendar dates in the organisation's time zone |
| Instants | naive timestamps labelled UTC on output | change: stored in UTC with the zone |

### 3.9 Reminders and payment terms

No reminders exist. Payment terms are a free-text field on the business profile, printed on each invoice. One helper bolds the number of days if the text matches one exact sentence (`utils/filters.py:73-81`). Due dates are typed by hand; nothing derives them from terms. | New build: decide (terms such as "14 days" that set the due date are a common expectation).

---

## 4. Issues

Severity: **Critical**: money shown or saved wrongly today, data exposed across accounts, or live credentials at risk. Fix or contain before anything else. **High**: wrong figures, a security weakness likely to be used, or a gap that blocks a trustworthy product. **Medium**: real defects with limited reach. **Low**: tidiness and small risks.

Evidence names refer to section 3 and to `docs/audit/evidence/`.

### Critical

**I-C1. Editing an invoice divides its tax rate by 100.** `app.py:1097` and `app.py:976` hand the stored fraction (0.2) to the editor, which treats it as a percentage (`base.html:1013`, `1327`). One save without any change turns 20% into 0.2% and £131.99 into £110.21 (W7). Silent and repeatable: it hits every edited invoice with a rate above 0%.

**I-C2. Any signed-in user can read any other account's clients.** `app.py:1163` loads the client for `/invoice/create?client_id=N` without checking its owner. Client ids are sequential, so every client of every account can be listed: name, email, phone, address, notes and custom fields, all placed in the page. Measured: a second account read the first account's client email and private note. The eight other cross-account probes (view, edit, PDF and mark-paid on an invoice; view, edit and delete on a client) were refused with 404, 403 or a redirect.

**I-C3. Uploaded files go into one shared public folder under their original names, with any file type.** `app.py:693-701`. Measured locally: a second account uploading `logo.png` replaced the first account's logo; an `.html` file was accepted and then served from the app's own address as a web page. Because it is served from the app's own address, a page like that would run its script with the session of any signed-in user who opens the link, and could read their data. (The test uploaded a harmless marker page; no script was run.) On Vercel the write most likely fails because the file system is read-only (2.7), which would make logo upload broken in production; that needs confirming.

**I-C4. Live production credentials travel with the project folder.** `.env` holds a working Neon connection string with its password, the PDFShift key, the ExchangeRate-API key and the Flask `SECRET_KEY`. `Archive.zip`, untracked, holds another copy of `.env`. The folder was zipped and shared for this audit. None of it is in git history. All four should be rotated, and `Archive.zip` deleted.

### High

**I-H1. Money is floating point from end to end, with no rounding rule.** `models.py:156-161`, `208`; `app.py:357-362`; `base.html:1007-1017`. Stored totals carry values no invoice can show (131.988 in W1), and sums of them drift (3.2).

**I-H2. Four separate totals calculations disagree.** Server, editor, templates and seed (3.1). Measured differences: £13.13 in the editor against £13.12 on the invoice (W2); £2.28 against £2.27 (W3); −£50.00 in the editor against £0.00 saved (W4). Seed and app store the tax rate in different units.

**I-H3. Quantities are stored as integers.** `models.py:207`. On Postgres 1.5 becomes 2 and 0.4 becomes 0 after the total is computed, so the invoice's lines do not add up to its total, and once reopened it cannot be saved without retyping the quantities (W6). Local SQLite keeps the decimals, so development and production behave differently.

**I-H4. Statuses mean different things on different pages.** The editor writes Pending; overdue only recognises Sent, which nothing writes, so no invoice created in the app ever shows as overdue (S1). Outstanding is Pending or computed-Overdue on the dashboard, and Pending, Sent or Overdue on client pages: £1,500 against £11,700 for the same account (M1). The server accepts any status text from a hand-made request.

**I-H5. Issued and paid invoices can be changed freely.** Number, dates, client, lines, amounts, currency and status are all editable at any time. Saving a paid invoice returns it to Pending and keeps its paid date (S1). There are no credit notes, no void, and no record of who changed what.

**I-H6. Saving an invoice for an existing client deletes that client's custom fields.** The editor's client list carries no custom fields (`app.py:1219-1233`); choosing or loading a client copies the fields from that list (`base.html:1157`), so the editor sends an empty list, and the server deletes every field it did not receive (`app.py:266-269`). Measured: a client with a "VAT number" field, one invoice saved for it, and the field was gone. The server half was run; the browser half is from reading the code.

**I-H7. Currency handling gives wrong totals.** Client pages add different currencies together and label the sum with the base currency, or always with £ on the client detail page (C1). The dashboard converts at today's rate, stores nothing, and counts an invoice as zero when a rate is missing or the rate service is down.

**I-H8. A client name with an apostrophe breaks the invoice list and client detail pages.** `invoices_list.html:24` and `client_detail.html:10` place JSON marked `| safe` inside a single-quoted HTML attribute. Measured with "O'Brien Plumbing": the attribute ends at the apostrophe and the page's script fails. The same flaw would let a crafted name add attributes to the element, such as an event handler: a stored script-injection hole. (Measured: the attribute breaks; no handler was injected.) Names like O'Neill, D'Souza and "Kobby's Kitchen" are common.

**I-H9. The migrations do not build the schema the code needs.** `company_details.base_currency` is in the model and in no migration. Measured: a database built with `flask db upgrade` returns a server error on every signed-in page, and `flask db check` reports the missing column. The production schema must have been made some other way: `db.create_all()`, by hand, or a migration that ran there and was never committed. Question for Kobby (section 8).

**I-H10. No tests, no CI, no lint, no type checks.**

**I-H11. Sign-in is weak.** No rate limit or lockout (measured: 30 wrong passwords, then the right one signs in), no multi-factor option, no password reset, no email verification, a 6-character minimum. Email addresses are case-sensitive: `Erin@Example.test` and `erin@example.test` became two accounts, and signing in with the other case fails. A taken username gives a server error.

**I-H12. Invoice dates move with the database time zone, and browsers west of UTC show dates a day early.** 3.8. The stored issue and paid dates depend on the database session's zone (30 September instead of 1 October under New York time; a paid time an hour out under London time), and the dashboard reads paid dates back as UTC. In the lists, due dates and issue dates print a day early for anyone west of UTC.

**I-H13. The live site takes sign-ups with no privacy policy or terms.** Both links on `invoica-io.vercel.app` point to `#`. The app stores clients' personal data and businesses' bank details. The legal requirements depend on the launch market and must be confirmed from an official source (foundation section 6).

### Medium

**I-M1. Numbering is suggested, editable and racy.** Two different rules, the first one misreading `INV-2024-005` as 2024; numbers editable after issue; worked out outside a transaction (3.4).

**I-M2. The tax label truncates the rate.** 17.5% prints as 17%, 12.5% as 12%, 29% as 28%, and seeded invoices print 2000% (3.3). Every tax is called VAT.

**I-M3. Raw errors reach users.** `app.py:1068` shows the database error text, including the SQL statement and its parameters, as a banner (measured with a duplicate number). Business settings and mark-paid also return exception text.

**I-M4. Deleting an account deletes every invoice at once, and invoices themselves can never be deleted or voided.** `app.py:2071-2100`. How long financial records must be kept is a question for the launch market; until it is answered, permanent deletion on request is a risk, and so is the opposite.

**I-M5. The "Send" button fails, and the marketing promises features that do not exist.** `send_invoice_email` is `pass` (measured: server error). The "Continue with Google" and "Sign up with Google" buttons do nothing (`login.html:73-76`, `register.html:78-81`, `168-171`). The home, pricing and help pages promise automated reminders, time and expense tracking, recurring invoices, a client portal, team members, an API, 2FA, Stripe and PayPal, live chat and plan limits. On a public site that is a consumer-protection risk as well as a trust problem.

**I-M6. PDFs are not documents of record.** Generated on every download from live data (`app.py:413-492`), so an old invoice changes when the business details change; nothing is stored. The full invoice, including bank details, goes to PDFShift; the logo uses a relative path the service cannot load; unpinned scripts run during rendering; no timeout on the call. A wrong invoice id reports "System error generating PDF".

**I-M7. Browser scripts are unpinned and unchecked.** Alpine `3.x.x`, the flatpickr stylesheet with no version, and Lucide `latest`, with no integrity hashes and no Content Security Policy. Any change at the CDN runs on every page, including the invoice editor. Usernames and client names are sent to ui-avatars.com, and every page loads Google Fonts.

**I-M8. Tenancy is a hand-written check in each route.** The user is the tenant; there is no organisation or member model, and nothing in the database stops one account's query reading another's rows. The checks work on the routes probed except I-C2, which shows what a single miss costs.

**I-M9. Data sits in the United States.** Neon `us-east-1` and, unless it was changed in the dashboard, Vercel's default region `iad1`. Whether that is acceptable depends on the launch market. A Neon project's region cannot be changed; moving means a new project and a data migration ([Neon regions documentation](https://neon.com/docs/introduction/regions)).

**I-M10. The invoice form creates a new client every time a name is typed.** No duplicate check there (measured: three clients with the same name), while the client form refuses duplicates. Its effect on client custom fields is I-H6.

**I-M11. The contact address is on a different domain.** The live site's Contact link and the seed accounts use `invoica.com`; the foundation names `invoica.io` as the product's domain. If `invoica.com` belongs to someone else, support mail goes to them. To confirm.

**I-M12. Two hidden ways to mark an invoice paid leave no paid date.** A hand-made form request with status Paid, and the older route `POST /invoice/<id>/mark_paid` (`app.py:496-515`), which no page calls. Neither is reachable from the UI today, but both still answer, and an invoice marked paid either way never appears in "Paid (last 30 days)" or the income chart.

**I-M13. On phones, the issue and due dates have no date picker.** The phone layout uses text inputs that call `flatpickr` (`create_invoice.html:234`, `244`), and its script tag is commented out (`base.html:22`), so the picker never loads and dates must be typed as `YYYY-MM-DD`. The desktop layout uses the browser's own date input. From reading the code; not run in a phone browser.

### Low

**I-L1.** Routes answer differently for another account's records (measured on eight routes: a redirect on four, 404 on three, 403 on one), which confirms that a record exists.

**I-L2.** Sign-out is a GET request, so another site can sign a user out.

**I-L3.** Dead code and dependencies: `asyncio`, `CACHE_EXPIRATION`, the commented-out email code, Faker, Puppeteer, two unused templates, a hand-listed copy of Tailwind's sub-dependencies in `package.json`.

**I-L4.** Every list and dashboard page loads all of the account's invoices into memory and fetches each distinct client in a separate query. Harmless for small accounts; production sizes are unknown (section 8).

**I-L5.** Inconsistent formats: US dates and number style on the dashboard, British elsewhere; currency symbols and negative signs differ between server and browser (3.7).

**I-L6.** Project folder hygiene: `.venv`, `.idea`, `__pycache__` and `.DS_Store` sit inside the folder (ignored by git, but they travel in zips); two sample Unsplash photos are committed under `static/uploads/logos`.

**I-L7.** Without `SECRET_KEY`, every page returns a server error, including the public home, pricing and help pages, because the base template asks for a CSRF token (measured). The app still starts, so the failure only shows on the first request. Session cookie flags are left to defaults.

### Count

| Severity | Count |
| --- | --- |
| Critical | 4 |
| High | 13 |
| Medium | 13 |
| Low | 7 |
| **Total** | **37** |

---

## 5. What is worth keeping

Very little code should carry over as it is. The ideas and flows are worth more than the code.

**Flows and product ideas**

- The order of first use: business details, then first client, then first invoice, with a redirect that enforces the first step (no invoice or dashboard before business details). Good onboarding.
- The editor's shape: details, items and summary as steps on a phone, with a live preview beside the form on desktop and a total bar that follows the user on mobile.
- Saving a client while writing an invoice, without leaving the editor.
- Invoice designs with a brand colour and toggles for which payment blocks to show (bank, mobile money, terms). The idea, not the visuals: design starts open.
- Mobile money details on the invoice beside bank details. A real need in Ghana and much of West Africa, and a signal about the market.
- Client custom fields. Useful for client tax numbers, purchase order references and similar, which some markets require on an invoice.
- Per-invoice currency with a base currency for reporting.
- The first dashboard figures (owed, paid in the last 30 days, overdue count, monthly income) and the client figures (top client, repeat clients, clients with unpaid invoices) are a sensible starting set, once each has one definition.
- Overdue derived from the due date and never stored: the right instinct, kept in the foundation.

**Practices**

- Loading records with `filter_by(id=..., user_id=current_user.id)`: the right habit, used on nearly every route.
- CSRF protection on by default for every form and the JSON calls.
- The database constraint on invoice numbers per account.
- Connection settings for a serverless host (`pool_pre_ping`, `pool_recycle`).

**Data for tests**

- The seed's three scenarios (an empty account, an established agency with a 22-line stress-test invoice and mixed statuses, a multi-currency account) are good fixtures. They should be rebuilt on the new model with fictional names and domains under `example` (the current ones use real-looking domains).

---

## 6. Recommendations

Two draft decision records accompany this audit, for Kobby to approve, change or reject:

- `docs/decisions/0001-rewrite-strategy.md`: a fresh repository with behaviour ported across, the current app frozen and contained while the new one reaches the agreed v1.
- `docs/decisions/0002-stack.md`: TypeScript end to end, with a framework-free core package for money, tax, numbering, states and cash flow.

**Before any rewrite work, whatever is decided:**

1. Rotate the four secrets in `.env` (database password, PDFShift key, ExchangeRate-API key, `SECRET_KEY`) and delete `Archive.zip`. Changing `SECRET_KEY` signs everyone out, which is harmless.
2. If the live app holds real users or records (section 8), contain I-C1, I-C2 and I-C3 in the current app now: three small, separate patches, each reviewed on its own. If it holds none, close registration on the live site and leave the code alone.
3. Take the unbuilt features and the plan limits off the public pages, or put the site behind a "coming soon" page, until there is a privacy policy and terms.

---

## 7. Characterisation tests to write next

The next task turns section 3 into tests that pin what the current system does. Each test asserts today's behaviour, including the bugs, and names the issue it pins, so the new build either matches it or differs on purpose with the difference recorded in its spec.

| Test | Pins | From |
| --- | --- | --- |
| Totals at 20% on two lines | saved 109.99 / 21.998 / 131.988; shown £131.99 | W1 |
| Tie at 5% | editor £13.13, invoice £13.12 | W2, I-H2 |
| 17.5% on £13.00 | editor tax £2.28, invoice £2.27, label 17% | W3, I-M2 |
| Discount above subtotal | editor −£50.00, saved 0 | W4 |
| Shipping and discount order | base 90, tax 18, total 108 | W5 |
| Fractional quantity on Postgres | 1.5 → 2, 0.4 → 0, total 100, reopened £80.00, save refused | W6, I-H3 |
| Edit round trip | 0.2 → 0.002, total 131.988 → 110.20998; seeded invoices keep 20% on the first edit only | W7, I-C1 |
| Tax labels | the table in 3.3 | I-M2 |
| Numbering | the table in 3.4, duplicate refused | N1, I-M1 |
| Status paths | the table in 3.5 | S1, I-H4, I-H5, I-M12 |
| Client custom fields after an invoice save | deleted | I-H6 |
| Seed dashboard and list figures | the table in 3.6, with the clock fixed at 18 October 2026 | M1 |
| Conversion | the table in 3.7, with rates injected | C1, I-H7 |
| Date storage by session zone | the table in 3.8 | I-H12 |
| Cross-account reads | `/invoice/create?client_id=` leaks; the other routes refuse | I-C2 |
| Apostrophe in a client name | page attribute broken | I-H8 |

The scripts in `docs/audit/evidence/` already drive each case; the tests can be built from them. They need Postgres, because W6 and the time-zone cases only show there.

---

## 8. What this audit could not check

| Item | Why | How to check |
| --- | --- | --- |
| Whether production holds real users or records, and how many | No production access, by rule | Kobby counts users and invoices in the Neon console |
| How the production schema was built (I-H9) | As above | `\d company_details` in the Neon SQL editor; compare with the migrations; check the `alembic_version` table |
| The production database's time zone (I-H12) | As above | `show timezone;` in the Neon SQL editor |
| Whether logo upload works on Vercel (I-C3) | Not tested against the live site | Upload a logo on a test account and check the result |
| Whether the seed was ever run against production | As above | Look for `demo@invoica.com`, `newbie@invoica.com` or `global@invoica.com` in the user table. If present, those accounts have the password printed in `seed.py` |
| Vercel project settings: region, environment variables, preview deployments | No access to the Vercel dashboard | Kobby, in the Vercel project settings |
| PDFShift and ExchangeRate-API plans and data terms | No account access | Kobby, in each dashboard |
| Who owns `invoica.com` (I-M11) | Out of scope | A domain lookup |
| Behaviour in Safari and Firefox | Only the Chrome engine was run | A browser pass during the characterisation tests |
