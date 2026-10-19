# Invoica: independent review of the credit ledger (review 3)

Reviewer: a separate agent, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 19 October 2026.

## Scope and commit

This review covers commit `f53f4d2` ("fix: credit notes worked out from a ledger by tax group (review 2)"), checked against its specification `docs/specs/credit-notes.md` and against the findings of review 2. In order of priority:

1. `packages/core/src/credits.ts` (`creditSource`, `creditState`, `planLineCredit`, `planAmountCredit`, `buildNote`, `checkCredit`) and `computeDocumentDetail` in `packages/core/src/totals.ts`;
2. `packages/db/src/documents.ts` (`creditLedger`, `invoiceCreditSource`, `createCreditNote`, `lockRequestKey`) and the change to `packages/db/src/dashboard.ts`;
3. `packages/db/migrations/0006_review_2_guards.sql`;
4. the "Total before VAT/tax" change in `packages/documents/src/view.ts`, against regulation 15C(6) as summarised in `docs/specs/tax-uk.md` section 6.

The report is pinned to **commit `f53f4d2`**. The repository kept moving while the review ran:

- commits `67acb8a` (quick actions on invoice rows) and `b3314a8` (blueprint and handover) landed;
- uncommitted work on plans and entitlements appeared, touching `packages/core/src/snapshot.ts`, `packages/core/src/index.ts`, `packages/db/src/documents.ts` (two lines in `issueDocument` and `createCreditNote` that pass entitlements to the snapshot), `packages/db/src/snapshot.ts` and `packages/documents/src/render.ts`, with new `plans.ts` files.

`git diff f53f4d2` shows no change to `credits.ts`, `totals.ts`, `tax.ts`, `money.ts`, the migrations, `dashboard.ts` or `view.ts`. To keep the results clean, every probe was rerun against an export of `f53f4d2` made with `git archive` at `../review/round3/pinned`. Its own `node_modules` links point `@invoica/*` at the pinned copies. The first runs, against the working tree, gave the same results.

Line numbers below are for `f53f4d2`.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| `pnpm test:core` | repository, start of review (packages then identical to `f53f4d2`) | 152 run, 152 passed, 0 failed, 0 skipped |
| `pnpm test:db` | repository, start of review | 59 run, 59 passed, 0 failed, 0 skipped |
| Core property probe `core/ledger-props.test.ts` | pinned `f53f4d2` | 1 test: 5,729 random invoices, 12,348 credit notes, every invariant checked on every note |
| Core targeted probes `core/targeted.test.ts` | pinned | 10 tests (T1 to T6), each asserting what it observed, plus the property test it imports; 12 passed across the two files |
| Core criterion 1 probe `core/whole.test.ts` | pinned | 1 test: 19,050 random invoices credited whole |
| Database probes `db-probe.test.ts` and `db-probe-2.test.ts` | pinned, fresh databases | 13 run, 13 passed; each asserts the behaviour it observed |
| Legacy scripts `legacy/t2-legacy.ts`, `legacy/deposit.ts`, `legacy/old-invoice.ts` | pinned against `ffc037b` and `90596ba` | outputs saved beside each script |

How to rerun them:

- Core: `cd ../review/round3/core && packages/core/node_modules/.bin/vitest run --root ../review/round3/core --no-cache --silent=false --reporter=verbose`.
- Database: `cd ../review/round3 && TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres ./node_modules/.bin/vitest run --root ../review/round3 --no-cache --no-file-parallelism --testTimeout=600000 --hookTimeout=300000 --reporter=verbose --silent=false db-probe`.

Each database run creates and drops its own databases through `createTestDatabase`. The `invoica` and `invoica_demo` databases were not touched. `round3/node_modules` is a symlink to `packages/db/node_modules`, as asked. `round3/core/node_modules` is a directory holding links to `vitest` and `fast-check` only, so Vitest writes nothing into the repository. The legacy credit notes in R3-2 were issued by the code at `ffc037b`, through review 2's pinned export.

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 0 | |
| Medium | 1 | R3-M1 |
| Low | 6 | R3-L1 to R3-L6 |

