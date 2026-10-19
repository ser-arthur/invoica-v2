# Invoica: independent review of money and tenancy (review 1)

Reviewer: a separate agent, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 19 October 2026.

## Scope and version reviewed

The repository changed while the review ran. Work started at commit `90596ba`; three further commits landed during the review (`c295694`, `2fc2380`, `4bdaa18`). This report is pinned to **commit `4bdaa18`** ("send invoices by email through the outbox, logo upload, duplicate an invoice"). Between `90596ba` and `4bdaa18` nothing changed in `packages/core`, the migrations, `packages/documents` or `packages/pdf`; the changes in reviewed areas (`documents.ts` gained `duplicateDocument`, the web app gained email sending and logo upload) were read and are covered below. Uncommitted work that appeared afterwards (a CSV export) was not reviewed.

Every database probe was run twice: once against the working tree and once against a clean export of `4bdaa18` at `../review/scratch/pinned` (made with `git archive`, outside the repository). Line numbers below are for `4bdaa18`.

## Summary

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 3 |
| Medium | 6 |
| Low | 8 |

No path was found that lets a user read or change another organisation's data, files or PDFs through the app. The serious problems are in credit notes and payment recording, where the server accepts corrections that do not match the invoice and silently drops a second payment entered from the same page.

High:

1. Partial credit notes are not tied to the invoice's lines or tax.
2. A second payment recorded from the same invoice page is silently discarded.
3. Crediting "an amount" on an invoice with more than one tax code credits no tax.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| `pnpm test:core` | repository, start of review | 118 run, 118 passed, 0 failed, 0 skipped |
| `pnpm test:db` | repository, start of review | 29 run, 29 passed, 0 failed, 0 skipped |
| core tests (`vitest run`) | pinned copy of `4bdaa18` | 118 run, 118 passed |
| database tests (`vitest run`) | pinned copy of `4bdaa18` | 30 run, 30 passed, in three runs. One earlier run also reported 2 unhandled errors that did not reproduce; the builder was running tests against the same server at the time |
| Review probes, database | `../review/scratch/db-probe.test.ts` and `db-probe-pinned.test.ts` | 16 run, 16 passed. Each probe asserts the behaviour observed, so 13 passes confirm a problem and 3 confirm sound behaviour |
| Review probes, core | `../review/scratch/core-probe.ts`, `core-probe-2.ts` | Outputs saved beside each script (`.out` files) |

How to rerun the probes: `cd ../review/scratch && TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres ./node_modules/.bin/vitest run --root ../review/scratch --reporter=verbose --silent=false` (the scratch `node_modules` is a symlink to `packages/db/node_modules`). Core probes: `./node_modules/.bin/tsx core-probe.ts`. Each run creates and drops its own throwaway database through the existing test helper; the `invoica` database was not touched.

---

## Findings

### H1. Partial credit notes are not tied to the invoice's lines or tax

- **Severity:** high
- **Where:** `packages/db/src/documents.ts:615-621` (lines taken from the request, tax resolved from the live `tax_code` table) and `:646-661` (the only check is that the credit note's total is above zero and no more than the balance).
- **What goes wrong:** a partial credit note may contain any lines, any quantities and any tax code in the organisation. Nothing compares it with what the invoice charged. Three concrete cases, all accepted:
  1. A zero-rated invoice of £100.00 (VAT £0.00) can be credited with a line of £83.33 at 20%. The credit note totals £100.00, so it passes the balance check, and it credits £16.67 of VAT that was never charged. The seller's VAT return would reduce output tax by £16.67 and the customer would be told to reduce input tax they never claimed.
  2. The tax is read from the tax code as it stands today; the rate stored on the invoice is ignored. An invoice issued at 20% (VAT £20.00 on £100.00); the code is then edited to 5%; a £50.00 credit for an amount, exactly as the invoice page sends it (one line with the invoice's tax code id), carries VAT £2.50 at 5%. The correct credit is £10.00 at 20%.
  3. A line invoiced as 1 unit can be credited as 50 units at a lower price.
  
  Corrections are meant to be credit notes that reverse what was invoiced; as built, the credit note can carry tax at rates and on supplies that never appeared on the invoice.
- **How confirmed:** probes `probe: credit note tax` (both tests) and `probe: credit note uses the live tax code` in `../review/scratch/db-probe.test.ts`. Output: `invoice VAT 0 credit note VAT 1667 credit total 10000 invoice balance 0`; `invoice VAT rate 20%, VAT 2000 | credit of 50.00 VAT 250 rate {..."ratePpm":50000...}`; the 50-unit credit was stored with quantity 50000.
- **Suggested fix:** build partial credit notes from the invoice's own lines. The request names invoice line ids with a quantity or amount, capped at what is still uncredited on that line, and the tax for each credited line is copied from the invoice line's stored `tax` (or the snapshot); `tax_code` is not consulted. Add a check, per tax summary row, that tax credited across all credit notes never exceeds tax charged on the invoice. Write the tests first: zero-rated invoice credited at 20% is refused; a code edited after issue does not change the credited rate; credited quantity above invoiced quantity is refused.

### H2. A second payment recorded from the same invoice page is silently discarded

- **Severity:** high
- **Where:** `apps/web/src/components/document-actions.tsx:119` (the idempotency key is created once per component with `useState`), `:136-144` (on success the dialog closes and the result's `duplicate` flag is ignored), `apps/web/src/app/(app)/invoices/[id]/page.tsx:123` (the button stays mounted while a balance remains), `packages/db/src/documents.ts:537-541` (any reuse of a key is treated as a duplicate, whatever the invoice or amount).
- **What goes wrong:** a client pays £40.00 of a £100.00 invoice. The owner records it; the dialog closes and `router.refresh()` reloads the server data. `router.refresh()` keeps client component state, so `RecordPaymentButton` keeps the same key. Later the client pays the remaining £60.00 and the owner, still on the same page, records it. The request carries the old key, the server finds the first payment, returns `{ duplicate: true }`, and records nothing. The dialog closes as if it worked. The invoice stays part paid with £60.00 outstanding, and the dashboard shows it as owed, so a client who has paid in full may be chased. The server half also means a key reused on a different invoice returns the other invoice's payment as a "duplicate". The keys come from `Date.now()` and a counter (`invoice-editor.tsx:134`), which are predictable and can collide across tabs.
- **How confirmed:** server half by probe `probe: payment idempotency`: first call `{ duplicate: false }`, second call with the same key and £60.00 returned `{ duplicate: true }`, paid stayed 4000, balance 6000. Reuse on another invoice returned `{ duplicate: true }` with the first invoice's payment id. Client half by reading the component and the documented behaviour of `router.refresh()` (client state is kept); not run in a browser.
- **Suggested fix:** on the server, store a fingerprint of the request (document id, amount, date, method) with the key; return the earlier result only when the fingerprint matches, and refuse a mismatched reuse with a clear message. In the client, create a fresh key with `crypto.randomUUID()` each time the dialog opens, and tell the user when the server answers "already recorded". Apply the same to credit notes (`documents.ts:591-595`) and to sending (`document-actions.tsx:451`).

### H3. Crediting "an amount" on an invoice with more than one tax code credits no tax

- **Severity:** high
- **Where:** `apps/web/src/app/(app)/invoices/[id]/page.tsx:75-77` and `:244` (`taxCodeId` is null when the invoice's lines use more than one code), `apps/web/src/components/document-actions.tsx:325-340` (the credit line is sent with that null code).
- **What goes wrong:** an ordinary UK invoice with a £500.00 standard-rated line and a £100.00 zero-rated line totals £700.00 with VAT £100.00. The owner credits "an amount" of £300.00. The credit note is one line with no tax: total £300.00, VAT £0.00. The balance falls by £300.00 while all £100.00 of VAT stays charged, so the credit note does not show the VAT credited (required by regulation 15C(6)(h), see `docs/specs/tax-uk.md` section 6) and both parties' VAT figures are wrong. The same happens when one line uses "No tax" and the others use VAT. The option label says only "An amount", with nothing to warn the user.
- **How confirmed:** `core-probe-2.ts` reproduces the figures (`mixed invoice total 70000 VAT 10000 | amount credit of 300.00 with no code: total 30000 VAT 0`); the null code path by reading. The server accepts the request (H1).
- **Suggested fix:** when crediting an amount, split it across the invoice's tax groups in proportion to their gross values with `allocate` from `@invoica/core`, using each group's stored tax, or require the user to pick the lines being credited. Refuse a tax-free amount credit on an invoice whose lines carry tax. This fix belongs with H1.

### M1. The line guard checks only the new parent, so a line can be moved out of an issued invoice

- **Severity:** medium
- **Where:** `packages/db/migrations/0002_tenancy.sql:170-182`, in particular line 174: `coalesce(new.document_id, old.document_id)`. Full credit notes then read `document_line` rows (`packages/db/src/documents.ts:629-645`) and do not use the snapshot.
- **What goes wrong:** on UPDATE the trigger looks only at `new.document_id`. An UPDATE that sets `document_id` to a draft passes, and the line leaves the issued invoice. CLAUDE.md states that the database refuses any change to issued documents; this path is open to any code running as `invoica_app`. Example: an issued invoice of £180.00 (two lines, £100.00 and £50.00 plus VAT); one line is moved to a draft; a "whole invoice" credit note then totals £120.00 and leaves £60.00 owing on an invoice the user believes was cancelled.
- **How confirmed:** probe `probe: line guard`. Output: `invoice total 18000 full credit note total 12000 balance left 6000`. Editing a line in place is correctly refused (probe `an issued line cannot be edited in place (sound)`).
- **Suggested fix:** in `app.guard_document_line`, on UPDATE check both `old.document_id` and `new.document_id`, and refuse any change to `document_id` or `organisation_id`. This needs a new migration, since 0002 has run. Build full credit notes from the invoice snapshot's lines.

### M2. The database does not guard issued documents on insert, credit-note totals, or voiding an invoice that has credit notes

- **Severity:** medium
- **Where:** `packages/db/migrations/0002_tenancy.sql:166-167` (the guard fires on UPDATE and DELETE only), `:158-162` (voiding checks payments only), `packages/db/migrations/0001_init.sql:194-249` (no constraint ties a credit note's total to the invoice's balance).
- **What goes wrong:** payments have a database-level balance guard (`app.guard_payment`); credit notes have none, and an issued document can be inserted directly. As `invoica_app`, a credit note of £500.00 can be inserted already issued against a £100.00 invoice, with any sequence (900 in the probe, skipping the counter). The invoice's balance becomes -£400.00 and its state shows "Paid". An invoice with an issued credit note can also be voided by a plain UPDATE: the app refuses this, and the database allows it. Each of these needs a code defect in the app to be reached; the point is that the database does not enforce the money rules for credit notes in the way it does for payments.
- **How confirmed:** probes `probe: issued documents inserted directly` (`balance after direct credit insert -40000 state paid`) and `the database lets an invoice with an issued credit note be voided directly`.
- **Suggested fix:** add a BEFORE INSERT trigger on `document` that only allows `lifecycle = 'draft'`. On the transition of a credit note to issued, lock the credited invoice and refuse a total above the invoice's total less payments and earlier credits, mirroring `guard_payment`. Refuse voiding an invoice with issued credit notes in `guard_document`. Optionally check in the same trigger that the new sequence equals the counter's previous value.

### M3. "Rounded down" does not round the VAT total down

- **Severity:** medium
- **Where:** `packages/core/src/totals.ts:195-215` (document level rounds each tax group, and each component in it, separately), `packages/core/src/tax.ts:133-141` (with prices including tax the net is rounded and the tax takes the remainder), `packages/core/src/totals.ts:117` and `:100` (the same mode is applied to quantity times price and to percentage discounts), `apps/web/src/components/settings-form.tsx:78-93` (the setting is labelled "On the invoice total, rounded down").
- **What goes wrong:** VAT Notice 700 paragraph 17.5 lets an invoice trader round the total VAT on the invoice down to a whole penny (`docs/specs/tax-uk.md` section 5, decision 0007). The code rounds each group down instead, which can take more than a penny off:
  1. 53p at 20% (10.6p) and 53p at 5% (2.65p): exact VAT 13.25p, so the total rounded down is 13p; computed VAT is 12p.
  2. Two codes at the same 20% rate (the preset "Standard rate" and a custom code), 53p each: exact 21.2p, allowed 21p, computed 20p.
  3. With prices including VAT, the mode rounds the net down, so the VAT goes up: on £10.01 gross the VAT is 167p where the exact figure is 166.83p and rounding down gives 166p.
  4. The mode also truncates line amounts: 1.5 hours at £33.33 is £49.995, billed as £49.99 under "down" and £50.00 under the default.
  
  The first two under-declare VAT beyond what HMRC allows; the third and fourth do the opposite of what the setting says.
- **How confirmed:** `core-probe.ts`, sections P1 and P2 (`computed = 12`, `computed taxTotal = 20`, `gross 1001p: net 834, VAT 167`). Case 4 by reading `lineAmount` in `packages/core/src/quantity.ts:49-55`.
- **Suggested fix:** for "document, down", work each rate group's VAT out exactly (as a fraction over `RATE_SCALE`), add the exact amounts, and round the invoice's VAT total down once; allocate it back to rows and lines with `allocate`. With prices including tax, round the tax down and give the remainder to the net. Keep line amounts and percentage discounts on a fixed half-up rule, independent of the VAT setting. Pin each case above as a test.

### M4. The tax-inclusive split puts the whole rounding remainder on the last tax, which can leave it off its rate or negative

- **Severity:** medium
- **Where:** `packages/core/src/tax.ts:126-143` (`splitGross`, lines 136-141 add the difference to the last component with a rate above zero).
- **What goes wrong:** for codes with several components (the Ghana preset: NHIL 2.5%, GETFund Levy 2.5%, VAT 15%), each component is rounded on the net and the remainder goes to VAT. The printed VAT then differs from its rate times its base. Ghana with prices including tax, GHS 100.00: net 83.33, NHIL 2.08, GETFund Levy 2.08, VAT 12.51, where 15% of 83.33 is 12.4995 (12.50 to the nearest pesewa, the rule in `docs/specs/tax-ghana.md`). Over every gross value from 0.01 to 2,000.00, 37,502 of 200,000 values print a component outside one rounding step of its rate times base; at small amounts the gap is large (gross 0.16: VAT 0.03 on a base of 0.13, where 15% is 0.0195). With a custom code of 5% + 5% + 1%, a gross of 0.11 prints the 1% levy as -0.01. Totals still add up; the individual tax rows do not follow their rates, and a negative tax row can be printed.
- **How confirmed:** `core-probe.ts` section P3 (`components off their own rate: 37502 negative: 0`, `first negative component: {"gross":11,...["Levy C",10,-1]}`) and `core-probe-2.ts` (`VAT 15% of 8333 = 1251 (exact 1249.950)`).
- **Suggested fix:** round each component on the net with the document's mode and take the remainder into the net (the value excluding tax), so every printed tax equals its rate times its base, rounded once. Add a property test: for every gross and every preset, each component is within one rounding step of rate times base and never negative.

### M5. A business that is not registered for tax can issue invoices that charge VAT

- **Severity:** medium
- **Where:** `packages/db/src/organisations.ts:51-67` (every organisation gets its country's VAT codes, registered or not), `packages/db/src/documents.ts:427-432` (issue checks only "registered without a number"), `packages/documents/src/view.ts:179-182` (charged tax rows are printed whatever the registration).
- **What goes wrong:** a UK sole trader who is not VAT registered picks "Standard rate" on a line (it is in the list) and issues an invoice for £100.00 plus £20.00 VAT. The PDF hides the tax column and still prints a "VAT 20%" row and a total of £120.00, with no VAT number. `docs/specs/tax-uk.md` section 2 quotes GOV.UK: "You cannot include VAT on your invoices until you get your VAT registration number".
- **How confirmed:** probe `probe: not VAT registered`. Output: `INV-0001 taxTotal 2000 total 12000 seller.taxRegistered false`.
- **Suggested fix:** at issue, refuse any line whose tax has a component above 0% when the organisation is not tax registered, with a message that points to Settings. In the editor, list only codes without a charged rate for such organisations. Add the test.

### M6. Credit notes are counted as "paid"

- **Severity:** medium
- **Where:** `packages/db/src/documents.ts:97-104` (state is derived from payments plus credits), `packages/core/src/states.ts:21-28`, `packages/db/src/documents.ts:169-170` (the "Paid" filter), `packages/db/src/dashboard.ts:90-103` (top clients "by paid" add `applied`, which includes credits).
- **What goes wrong:** an invoice cancelled in full by a credit note shows the state "Paid" and appears under the "Paid" filter, though nothing was received. On the dashboard, "top clients" by money paid includes credit notes. In the probe the client's "paid" figure was £1,658.00 while payments actually recorded across the whole organisation were £41.00. The rule says dashboard figures are derived from records; this one is derived from the wrong records.
- **How confirmed:** probe `probe: credited counted as paid`. Output: `state paid topClients [{ ... paid: 165800 }] payments actually recorded 4100`.
- **Suggested fix:** keep paid and credited apart. Derive "paid" from payments only and add a state such as "Credited" (or "Settled") for invoices closed by credit notes; use `applied.paid` for "paid" figures and keep `paid + credited` for the balance and outstanding, where it is correct.

### L1. A credit note can be voided through the server action, reopening the invoice's balance

- **Severity:** low
- **Where:** `packages/db/src/documents.ts:514-529` (no check on `kind`), `apps/web/src/lib/actions/documents.ts` (`voidAction` accepts any document id).
- **What goes wrong:** the invoice page offers no way to void a credit note, yet a request to `voidAction` with a credit note's id succeeds. A £100.00 invoice fully credited (balance £0.00, "Paid") goes back to "Issued" with £100.00 owing, though the credit note has already been given to the customer.
- **How confirmed:** probe `probe: void`, first test. Output: `invoice before [ 'paid', 0 ] after voiding its credit note [ 'issued', 10000 ]`.
- **Suggested fix:** refuse voiding a credit note in `voidDocument` and in `app.guard_document`; a mistaken credit note is corrected with a new invoice.

### L2. The file row of a kept PDF can be repointed

- **Severity:** low
- **Where:** `packages/db/migrations/0002_tenancy.sql:239` (`stored_file` has update and delete grants and no guard trigger).
- **What goes wrong:** `document.pdf_file_id` is fixed once set. The `stored_file` row it points to is open to change: its `storage_key`, `sha256` and `byte_size` can be updated by `invoica_app`, which swaps the PDF of record without touching the document.
- **How confirmed:** probe `probe: stored files of record` (the update returned the new key).
- **Suggested fix:** add a trigger that refuses UPDATE on `stored_file` and refuses DELETE while a document or organisation refers to the row, or revoke update and delete from `invoica_app`.

### L3. Security-definer functions trust their input and work across organisations

- **Severity:** low
- **Where:** `packages/db/migrations/0003_outbox_worker.sql:13-52` (`app.claim_outbox`, `app.finish_outbox`, granted to `invoica_app`), `packages/db/migrations/0002_tenancy.sql:43-69` (`app.create_organisation` takes `p_trial_days`, `p_base_currency` and `p_time_zone` unchecked).
- **What goes wrong:** inside a session scoped to organisation A, `select * from app.claim_outbox(100)` returned organisation B's jobs with their payloads, and `app.finish_outbox` marked one of B's jobs done. Since `4bdaa18`, email job payloads hold the recipient's address, the subject and the message text, so this is personal data. Any code path running as the app role (a bug, or an injection if one ever appears) can read and close every organisation's jobs. The drain route itself is protected by `CRON_SECRET`, and jobs run as their own organisation, which is correct. Separately, `create_organisation` accepts any trial length, currency or time zone from its caller; the app passes a constant and validated values.
- **How confirmed:** probe `probe: outbox functions` (`jobs claimed inside org A session 17 of which org B 2 { documentId: ... }`, then B's job status `done`). `create_organisation` by reading.
- **Suggested fix:** give the worker its own database role and grant the two functions to that role only; check in `finish_outbox` that the job is `running`. Fix the trial length inside `create_organisation` and validate the currency and time zone there.

### L4. Settings accept rounding choices HMRC does not describe

- **Severity:** low
- **Where:** `packages/schemas/src/index.ts:126-129`, `apps/web/src/components/settings-form.tsx:78-93`.
- **What goes wrong:** decision 0007 says Settings does not offer UK users combinations HMRC does not describe. The form offers three choices to everyone (including "On the invoice total, to the nearest unit", described as the Ghana choice), and the server accepts any level with any mode, including "per line, rounded down", which `docs/specs/tax-uk.md` section 5 point 3 says is not allowed.
- **How confirmed:** by reading.
- **Suggested fix:** validate the pair (country, level and mode) on the server against a per-country list taken from decision 0007, and show only those choices.

### L5. `parseQuantity` drops commas, so "1,5" becomes 15

- **Severity:** low
- **Where:** `packages/core/src/quantity.ts:12`.
- **What goes wrong:** a user who types a decimal comma ("1,5" hours) gets 15 hours; the line is fifteen times the intended amount. `parseMoney` refuses the same input, so the two parsers disagree.
- **How confirmed:** `core-probe.ts` section P4 (`parseQuantity("1,5") = 15000`, `parseMoney("1,5", "GBP") = null`).
- **Suggested fix:** accept commas only as thousands separators in groups of three, as `parseMoney` does, and refuse anything else.

### L6. Activity times are shown in the server's time zone

- **Severity:** low
- **Where:** `apps/web/src/app/(app)/invoices/[id]/page.tsx:275-280`.
- **What goes wrong:** the activity list formats instants with `Intl.DateTimeFormat('en-GB', ...)` and no `timeZone`, so on a UTC server a London user in summer, or any user outside UTC, sees times an hour or more off. Business dates elsewhere are handled correctly.
- **How confirmed:** by reading.
- **Suggested fix:** pass the organisation's time zone to the formatter.

### L7. The reverse charge note names HMRC whatever the seller's country

- **Severity:** low
- **Where:** `packages/documents/src/view.ts:196-197`.
- **What goes wrong:** any reverse-charge row prints "Reverse charge: customer to pay the VAT to HMRC", including on a Ghanaian seller's custom reverse-charge code. Under CLAUDE.md, legal and tax wording needs approval.
- **How confirmed:** by reading.
- **Suggested fix:** print the HMRC wording only when the seller's country is GB and use the bare reference "Reverse charge" elsewhere, pending wording that has been approved.

### L8. Saving and issuing a new invoice is not idempotent

- **Severity:** low
- **Where:** `apps/web/src/lib/actions/documents.ts:63-83` (with no draft id, every call creates a draft and issues it).
- **What goes wrong:** the button is disabled while a request is in flight, but if the response is lost (a dropped connection after the server committed) and the user tries again, a second invoice is created and issued with the next number. Both are valid, gapless and numbered, and the extra one has to be voided.
- **How confirmed:** by reading.
- **Suggested fix:** send a client-generated key with the first save and store it on the draft (`document.idempotency_key` already exists with a unique index), returning the earlier invoice on a repeat.

---

## Checked and found sound

- **Money arithmetic.** Amounts are integers in minor units throughout. `divRound`, `allocate`, `sumMinor`, `lineAmount`, `taxesOnNet` and `grossMultiplier` use BigInt and check the safe integer range. `allocate` always returns parts that add up to the total and never makes a part negative or larger than its weight allows. `parseMoney` and `toDecimalString` are exact, and `formatMoney` passes a decimal string to `Intl`. A search for `parseFloat`, `Math.round`, `toFixed` and division in money paths found only display widths on the dashboard and a rate label in the credit dialog.
- **Totals as printed.** For prices excluding tax (with and without discounts), prices including tax, deposits and reverse charge, the printed rows add up to the printed total: the subtotal is the sum of line amounts, the tax rows sum to `taxTotal`, `total = net + taxTotal`, and the balance due equals the total less the deposits shown. Line tax shares sum to the tax total at both levels. Reverse-charge tax is shown and never added to the total. Zero-rated, exempt and outside-the-scope values get their own totals.
- **UK default and Ghana default.** Per line, nearest penny, with VAT on the discounted net, matches Notice 700 paragraph 17.5.1. Ghana per document, per tax, half up, with prices excluding tax, matches the spec. With the default rounding, a tax-inclusive line with a single component (all UK presets) splits into a net and a VAT that add up to the gross, with the VAT within one rounding step of the rate times the net.
- **Issued documents.** The snapshot is frozen at issue with its tax level and rounding; editing a client afterwards does not change it. An issued document and its lines cannot be edited in place or deleted (`guard_document`, `guard_document_line`, existing tests and my probe). `pdf_file_id` cannot be replaced. Voiding keeps the number. `updateDraft` and `deleteDraft` lock the row and refuse non-drafts. `duplicateDocument` (new in `4bdaa18`) makes a draft only and recomputes its totals with the core.
- **Numbering.** The counter row is updated inside the issuing transaction and stays locked until it ends; a failed issue rolls back, so no gap appears (existing test, plus ten concurrent issues). Invoices and credit notes have separate counters. Unique constraints stop duplicate sequences and numbers.
- **Payments and balances.** `recordPayment`, `createCreditNote`, `voidDocument` and `issueDocument` lock the document row first, and `guard_payment` locks it again and checks state, currency and balance including issued credit notes. A payment and a credit note sent at the same moment, and two credit notes sent at the same moment, each ended with one refused and a balance never below zero (my probes). Two payments sent at the same moment behave the same (existing test). Payments can only be marked removed, once, with a reason. Voiding with payments is refused in the app and the database.
- **Dates.** Overdue is derived each time (`isOverdue`) and never stored. "Today" is `todayIn(organisation time zone)` for issue dates, due dates, the payment form and the dashboard. `formatBusinessDate` formats in UTC so a date is never shifted. Due dates are checked against issue dates in the schema, at issue and in a CHECK constraint.
- **Row-level security.** Forced on every tenant table except `outbox` (enabled there, by design for the worker functions). `invoica_app` owns nothing, has no BYPASSRLS and cannot switch RLS off or change role (existing tenancy suite). `app.current_organisation_id()` returns the organisation only for a member, and `withOrganisation` refuses otherwise. Composite foreign keys stop a document, line, payment, item or file from pointing at another organisation's rows. The organisation cookie is checked against the user's memberships.
- **Routes and files.** `/files/[id]` and `/invoices/[id]/pdf` run inside the signed-in user's organisation, so another organisation's file or PDF is "Not found". The files route serves logos only, with a content type taken from the file's bytes at upload and `nosniff` (`4bdaa18`). Fonts are served from a fixed list. The drain route requires `CRON_SECRET` with a timing-safe comparison. Storage keys are generated on the server and checked against the storage root.
- **Background jobs.** Each job runs as its own organisation and requesting user, and `withOrganisation` checks membership again. A payload naming another organisation's document finds nothing. The email job (`4bdaa18`) reads the document and its PDF inside the job's organisation and marks it sent there; the send action refuses drafts and void documents. (A document voided after its email was queued is still emailed; this is outside money and tenancy and is noted only.)
- **HTML and SQL.** Templates escape every interpolated value; the brand colour is constrained by a CHECK; the preview iframe is sandboxed without scripts; the PDF renderer runs with JavaScript off and blocks all requests except data URLs. All SQL is parametrised and search patterns are escaped. Email headers with non-ASCII or control characters are encoded.
- **Input validation.** Every server action that takes a body validates it with `@invoica/schemas`. Plain id arguments (delete, mark sent, remove payment, duplicate, archive) skip the schemas; they reach only parametrised queries under row-level security, so a foreign or malformed id finds nothing.

## Not checked

- Browser behaviour end to end. The client half of H2 is by reading React and Next.js semantics; nothing was run in a browser. The Playwright suite was not run.
- `pnpm check` (format, copy rules, lint, types) and `pnpm build`.
- Better Auth itself (sign-up, sessions, rate limits, email verification) beyond how the user id reaches `withOrganisation`.
- The migration runner, its refusal of edited migrations, and the schema drift test beyond running it.
- The seed script, the e2e specs, and the CSV export that was in progress after `4bdaa18`.
- Production email and object storage adapters (neither is built yet).
- VAT in sterling on foreign-currency invoices (`docs/specs/tax-uk.md` section 7): not implemented, so not reviewed as a defect; it will be needed before VAT-registered users invoice in other currencies.
- Performance (the dashboard and lists load every invoice of the organisation).

## Files produced by this review

- `../review/review-1.md` (this report)
- `../review/scratch/db-probe.test.ts`, `../review/scratch/db-probe-pinned.test.ts` and their outputs `../review/scratch/db-probe.out`, `../review/scratch/db-probe-pinned.out`
- `../review/scratch/core-probe.ts`, `../review/scratch/core-probe-2.ts` and outputs `../review/scratch/core-probe.out`, `../review/scratch/core-probe-2.out`
- `../review/scratch/pinned/` (clean export of commit `4bdaa18` used for the pinned runs)

---

## Resolution (builder, 19 October 2026)

Every finding was fixed with a test written first; each test names its finding. Core tests are in `packages/core/test/review-fixes.test.ts` and `credits.test.ts`; database tests in `packages/db/test/review-1.test.ts`; the reverse charge wording in `packages/documents/test/render.test.ts`; the browser half of H2 in `apps/web/e2e/invoice-flow.spec.ts`. The database guards are in migration `0005_review_1_guards.sql`, and three of them were mutation-checked (each test fails with its guard removed).

| Finding | Fix |
| --- | --- |
| H1 | Credit notes are built from the invoice as issued (`packages/core/src/credits.ts`). A request names invoice lines and quantities, capped at what is left uncredited; price and tax come from the invoice's snapshot, never from today's tax codes. Each line credited is the invoice's figures for everything credited after this note less those before it, so credits taken in parts add up to the invoice exactly (property test). `checkCredit` refuses a tax the invoice did not charge, and more of a tax than was charged once earlier credit notes are counted. Credit note lines store `credited_line_id`. |
| H2 | Payments and credit notes store a fingerprint of the request with its key. The same request returns the earlier result; a reused key with a different request is refused. Each dialog makes a fresh `crypto.randomUUID()` key when it opens, and says so when the server answers that the payment was already recorded. Sending works the same way. |
| H3 | Crediting an amount shares it across the invoice's tax rates in proportion to what was invoiced at each (`allocate`), and splits each share into tax and net at the invoice's rates. |
| M1 | The line guard checks the old and the new document and refuses any change of document or organisation. |
| M2 | Documents can only be inserted as drafts. A credit note's move to issued locks the invoice and refuses a total above its balance, or a different currency. An invoice with credit notes cannot be voided. |
| M3 | Fixed in core: "on the total, rounded down" rounds the exact VAT of the whole invoice down once and shares it back by largest remainder; line amounts and percentage discounts always round half up. |
| M4 | Fixed in core: with prices including tax, each component is its rate times the exact net, rounded once; the net takes the remainder. Property test over every preset. |
| M5 | A business that is not registered for tax cannot issue an invoice with a line whose tax has a rate (zero-rated included); the editor offers such businesses only codes without a rate. |
| M6 | Paid and credited are kept apart. New states "Credited" (closed by credit notes alone) and "Settled" (payments and credit notes together); a credit alone leaves an invoice "Issued" or "Sent". Top clients count payments only; the "Paid" filter shows paid and settled invoices. |
| L1 | Credit notes cannot be voided, in the app or the database. |
| L2 | Stored files cannot be changed, and a file in use cannot be deleted. |
| L3 | `finish_outbox` only finishes running jobs; `create_organisation` checks the trial length, the codes and the time zone. A separate worker role, so the app role can no longer call the outbox functions, is a change to tenancy rules and waits for Kobby's approval. |
| L4 | The server accepts only the rounding choices listed for the country (`allowedRounding`), and Settings shows only those. |
| L5 | Fixed in core: commas are accepted only as thousands separators. |
| L6 | Activity times are shown in the organisation's time zone. |
| L7 | The HMRC wording is printed for UK sellers only; elsewhere the note reads "Reverse charge." with the figures. |
| L8 | The first save of a new invoice sends a key stored on the draft; a repeated save or save-and-issue finds the same document. |

Also fixed from the notes: a document voided after its email was queued is no longer emailed. Snapshot lines now keep only the fields a document shows.

Checks after the fixes: core 150 passed, schemas 4, documents 8, PDF 8, database 51, web unit 5, end to end 14 (desktop and phone, accessibility included), all passed, none skipped; format, copy rules, lint, types and the production build clean.