The ledger does what the specification says. In every random run:

- no credit note had a negative tax, base, net or line figure, or a row for a tax group it did not credit;
- every invoice credited in full, in any mix and order of line and amount credits, credited every tax row's base and amount exactly;
- `checkCredit` never disagreed with the planners;
- the last part of a balance was always accepted when nothing had been paid;
- the ledger read back from the database matched an independent model note for note.

The review 2 findings it set out to fix are fixed.

What remains:

- **R3-M1 (medium).** After a part payment, an invoice priced excluding VAT often cannot be credited down to zero. Amount credits are now entered before VAT, so a note's total moves in steps of 1p or 2p and skips some balances. A penny or two can be left that no credit note can clear, and the invoice turns overdue for it.
- **R3-L1 (low).** A note's tax is a share of its tax group's tax, not the tax on what it credits. Under VAT per line (the UK default), a whole line credited no longer credits the VAT that line was charged: £200.04 on a £1,000.00 line in one example, where the code at `ffc037b` gave £200.00. Some notes print tax a penny or more away from rate times the amount credited.
- **R3-L2 (low).** Records from earlier versions are read wrongly or not at all. Amount credits issued before `f53f4d2` are counted in the wrong price basis, and invoices issued before `927685d` with rounding down cannot be credited. By reading, one such record makes the invoice page fail.
- **R3-L3 to R3-L6 (low).** Remaining holes in migration 0006; wording on printed credit notes; a negative "Invoiced this month"; a stale schema comment.

---

## Findings

### R3-M1. After a part payment, the rest of an invoice priced excluding VAT often cannot be credited exactly, and a residual of a penny or two can be left that nothing can clear

- **Severity:** medium
- **Where:**
  - `packages/core/src/credits.ts:373-402`: `planAmountCredit` takes an amount in the invoice's price basis. On an invoice priced excluding tax, the note's total is that amount plus its proportional tax.
  - `packages/core/src/credits.ts:418-423`: `checkCredit` refuses any total above the balance.
  - `apps/web/src/components/document-actions.tsx:503`: the hint "Up to £X before tax" is the value left in the tax groups, not what the balance allows.
- **What goes wrong:** a credit note's total is a step function of the amount entered before VAT. At 20%, the total rises by 1p, 1p, 2p, 1p, 1p for each penny of amount, so one balance in six cannot be reached on a single-rate invoice. With three components (Ghana) the steps reach 4 pesewas. Once a payment has been recorded, the balance is no longer the ledger's remaining total, so the user must hit it exactly, and often cannot.
  - **Worked example.** Take an invoice of £100.00 plus VAT £20.00, priced excluding VAT. The client pays £60.03 and the seller agrees to cancel the rest, £59.97.
    - An amount of £49.97 gives a credit note of £59.96 (VAT £9.99).
    - An amount of £49.98 gives £59.98 and is refused: "A credit note cannot be more than the balance still owed."
    - No amount gives £59.97.
  - **Left over.** After the £49.97 credit, the invoice owes £0.01.
    - Every further amount is refused: 1p before VAT makes a note of 2p.
    - Every line credit is refused: 0.001 of the line is 10p.
    - The invoice stays "part paid" and shows as overdue once past its due date (checked on 31 December).
    - The only way to close it is to record a penny the client never paid.
  - **A deposit.** The same happens with a deposit recorded at issue: £1,000.00 plus VAT, deposit £333.33, balance £866.67. £722.22 gives £866.66; £722.23 gives £866.68, refused.
  - **How often.** 1,242 random invoices priced excluding tax (one to three lines of £1 to £30, one to four units, at 20%, 5%, Ghana's three components, a compound code, zero-rated and exempt; per line and per document), each with one random part payment:
    - in 154 (12%), no amount credit reaches the balance;
    - in 87 (7%), the best credit leaves a residual (1p in 79, 2p in 8) that no amount and no line credit of up to 50 units can clear.
  - **With prices including VAT**, the amount is the total, so any balance can be credited exactly: £59.97 on the same invoice priced including VAT was accepted.

  The spec's "Not covered" section deals only with invoices paid in full. This case arises from the R2-M3 fix (amount credits priced the way the invoice was). Before it, amounts were entered including VAT and the exact balance could be typed in, though with review 2's rounding drift.
- **How confirmed:** run.
  - Core: `core/targeted.test.ts` T1, three tests. Output in `core/targeted.json`: `"near": {"4997": 5996, "4998": "credit_exceeds_balance", ...}, "exactAmounts": [], "residual": 1` and `{"cases": 1242, "unreachable": 154, "stuck": 87, "residuals": {"1": 79, "2": 8}}`.
  - Database: probe `R3-1` through `recordPayment` and `createCreditNote` printed `{"creditNote":{"net":4997,"vat":999,"total":5996},"balanceAfter":1,"stateAfter":"part_paid","further":{"amount 1":"credit_exceeds_balance",...,"line 0.001":"credit_exceeds_balance"},"onDec31":{"balance":1,"state":"part_paid","overdue":true}}`.
  - The deposit case: `legacy/deposit.ts`, output `legacy/deposit.out`.
- **Suggested fix:** this needs a product and tax decision. Options:
  1. Offer "Credit the remaining balance" as its own choice. The planner takes the largest value whose proportional total does not exceed the balance. Where it falls short by a unit, the note's tax takes the difference, provided that keeps each row within one unit of its proportional figure and within what the row has left.
  2. Let the owner enter the total to credit, including VAT, on an invoice priced excluding VAT, solved the same way.
  3. A separate small-balance write-off record.

  In every case, show the limit the balance sets in the hint. Test first: for any part payment on an invoice priced excluding tax, the remaining balance can be credited exactly in one note.

### R3-L1. A credit note's tax is a share of its group's tax, not the tax on what it credits

- **Severity:** low
- **Where:** `packages/core/src/credits.ts:193-203` (`scaled`, `groupTaxAt`) and `:214-316` (`buildNote`). `docs/specs/credit-notes.md`, "The ledger by tax group": "the effective rate on a credit note is the rate the invoice actually charged in that group".
- **What goes wrong:** the ledger makes every row exact once a group is fully credited, which is its aim. The cost is that a single note's tax is the group's tax in proportion, carrying a share of the group's rounding, where the tax on the value credited is expected.
  - **VAT per line (the UK default).** Each line's VAT is rounded on its own, so the VAT a line was charged is known exactly. A whole line credited no longer gets it back.
    - Example: ten lines of £0.03 (VAT 0.6p each, shown as 1p) and one line of £1,000.00 (VAT £200.00); invoice VAT £200.10.
    - Crediting the £1,000.00 line in full prints "VAT 20% £200.04".
    - The planner at `ffc037b` gave £200.00 for the same credit, so this is a change for line credits, which review 2 found sound.
  - **How often, with ordinary prices.** 2 to 8 lines of £1.00 to £500.00, one to five units, all at 20%, each line credited whole: 501 of 19,526 credit notes (2.6%) credited a VAT 1p away from the VAT the line was charged. Credited whole, 563 of 19,050 random invoices stored per-line tax shares that differ from the invoice's own line tax. These shares are kept in the snapshot and the export, not printed.
  - **Ghana's default (per document, half up), prices including tax.**
    - Invoice: 3 × GH₵120.00 and 1 × GH₵99.99 at NHIL 2.5%, GETFund Levy 2.5% and VAT 15%.
    - An amount credit of GH₵100.01, then line 2 in full.
    - The second note prints "Total before VAT GH₵83.31", "NHIL 2.5% included GH₵2.09", "GETFund Levy 2.5% included GH₵2.09", "VAT 15% included GH₵12.50". But 2.5% of GH₵83.31 is GH₵2.08.
    - The same line credited first gives net GH₵83.33 and NHIL GH₵2.08.
    - The note's stored row bases (GH₵83.33) also differ from its printed net (GH₵83.31).
  - **Distance from rate times base.** On 20,000 random first amount credits, rows more than one minor unit from rate times base occurred mostly under VAT per line and under rounding down, up to 3.2 units.

  For a UK credit note, regulation 15C(6)(h) asks for "the rate and the amount ... of the VAT credited in respect of the decrease in consideration". "VAT 20% £200.04" on a £1,000.00 line is neither the VAT charged on that line nor 20% of it. Across all notes the totals stay exact.
- **How confirmed:** run.
  - `core/targeted.test.ts` T2 (two tests) and T4: `targeted.json` has `"invoiceLineVat": {"big": 20000}, "creditVat": {"big": 20004}` and `{"lines": 19526, "differ": 501, "maxDiff": 1}`.
  - `core/whole.test.ts`: `"lineTaxShareDiffers": 563`.
  - `legacy/t2-legacy.out`: `"at92819ac": 20000, "atBc1121a": 20004`, plus the Ghana rows.
  - Probe `R3-5` (Ghana): the printed rows quoted above.
- **Suggested fix:**
  - Under VAT per line, give each line its own place in the ledger, so a whole line credited takes exactly the tax it was charged, and parts of it are worked out cumulatively within the line. The proof that rows add up holds per line as it does per group.
  - Per document, decide in the spec how far a note's tax may sit from rate times its own base, and say so, or work each component's cumulative tax from the cumulative base at the rate and let the completing note take the remainder.
  - Either way, record the choice beside criterion 3.

### R3-L2. Records issued by earlier versions are read in the wrong price basis or cannot be read, and one unreadable record would stop the invoice page

- **Severity:** low (nothing is live yet; affects development and demo data only)
- **Where:**
  - `packages/db/src/documents.ts:729`: `value: shown.amount - shown.discount`, whatever the earlier note's own price basis.
  - `packages/core/src/credits.ts:79-87`: `creditSource` refuses figures it cannot work out again.
  - `packages/core/src/credits.ts:131-167`: `creditState` throws on an over-credited group.
  - `apps/web/src/app/(app)/invoices/[id]/page.tsx:91-92`: both are called for every issued invoice shown, outside any `try`, and the app has no `error.tsx`.
- **What goes wrong:**
  - **(a) Amount credits from before `f53f4d2`.** Code from `927685d` to `ffc037b` priced every amount credit including VAT. The ledger reads its gross figure as value before VAT. Take a £100.00 plus VAT £20.00 invoice with such a credit of £60.00 (£50.00 plus VAT £10.00):
    - the ledger sees £40.00 left, not £50.00;
    - crediting it gives £40.00 plus VAT £8.00;
    - VAT credited is then £18.00 of £20.00, and £12.00 stays owing;
    - a further amount is refused ("more than is left to credit on this invoice") and so is any line ("more than is left to credit at Standard rate").
  - **(b) A whole-balance credit from the same versions.** A £120.00 amount credit makes `creditState` throw: "Earlier credit notes credit more than was invoiced."
  - **(c) Invoices from before `927685d` with rounding down.** `creditSource` refuses them: "The invoice figures cannot be worked out again." Two examples:
    - 53p at 20% plus 53p at 5%, VAT on the total rounded down: VAT then 12p, today 13p;
    - 1.5 × £33.33, VAT per line rounded down: total then £59.98, today £60.00.
  - **(d) Credit notes from before migration 0005 (by reading).** They have no `credited_line_id`, so their line credits count against the group's value but not against the line's quantity. The same line can then be credited again by quantity, within the group's value.
  - **Consequence of (b) and (c), by reading.** The invoice page would throw on render and show Next's default error page, where only the credit button should be hidden.
- **How confirmed:**
  - (a) and (b): run, probe `R3-2`, with the legacy notes issued by `ffc037b`'s `createCreditNote`. Output: `"ledgerReads":[{"index":null,...,"value":6000}],"valueLeftAsTheLedgerSeesIt":4000,"restNote":{"net":4000,"vat":800,"total":4800},"vatCredited":1800,"balance":1200,"state":"issued","furtherAmount":"credit_exceeds_invoice","furtherLine":"credit_exceeds_group"`, and `"creditStateThrows":"credit_source_mismatch: Earlier credit notes credit more than was invoiced."`.
  - (c): run, `legacy/old-invoice.ts` against an export of `90596ba`.
  - (d) and the page: by reading. The seed issues no amount credits.
- **Suggested fix:**
  - In `creditLedger`, read each note's own `pricesIncludeTax` and convert its lines to the invoice's basis: line net for an invoice priced excluding tax, net plus tax for one priced including it.
  - Take a line credit's group from the invoice line it credits, and refuse loudly when the note line's tax disagrees.
  - From now on, store each group's value and taxes in the invoice snapshot at issue, so crediting never depends on recomputing old figures.
  - On the page, catch a ledger error and say this invoice cannot be credited automatically.
  - Run a one-off check over existing databases before launch.

### R3-L3. Migration 0006 checks a credit note's sequence and the lines that credit invoice lines, but not the printed number, other lines, or a change of kind

- **Severity:** low
- **Where:** `packages/db/migrations/0006_review_2_guards.sql:59-63` (the sequence only), `:40-57` (only lines with a `credited_line_id`), `:18-70` (the draft branch lets `kind` change).
- **What goes wrong:** each of the following was accepted, as `invoica_app`, by direct SQL:
  - **(a)** A credit note issued with the counter's sequence and the number "INV-0001-REISSUE". The printed number is free text.
  - **(b)** A credit note against a £100.00 zero-rated invoice, with one line that credits no invoice line, at VAT 20%, total £100.00 and `tax_total` £16.66. For such lines, only `createCreditNote` checks the tax, the value per group and the price.
  - **(c)** A draft invoice turned into a credit note of another invoice in the same update that issues it (`kind`, `credited_document_id` and `lifecycle` changed together).

  Each needs a code defect to reach, as in R2-L1.

  Nothing legitimate broke:
  - two direct issues for the whole of one line at once: the second was refused;
  - four invoices and a credit note issued at once: all succeeded, numbered without gaps;
  - the seed ran on a fresh database (3 businesses; 15 sent, 2 draft and 1 void invoices, and 1 credit note);
  - the repository's suites pass.
- **How confirmed:** run, probes `R3-4a` to `R3-4e` and `R3-7`. Outputs: `"result":"did not fail"` for (a) to (c); `{"first":"did not fail","second":"A credit note cannot credit more of a line than was invoiced"}`; `["INV-0002","INV-0005","INV-0004","INV-0003","CN-0001"]`; seed `"status":0`.
- **Suggested fix:**
  - Check on issue that `number` is the prefix and padded sequence, or derive it in the database.
  - Make `kind` unchangeable after insert.
  - For a credit note line without a `credited_line_id`, require a tax that appears on the invoice's lines.

### R3-L4. Wording on printed credit notes (concerns only; no legal wording is proposed as settled)

- **Severity:** low
- **Where:** `packages/documents/src/view.ts:163-180`, `:197-205` and `:207-214`; `packages/db/src/documents.ts:875`.
- **What goes wrong:** the statutory content of regulation 15C(6) is present in substance:
  - the number and date;
  - the supplier's VAT number;
  - "Credits invoice INV-… of …" with the reason;
  - the lines;
  - each rate with its VAT;
  - with prices including VAT, or a discount, "Total before VAT".

  Points to put to whoever approves tax wording (CLAUDE.md, "Ask first"), all from the rendered views in probe `R3-5`:
  - **Priced excluding VAT, no discount.** The decrease excluding VAT appears only as "Subtotal". Example, an amount credit: "Subtotal £100.00, VAT 20% £14.29, VAT 5% £1.43, Total credited £115.72". 15C(6)(g) asks for "the amount of the decrease in consideration excluding VAT", and "Subtotal" does not say it excludes VAT.
  - **Priced including VAT.** The column does not add down: "Subtotal £330.00, Loyalty −£33.00, Total before VAT £259.50, VAT 20% included £37.50, Total credited £297.00". Both branches of the label at `view.ts:165` are "Subtotal".
  - **Reverse charge.** A reverse-charge credit note prints the invoice wording: "Reverse charge: customer to pay the VAT to HMRC. VAT 20% of £40.00 on £200.00." On a credit note the customer reduces VAT it has accounted for. `tax-uk.md` section 6 quotes HMRC's example for credit notes, "reverse charge: customer to account for the output tax adjustment of £X to HMRC".
  - **Ghana.** "Total before VAT" is also before NHIL and GETFund Levy, which are separate levies.
  - **Line titles.** An amount credit's title lists the invoice lines it reduces but is cut at 160 characters ("..."), so with many lines it may not identify them all (15C(6)(f)). By reading.
  - **"Zero-rated supplies £72.00"** on a credit note describes a reduction, not a supply.
- **How confirmed:** run (`R3-5uk`, `R3-5gh` in `db-probe.out`), except the truncation, by reading.
- **Suggested fix:** put these to the person who approves tax wording; consider "Total before VAT" on every credit note, and a credit-note form of the reverse-charge sentence.

### R3-L5. "Invoiced this month" can be negative

- **Severity:** low
- **Where:** `packages/db/src/dashboard.ts:77-82`; the dashboard prints it with `formatMoney` (`apps/web/src/app/(app)/dashboard/page.tsx:268` at `f53f4d2`).
- **What goes wrong:** take an invoice of £1,200.00 issued on 28 September and credited in full on 18 October. October shows "Invoiced this month −£1,200.00". This follows `docs/domain.md` ("less the totals of credit notes issued this month"), but the label reads as a gross figure.
- **How confirmed:** run, probe `R3-6`: `{"invoicedThisMonth":[{"currency":"GBP","amount":-120000}]}`.
- **Suggested fix:** decide whether the figure is net sales for the month, and label it so, or show credit notes beside it.

### R3-L6. A stale description of amount credits in the schema

- **Severity:** low
- **Where:** `packages/schemas/src/index.ts:292`: "an amount including tax".
- **What goes wrong:** since `f53f4d2` the amount is in the invoice's price basis (spec, "What a credit note can credit", item 3).
- **How confirmed:** by reading.
- **Suggested fix:** reword the comment.

---

## Checked and found sound

"Run" means a probe or test confirmed it; "read" means by reading the code.

- **Spec criteria, each checked independently (run):**
  1. Crediting the whole invoice reproduces subtotal, discount, net, tax, total and every row exactly: 19,050 random invoices, 0 differences.
  2. Any mix of line and amount credits that empties every group credits every row's base and amount exactly, with sums of totals, tax and net equal to the invoice: 5,729 random invoices with up to seven steps each, in every price basis, tax level and rounding mode; discounts by percent and by amount; standard, reduced, zero-rated, reverse charge, exempt, no-VAT and no-tax lines; Ghana's three components and a compound code; two codes with the same label and rate; a code with a different label and the same rate; unit prices of zero.
  3. No negative tax amount, base, line net, line value, note net or unit price, and no row for a group a note does not credit: 0 in 12,348 notes, nor in the targeted runs.
  4. Line tax shares add up to the note's tax, total is net plus tax, and charged rows add up to the tax total: 0 exceptions.
  5. Refusals were only of the kinds the spec describes: a group with less left than the lines ask for, a quantity whose amount rounds to nothing, and 2-pesewa amounts under a compound code including tax. With nothing paid, crediting everything left was never refused.
  6. Review 2's worked examples: the builder's tests pass. My property runs cover R2-M2's setting (per document, rounded down) with no foreign or negative rows.
  7. An amount credit on an invoice priced excluding VAT is priced excluding VAT (`R3-5`: £71.43 at 20% and £28.57 at 5%, VAT added on top).
  8. The database refuses more of a line than invoiced, including two direct issues at once (`R3-4d`).
- **Checker and planners (run).** `checkCredit` never refused a note the planners produced, except for being above the balance after payments.
- **Very large and very small amounts (run).**
  - Large: 7,500 units at the largest unit price the schemas allow (£10,000,000,000.00), VAT 20%, a total of 9.0 × 10^15 minor units, just under the safe-integer limit. Credited by 0.001 of the line, then an amount at the schemas' maximum, then the rest: totals and VAT exact, no overflow.
  - Small: 1p lines and 1.5 × 1p; a zero-price line is refused on its own ("must be for more than zero") and credited with others.
  - Ghana and compound codes including tax: no final part produced a negative net in 30,000 tries.
- **The ledger from the database (run, `R3-3`).**
  - Through `createCreditNote` and `recordPayment`: 79 random invoices across all twelve settings combinations, 115 credit notes and 31 payments.
  - After each note, `creditLedger` returned the same positions, quantities, values and tax groups as my model.
  - The snapshot totals equalled the plan, and the document's columns equalled the snapshot.
  - `creditableLines` quantities equalled the ledger's.
  - The server's refusals matched the model's in all 53 cases.
  - All 52 invoices credited in full ended with balance zero and every row exact.
  - Codes with the same label and rate formed one group.
  - Legacy and odd data: see R3-L2.
- **`createCreditNote` (read).** It locks the invoice before reading the key, the balance and the ledger. It checks the invoice's lines against its snapshot. It never reads today's tax codes. The foreign key on `(organisation_id, credited_document_id)` stops a credit note against another organisation's invoice.
- **`lockRequestKey` (read, and the builder's test run).** The key is locked before `documentForKey` in both save actions.
- **Migration 0006 and legitimate use (run).** Concurrent issues of invoices and a credit note succeed in order. The seed runs. By reading, the lock order (invoice row, then counter row) cannot deadlock against payments or issues.
- **Dashboard (run).** Credit notes issued in the month are taken off, per currency, drafts and void documents excluded.
- **Printed figures (run).**
  - Credit notes priced including VAT now print "Total before VAT" equal to the note's net.
  - Notes with a discount print it as well.
  - Every charged rate prints its rate and amount.
  - Zero-rated value prints as a note.
  - The invoice number, date and reason print.
- **`computeDocumentDetail` (run and read).** The group values and taxes reproduce the invoice in every setting, so `creditSource` accepted every invoice the current code produces.

## Not checked

- Anything in a browser: the credit dialog and the invoice page. The page failure in R3-L2 and the dialog hint in R3-M1 are by reading.
- `pnpm check` (format, copy rules, lint, types) and `pnpm build`; the PDF templates.
- The `invoica` and `invoica_demo` databases, which were not touched, so whether they hold records affected by R3-L2 is unknown.
- Commits `67acb8a` and `b3314a8`, and the uncommitted plans and entitlements work, which touches `issueDocument`, `createCreditNote` and the snapshot.
- Ghana's statutory content for credit notes (no spec read); VAT in sterling on foreign-currency invoices; the JSON and CSV export of credit notes; performance.
- Crediting an invoice paid in full (review 2's R2-L5), unchanged by design.

## Files produced by this review

All in `../review/round3/`:

- `review-3.md` (this report);
- `db-probe.test.ts` and `db-probe-2.test.ts`, with outputs `db-probe.out`, `db-probe-2.out` and `db-probe.json`;
- `core/ledger-props.test.ts`, `core/targeted.test.ts` and `core/whole.test.ts`, with outputs `core/core-pinned.out`, `core/whole.out`, `core/ledger-props.json`, `core/targeted.json` and `core/whole.json`;
- `legacy/t2-legacy.ts`, `legacy/deposit.ts` and `legacy/old-invoice.ts`, with their `.out` files;
- `baseline-core.out` and `baseline-db.out`;
- `pinned/` (an export of `f53f4d2` with `node_modules` links to the pinned packages) and `legacy/90596ba/` (an export of `packages/core/src` at `90596ba`).

---

## Resolution (builder, 19 October 2026)

The ledger now works slot by slot: each line when tax is worked out per line, each tax code when it is worked out on the total. A slot's tax for what has been credited is the tax on that value alone, worked out with the invoice's rounding and never more than the slot showed; once the whole slot is credited it is exactly what the invoice showed. Each note takes that, less what earlier notes actually took. The spec (`docs/specs/credit-notes.md`) was revised first, with new acceptance criteria 9 to 12. Tests were written first. The eleven core tests in `packages/core/test/credits-review-3.test.ts` were run against the code at `d6bc0a9` and all failed; a twelfth, which checks each slot a note took from, was added after the change, as the earlier code kept no record per slot. The nine database tests in `packages/db/test/review-3.test.ts` were run after the core change and before the database and migration changes, and all failed. The property tests were then run at 6,000 cases each without a failure.

| Finding | Fix |
| --- | --- |
| R3-M1 | A fourth way to credit, "Everything still owed", credits exactly the balance in one note (`planBalanceCredit`, criterion 11). With prices excluding tax it credits the largest value whose note stays within the balance and, when that falls short, one more unit of value with the tax lowered by the difference, at most one unit for each component. With prices including tax it is an amount credit of the balance. The amount hint now gives the most the balance allows ("Up to £49.97 before tax, which keeps the credit note within the £59.97 still owed"). Both review examples (£59.97 after £60.03 paid; £866.67 after a £333.33 deposit) credit exactly. An end-to-end test settles an invoice this way on desktop and phone. |
| R3-L1 | Under VAT per line each line is its own slot, so a whole line credits exactly the tax that line was charged (criterion 9: £200.00 in the review's example, and every line in a property test). Tax on what is credited is worked out on that value, so each slot's tax is within two units of its rate times its base, and each base is the net the note takes (criterion 10). In the review's Ghana example the second note's bases now equal its net (GH₵83.31); NHIL there is GH₵2.09, within a unit of 2.5% of GH₵83.31, because the first note's NHIL was rounded down. The spec records the two-unit bound. |
| R3-L2 | Issued invoices keep their slots in the snapshot, and credit notes keep what they took (`ledger`), so crediting no longer depends on working old figures out again or on reading an earlier note's price basis. An invoice whose credit notes kept no ledger, or whose figures cannot be worked out again, cannot be credited, and its page says why instead of failing (`creditPosition`, criterion 12; checked on a demo invoice with an earlier-version credit note). Invoices without slots whose figures do work out again can still be credited. Converting earlier records was not attempted: nothing is live, and the dev and demo data can be reseeded when Kobby agrees. |
| R3-L3 | Migration `0007_review_3_guards.sql`: a document's kind never changes; on issue, its number must be its prefix and padded sequence; a credit note line that credits no invoice line must use a tax one of the invoice's lines used. Each of the review's three direct-SQL cases is now refused. The seed runs on a fresh database. |
| R3-L4 | Not changed: tax wording is ask-first. The points are in Kobby's open questions. One related change that is not wording: when an amount credit reduces many lines, the line title gives their number and the description names every one, so no line goes unnamed. |
| R3-L5 | When credit notes were issued this month, the dashboard labels the figure "Invoiced this month, less credit notes" and shows what was invoiced and credited beneath it. |
| R3-L6 | The schema comment now describes all four ways to credit and the price basis of an amount. |

Checks after the fixes: core 168, database 71, documents 11, PDF 50, schemas 4, web unit 5 (309 run, 309 passed, 0 failed, 0 skipped); end to end 21 passed and 3 skipped by design, against the development server; lint, types, format and copy rules clean; production build clean. A first end-to-end run against the production server failed four tests on "Too many requests" from the sign-up rate limit, which the production server applies; each passed when run again.
