# Invoica: independent review of the review 4 fixes (review 5)

Reviewer: a separate agent, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 19 October 2026.

## Scope and commit

This review covers commit `6c2bd5f` ("fix: everything still owed settles every balance, bases are the net taken, numbering cannot repeat (review 4)"). It was checked against `docs/specs/credit-notes.md` (criteria 1 to 15), decision `0009-credit-ledger-by-slot.md`, `docs/specs/plans.md` and the resolution of review 4 (`docs/reviews/review-4.md` at HEAD). In order of priority:

1. `packages/core/src/credits.ts` as changed by `6c2bd5f` (compared with `ef7f173`): `slotTaxAt`, `buildNote`, `planBalanceCredit`, `settleLines`, `settleExcludingTax`, `settleIncludingTax`;
2. `packages/db/migrations/0008_review_4_guards.sql`;
3. `packages/db/src/organisations.ts` (`getOrganisationForIssue`, `assertNumbersDoNotRepeat`) and their use in `issueDocument` and `createCreditNote`;
4. `createCreditNote` amount-line titles and descriptions (`lineRanges`), `clientsForEditor`; by reading only: `apps/web/src/components/invoice-editor.tsx`, `apps/web/src/components/settings-form.tsx`, `apps/web/src/app/(app)/invoices/[id]/page.tsx`.

Every probe ran against an export of `6c2bd5f` made with `git archive` at `../review/round5/pinned`. As in review 4, its `node_modules` folders hold links that point `@invoica/*` at the pinned packages and everything else at the repository's installed packages.

The repository moved during the review: `daae396` (lists read summary columns; migration `0009_credited_index.sql`) and `d0f15dd` (docs). `git diff 6c2bd5f HEAD` shows no change to `credits.ts`, `totals.ts`, `organisations.ts`, migration 0008, `createCreditNote`, `issueDocument` or the web files above. The findings apply to HEAD too, by reading. An untracked `packages/db/perf.tmp.mts`, written at 04:31 by another session, was present early in the review and gone by its end; I did not touch it.

Line numbers are for `6c2bd5f`.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| `pnpm test:core` | repository at `81f8241` (packages identical to `6c2bd5f`) | 179 run, 179 passed, 0 failed, 0 skipped (16 files) |
| `pnpm test:db` | repository at `81f8241` | 79 run, 79 passed, 0 failed, 0 skipped (8 files) |
| Pinned core and database suites | `pinned/packages/core`, `pinned/packages/db` | 179 passed; 79 passed |
| Core property probe `core/ledger-props.test.ts` | pinned | 7 tests, 8,000 cases each: 37,629 invoices with random sequences (70,436 credit notes), 7,524 invoices credited whole, 7,834 invoices for criteria 5 and 7 |
| Core targeted probes `core/targeted.test.ts` | pinned | 14 tests (T1 to T12), each asserting what it observed |
| Sensitivity check `core/sensitivity/` | the same driver against review 4's export of `c886cbb` | 4 of 7 fail, as they should: it finds R4-L1 and R4-L2 there |
| Database probes `db-probe.test.ts` | pinned, fresh databases | 23 run, 23 passed, each asserting what it observed |

How to rerun them:

- Core: `cd ../review/round5/core && RUNS=8000 node node_modules/vitest/vitest.mjs run --root ../review/round5/core --testTimeout=7200000 --reporter=verbose ledger-props.test.ts`, then the same command with `targeted` as the filter (about three minutes).
- Sensitivity: the same command with `RUNS=1500` and the filter `sensitivity/ledger-props-29703eb`. It needs `../review/round4/pinned`.
- Database: `cd ../review/round5 && TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres node node_modules/vitest/vitest.mjs run --root ../review/round5 --no-file-parallelism --testTimeout=600000 --hookTimeout=300000 --reporter=verbose db-probe`.

Each database run creates and drops its own databases through `createTestDatabase`; the seed probe makes a second one. After the last run no `invoica_test_` database was left. The `invoica` and `invoica_demo` databases were not touched. Three probes also connect as the superuser to their own test database: D4d to take a table lock as a timing device, and D7 and the seed probe to read stored figures.

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 0 | |
| Medium | 0 | |
| Low | 6 | R5-L1 to R5-L6 |

The review 4 findings on the ledger are fixed. In the random and targeted runs:

- every invoice credited whole reproduced every figure, and every whole line under VAT per line credited exactly its own tax;
- every base was the net taken, and no note had a negative figure;
- every fully credited invoice ended with every tax row exact, including after a settling note whose payment was then removed (criterion 14);
- "everything still owed" never failed with prices including tax, including 157,746 balances of one to three units after earlier amount credits on Ghana invoices (criterion 13) and 72,120 repeated small settlements;
- planning stayed fast on the largest figures and on 200-line invoices.

Migration 0008 refuses the review 4 case and the legitimate flows all pass under it. No deadlock occurred under concurrent issues, credit notes, payments, client creation and settings saves.

What remains:

- **R5-L1.** With prices excluding tax (how onboarding sets up a Ghana business) and several taxes in a code (Ghana's levies), a pesewa can be left that nothing can credit. It takes a settling note made while one or two pesewas were paid, that payment removed, and a new payment a pesewa short.
- **R5-L2.** Migration 0008 can still be passed by direct SQL: a tax total with no rows, the same row twice, negative or missing amounts, and a counter moved forward.
- **R5-L3.** The new numbering check reads without a lock. A prefix change saved during an issue can still repeat a number, and a save that changes nothing about numbering can be refused with "INV-0001 is already used".
- **R5-L4.** The invoice and credit note series can share a prefix, so two documents print the same number.
- **R5-L5.** A total above 2^53 minor units (about £90 trillion) is stored a unit away from its net plus tax.
- **R5-L6.** Smaller points: Ghana's default price basis in the spec, criterion 10 for extreme codes, the amount hint, two wording points, tax-only notes.

---

## Findings

### R5-L1. A pesewa of levy left on an emptied slot cannot be credited when the balance is smaller than it

- **Severity:** low
- **Where:**
  - `packages/core/src/credits.ts:642-652`: `planBalanceCredit` takes the tax left on slots whose value is all credited only when all of it fits within the balance (`:645`). Otherwise it plans without that tax (`:652`).
  - `packages/core/src/credits.ts:712-731`: a settling note lowers tax by at most one unit per component, and only on a unit of value it adds. With no value left anywhere, nothing reaches the balance and the note is refused (`:726-731`).
  - Spec, "Everything still owed", and criterion 11: "After any part payment, 'everything still owed' credits exactly the balance in one note."
- **What goes wrong:**
  - **(a)** A settling note that empties a slot can lower two levies on its last unit. The two pesewas then left can only be credited together.
  - **Worked example (probe D1b).** A Ghana business with the settings onboarding gives it (D1a): tax on the total, half up, prices excluding tax.
    - INV-0001: 1 × GH₵1.00 at the Standard rate. NHIL 0.03, GETFund Levy 0.03 and VAT 0.15, each on GH₵1.00. Total GH₵1.21.
    - CN-0001, an amount credit of GH₵0.99, leaves GH₵0.01 of value with NHIL 0.01 and GETFund 0.01 still to credit. The balance is GH₵0.03.
    - The client pays GH₵0.02. "Everything still owed" issues CN-0002 for GH₵0.01: NHIL, GETFund and VAT each 0.00 on 0.01. The slot has no value left and still owes NHIL 0.01 and GETFund 0.01.
    - The payment is removed ("Payment reversed by the bank"). The balance is GH₵0.02, which "everything still owed" would credit exactly (D1c), so criterion 14 holds.
    - The client pays again, a pesewa short: GH₵0.01. The balance is GH₵0.01.
    - "Everything still owed" is refused: "The balance cannot be credited exactly in one note. Credit an amount instead."
    - An amount credit of GH₵0.01 is refused: "This is more than is left to credit on this invoice."
    - A line credit of 0.001 would take both levies (GH₵0.02) and is refused: "A credit note cannot be more than the balance still owed."
    - On 31 December the invoice still owes GH₵0.01, is part paid, and shows as overdue.
  - **How often.**
    - T1, for every price from GH₵0.01 to GH₵30.00, both tax levels: credit all but one to three units, pay one to four, settle, remove the payment, pay all but one to three, settle. Refused: 225 of 8,247 sequences for Ghana and 135 of 8,426 for a levy with VAT compounded on it.
    - The first settling note empties the slot only when the payments at that moment total no more than the number of taxes in the code (here two pesewas), so this is rare.
    - Single-rate codes are not affected: none in 34,077 sequences of deposit, settle, deposit removed and paid again one to three units short, on UK settings (T6), and none in the random runs.
  - **(b) Codes with high rates, which the schema allows.** A slot that keeps value can also owe one lowered unit while its next unit of value brings its own rounding step. At rates of 50% or more that cannot be absorbed within one unit per component.
    - T5, 30,000 random codes: 495 of 87,253 settling notes refused. All but one had a rate of 50% or more. The other is the mechanism in (a): taxes of 15%, 20% and 15% compounded, with £0.02 of tax left on an emptied slot and £0.01 owed.
    - None of the 32,572 settling notes with codes whose rates add up to 30% or less was refused.
    - Example: one tax at 100%, tax on the total rounded down, lines of £346.89 and £1.21. After earlier notes the slot has £151.41 of value and £151.42 of tax left, and a balance of £0.01 is refused.
- **How confirmed:** run.
  - Database: probe D1b, output in `db-probe.json`: `"balanceAfterRemoval": 2`, `"balanceBefore": 1`, the three refusals, `"onDec31": {"balance": 1, "state": "part_paid", "overdue": true}`.
  - Core: `core/targeted.test.ts` T1 and T1-frequency, T5, T6, in `core/targeted.json`.
- **Suggested fix:**
  - Let a settling note take part of the tax left on emptied slots, one unit per component, up to the balance.
  - Let it take a slot's lowered unit without taking value.
  - Test: criterion 11 after criterion 14's removal, for every part payment of one to five units, on a code with several taxes and prices excluding tax.

### R5-L2. Migration 0008 can still be passed by direct SQL

- **Severity:** low (needs a code defect or direct SQL)
- **Where:**
  - `packages/db/migrations/0008_review_4_guards.sql:89-113`.
  - The tax check compares each of the note's rows with the invoice's row less earlier notes. Rows of the same note are not added together.
  - Nothing ties `tax_total` to the rows, and negative or missing amounts are not refused.
  - `number_counter` is updatable by the app role (`0002_tenancy.sql:241`).
- **What goes wrong:** as `invoica_app`, against an invoice of £100.00 plus VAT £20.00, each of these was accepted:
  - **(a)** (D2b) a credit note of £120.00 with `tax_total` £120.00 and no tax rows;
  - **(b)** (D2c) a note with two VAT rows of £20.00 on £100.00 each: £40.00 of VAT credited against £20.00 charged;
  - **(c)** (D2d) a first note with VAT −£20.00 on −£100.00 (total £1.00), then a second with VAT £40.00 on £200.00 (total £119.00);
  - **(d)** (D2e) a row whose amount and base are null;
  - **(e)** (D2f) `next_value` moved forward by five, after which issuing gave INV-0008 then INV-0014, a gap in the sequence.

  These cases are refused as intended: R4-L5's case, a row above the invoice's (D2a), more of a line than invoiced, a line of another invoice, and a total that is not the snapshot's (D2g). The app's own checks (`createCreditNote`, `checkCredit`) keep it from writing the accepted cases, so this is defence in depth, as R4-L5 was.
- **How confirmed:** run, probes D2a to D2g: `"result": "did not fail"` for (a) to (d), and `{"before": "INV-0008", "after": "INV-0014"}` for (e).
- **Suggested fix:**
  - In the trigger, sum the new note's rows by key with the earlier notes' rows before comparing.
  - Require `tax_total` to equal the sum of the charged rows.
  - Require every amount and base to be a non-negative JSON number.
  - Let `number_counter` move only by one at a time, for example through a function the app role calls.

### R5-L3. The numbering check reads before it locks: a change can still repeat a number, and an unrelated save can be refused

- **Severity:** low
- **Where:**
  - `packages/db/src/organisations.ts:107-131`: `assertNumbersDoNotRepeat` reads the counter (`:112-116`) and the used numbers (`:117-120`) in two statements, before the update at `:146-148` takes the organisation row.
  - Issues hold that row for share from `getOrganisationForIssue` (`:93-101`) to commit.
- **What goes wrong:**
  - **(a) A repeating prefix gets through (D4c).**
    - The prefix is "Q1" with padding 1, and an invoice is being issued: it holds the organisation row and waits for the counter.
    - Meanwhile the prefix is saved as "Q". The check finds no used number, and the save waits for the row.
    - The issue commits as Q11, then the save commits.
    - Q2 to Q10 follow. The eleventh issue fails: "duplicate key value violates unique constraint document_organisation_id_kind_number_key". As review 4 noted, the app shows that as "Something went wrong and nothing was saved. Try again.", and every retry fails the same way.
    - The same save made afterwards is refused ("Q11 is already used…"), which shows the check would have caught it with a lock.
  - **(b) A save that does not touch numbering is refused (D4d).**
    - A save of new default notes, during which an issue commits between the check's two reads, is refused: "INV-0001 is already used, and this prefix would number a later invoice the same. Choose another prefix."
    - The counter read saw sequence 1 as next, and the numbers read saw INV-0001. A retry succeeds.
    - In D5 (twelve workers for 15 seconds, about one operation in nine a settings save), 15 and 31 saves were refused this way, in runs of 1,798 and 1,855 operations.
- **How confirmed:** run.
  - D4c: `"first": "Q11", "saved": "did not fail", "blocked": "duplicate key value …"`.
  - D4d: `"saved": "INV-0001 is already used, …", "retry": "did not fail"`.
  - D5: `"6: numbering_repeats"` counts in `db-probe.json`.
- **Suggested fix:** take the organisation row for update at the start of `updateOrganisationProfile`, then read the counters and used numbers. Issues take the row before they number, so none can land in between, and (a) and (b) both go.

### R5-L4. The invoice and credit note series can share a prefix, so two documents print the same number

- **Severity:** low
- **Where:**
  - `packages/schemas/src/index.ts:131-132`: the same prefix rule for both series, with no comparison between them.
  - `assertNumbersDoNotRepeat` compares each series only with its own documents (`organisations.ts:117-120`, `eq(document.kind, kind)`).
  - The unique key is per kind (`0001_init.sql`, `unique (organisation_id, kind, number)`).
- **What goes wrong:**
  - With both prefixes set to "DOC-" through `updateOrganisationProfile`, the invoice is DOC-0001 and its credit note is DOC-0001 too (D4a).
  - Their PDFs are both named `DOC-0001.pdf` (`apps/web/src/lib/jobs.ts:42`, `apps/web/src/app/(app)/invoices/[id]/pdf/route.ts:16`).
  - Prefixes where one is the other followed by digits collide later in the same way: invoice prefix "A" at sequence 10001 and credit note prefix "A1" at sequence 1 both print A10001 with padding 4 (by reading).
  - The settings hints show the same next number for both series without a warning (by reading).
- **How confirmed:** run, D4a: `{"invoice": "DOC-0001", "creditNote": "DOC-0001"}`; the rest by reading.
- **Suggested fix:** check each series' future numbers against the other series' used numbers as well, and refuse equal prefixes.

### R5-L5. A total above 2^53 minor units is stored a unit away from its net plus tax

- **Severity:** low (about £90 trillion)
- **Where:** `packages/core/src/totals.ts:370`, `const total = netTotal + taxTotal`, a plain addition. Line amounts, the net and the tax are each checked by `sumMinor`; their sum is not. `balance` at `:390` is the same.
- **What goes wrong:**
  - **Worked example (D7 and T11).** VAT on the total, half even.
    - Lines: 7,089.749 × £297,285,675.73 at No VAT, and 7,500 × £10,000,000,000.00 at 20%. Each is within the schemas.
    - Net £77,107,680,822,221.09 and VAT £15,000,000,000,000.00.
    - The issued invoice stores a total of £92,107,680,822,221.08, a penny less than its net plus VAT.
    - "Everything still owed" is refused: "A credit note must be for more than zero."
  - In the large-figure property run, 40 of 7,512 invoices passed 2^53. On those, credits did not add up to the rows (a VAT base of 74,999,999,999,999.99 against 75,000,000,000,000.00) and settling was refused with "sum is too large.". The other 7,472 large invoices showed no problem.
- **How confirmed:** run, D7 (`"total": "9210768082222108"`, `"netPlusTax": "9210768082222109"`) and T11; the property run's counts in `ledger-props.json` (`"totalsPast2pow53Skipped": 40`).
- **Suggested fix:** add the net and tax with `sumMinor`, and check the balance the same way, so such an invoice is refused as too large. Test at the schema maxima.

### R5-L6. Smaller points: Ghana's default price basis, criterion 10 for extreme codes, the amount hint, wording, tax-only notes

- **Severity:** low
- **(a) Ghana's defaults in the spec.**
  - Criterion 13 and review 4 describe Ghana's defaults as "tax on the total, prices including tax".
  - A Ghana business onboarded through `createOrganisation` prices excluding tax (D1a: `pricesIncludeTax: false`). It sets the tax level and rounding from the country (`organisations.ts:54`) and leaves the price basis at the column's default, false (`0001_init.sql:78`).
  - Both bases settle balances of one to three units after any earlier amount credit (T7: about 80,000 tries for each tax level and basis, none refused). R5-L1 needs prices excluding tax.
  - Suggested: decide the default and make the spec say it.
- **(b) Criterion 10 for codes the schema allows.**
  - 289 settling notes in T5 were more than two units from rate times base, at most five units, all with rates of 50% or more.
  - Example: taxes of 15%, 20%, 5% and 50%, prices including tax, tax on the total rounded down: the 50% tax is £123.50 on a base of £246.95, 2.5 units from rate times base.
  - The invoices' own rows stayed within two units (T8, 20,000 invoices, worst 2.0). No settling note on a code whose rates add up to 30% or less passed two units (worst 2.0).
  - Suggested: say in the spec which codes the bound covers, or bound the rates the schema accepts.
- **(c) The amount hint with prices including tax** (`credits.ts:620-623`) is the balance itself and can be refused.
  - GH₵10.07 including tax, GH₵5.03 credited, GH₵0.01 owed: the hint offers GH₵0.01, and that amount credit is refused with "This credit is too small to split into its tax and the rest."
  - "Everything still owed" credits it.
  - 114 of 65,160 hints for balances of 1 to 12 pesewas (T12). The spec says the hint gives "the largest amount whose credit note stays within the balance".
  - Suggested: step the hint down until it plans.
- **(d) Wording.**
  - When the one line reduced has a title over 160 characters, the amount line reads "Reduction on INV-0001: 1 lines", with the description "Invoice lines 1: …" (D6c, `documents.ts:926-935`).
  - The prefilled email of a fully paid or credited invoice reads "Please find attached invoice INV-0001. The amount still owed is £0.00, due …". The send button is offered for every invoice that is not void (`invoices/[id]/page.tsx:85-89`, `:121`). By reading.
- **(e) Tax-only and zero-tax settling notes,** for whoever approves tax wording (not settled here).
  - D1b's CN-0002 credits GH₵0.01 of standard-rated value with NHIL, GETFund and VAT all 0.00.
  - D1c's CN-0003 credits NHIL 0.01 and GETFund 0.01 on a base of 0.00, through one line titled "Reduction on INV-0001", at a unit price of 0.00, with a tax but no tax code (`taxCodeId` null, `documents.ts:930`, `:940`).
- **How confirmed:** (a) to (c) and the first part of (d) run, in D1a, T5, T7, T8, T12 and D6c; the email by reading; (e) run, D1b and D1c.

---

## Checked and found sound

"Run" means a probe confirmed it; "read" means by reading the code.

- **The spec's criteria, each checked independently (run).** The random runs used:
  - tax per line and per document;
  - rounding half up, half even and down;
  - prices excluding and including tax;
  - percentage and amount discounts;
  - standard, reduced, 17.5%, zero-rated, reverse-charge, exempt, no-tax and outside-scope lines;
  - Ghana's three components from `presetFor('GH')`, a compound code, and two codes with the same rate and different labels;
  - zero-price lines;
  - quantities from 0.001 to 7,500 and prices up to £10,000,000,000.00;
  - random line, amount, "everything still owed" and hint credits, with payments of any size, payments leaving one to five units, and payments removed at any point.

  At the end of every sequence all payments were removed and "everything still owed" credited the rest. Each criterion:
  1. The whole invoice in one note reproduced every figure and row: 7,524 invoices. `checkCredit` accepted each.
  2. Every fully credited invoice ended with every row's base and amount, and the net and tax, exact: all 13,249 final settlements and every sequence that credited everything.
  3. No negative tax, base, line figure, net, value or unit price, and no row for a slot not credited, in 70,436 notes and the 4,800 of T2.
  4. Line tax shares add up to the tax total, the total is net plus tax, and charged rows add up to the tax total, in every note.
  5. One unit above what is left is refused with the matching reason: 27,448 quantities, 7,834 amounts, 7,834 balances, 7,066 slots taken by an amount credit.
  6. Review 2's worked examples: the builder's tests pass.
  7. Amount credits excluding tax have a net equal to the amount and tax on top: 3,851 cases.
  8. The database refuses more of a line than invoiced, and a line of another invoice (D2g).
  9. Whole lines under VAT per line credit exactly their own tax: 14,742 lines, one note each, in reverse order.
  10. Each base is the net taken, and each tax is within two units of rate times base. The largest gap was 1.8 units in the random runs and 1.7 in T4, which covers 153,479 sequences on VAT on the total rounded down. The exceptions are the extreme codes in R5-L6(b).
  11. "Everything still owed" was exact on every attempt in the random runs: 18,566 settling notes during the sequences and 13,249 at their end. The exceptions are R5-L1.
  12. A credit note without a ledger stops further credits with the reason shown (D2e).
  13. Balances of one to three units after any earlier amount credit settle, prices including tax: 157,746 tries (T7), and 72,120 repeated settlements on one slot (T2).
  14. After a settling note, removing its payment leaves a balance a second note credits exactly, with every row exact: D3a (review 4's R4-L2 example, now 64p credited exactly) and every sequence.
  15. The database refuses lines at another price or tax, figures that are not the snapshot's, and rows above what the invoice charged (D2a, D2g). The gaps are R5-L2.
- **`buildNote` (run, read).**
  - Bases come from the net by construction, and their sums equal the invoice's once a slot is credited in full.
  - With prices including tax, what is left of a slot never held more tax than value after any note: the driver checks this after every note.
  - The settling adjustments stay within one unit per component. No settling note with prices including tax was refused in the random or targeted runs.
- **`settleIncludingTax` and `settleExcludingTax` (run).**
  - Prices including tax: no settlement refused in 4,800 small balances spread over 5 to 30 Ghana slots per line (T2), and none of 1,200 on 200-slot invoices (T9).
  - Prices excluding tax: the residue path and the slot order kept every UK deposit sequence exact (T6, 34,077 sequences).
  - Amount and line credits on single-tax codes after a settlement with prices including tax were never refused as too small (T10: 111,191 amounts, 44,821 lines).
- **Timing and termination (run, read).**
  - 7,500 units at £10,000,000,000.00 (£90,000,000,000,000.00 with VAT): `amountLimit` 2.5 ms, "everything still owed" 3.2 ms; Ghana including tax 0.3 ms.
  - 200 lines under VAT per line: worst 104 ms over random balances, `amountLimit` up to 69 ms.
  - 200 Ghana slots including tax: worst 6 ms.
  - The loop in `settleExcludingTax` adds one unit of value per pass and its total rises each time, so it ends; `settleIncludingTax` tries at most 6 moves for each other slot.
- **Database, legitimate use under 0008 (run).**
  - Every kind of credit note issued: whole, lines, amount, and "everything still owed" before and after a payment was removed. This held under VAT per line and on the total, for both price bases, with two codes labelled "Standard rate" at 20%, a reverse-charge line and a zero-rated line, and for Ghana in both bases including a balance of one pesewa. All 32 notes issued, and every invoice ended at a balance of 0 (D3b).
  - The seed ran on a fresh database: 15 sent, 2 draft and 1 void invoices, and 1 credit note with a ledger (D3c).
  - The tax-only note of D1c issued and the invoice ended credited.
- **Numbering (run).**
  - The repeat check is exact for padding changes and new prefixes. "INV-" with padding 4 to padding 1 and back, and "INV-0" with padding 3, are allowed. "INV-1" to "INV-" is refused at INV-1013, the first number that would repeat (D4b).
  - A prefix change saved during an issue waits for it (the builder's test).
- **Locks (run).**
  - Twelve workers issued invoices, credit notes of three kinds, payments, payment removals, clients and settings saves on one organisation for 15 seconds, with plans off and enforced. About 1,800 operations per run gave no deadlock and no lock timeout, every failure was a refusal the app describes (apart from R5-L3(b)), p99 was about 0.3 s and the worst 0.5 s (D5).
  - With an issue held open, a payment was not delayed (30 ms). A settings save and a client creation waited for it (about 1.5 s each). Client creation takes the organisation row for update on every plan, also with plans not enforced (`packages/db/src/plans.ts:34`).
- **Amount-credit titles (run).**
  - 200 lines with 500-character titles under two codes, four lines credited in full: "Reduction on INV-0001: 96 lines" with "Invoice lines 7, 9, 13, 15, …", and "…: 100 lines" for the other code. The descriptions fit (448 and 463 characters). Review 4's R4-L3 is fixed.
- **`clientsForEditor` (run).** Active clients by name, then archived ones, marked. On the free plan an archived client can still be invoiced (D6b).
- **Web, by reading.**
  - The editor lists archived clients under "Archived clients", and a preselected archived client is now found (`newDraftState` searches the full list).
  - The settings hints use the real next sequences.
  - The prefilled email states the current balance when it differs from the balance at issue.

## Not checked

- Anything in a browser: the editor, the settings page, the credit dialog and the invoice page.
- `pnpm check`, `pnpm build`, the end-to-end suite and the PDF templates.
- The commits after `6c2bd5f` (`daae396`, `d0f15dd`), beyond the `git diff` noted under "Scope and commit". This includes the list queries and migration 0009.
- Ledgers written by `c886cbb` and earlier, read by the new code (development data only, per decision 0009).
- Concurrency across several organisations, and any connection limit or statement timeout in production.
- The `invoica` and `invoica_demo` databases, which were not touched.
- Tax wording beyond the concerns listed; Ghana's statutory content for credit notes.

## Files produced by this review

All in `../review/round5/`:

- `review-5.md` (this report);
- `baseline-core.out` and `baseline-db.out` (repository suites), `pinned-core.out` and `pinned-db.out` (pinned suites);
- `db-probe.test.ts`, with outputs `db-probe.out` and `db-probe.json`;
- `core/model.ts` (fixtures and an independent driver), `core/ledger-props.test.ts` and `core/targeted.test.ts`, with outputs `core/ledger-props.out`, `core/ledger-props.json`, `core/targeted.out` and `core/targeted.json`;
- `core/sensitivity/` (the same driver pointed at review 4's export of `c886cbb`, with its output);
- `pinned/` (an export of `6c2bd5f` with `node_modules` links to the pinned packages), `node_modules/` and `core/node_modules/` (folders of links).

---

## Resolution (builder, 19 October 2026)

Tests were written first and run before each change: four of the five tests in `packages/core/test/credits-review-5.test.ts` failed (the fifth, Ghana under either price basis, already held, as the review found) and all seven in `packages/db/test/review-5.test.ts` failed. The spec (`docs/specs/credit-notes.md`) gained criteria 16 and 17, and criteria 10, 13 and 15 were revised. The credit property tests (`credits.test.ts` and `credits-review-3.test.ts` to `credits-review-5.test.ts`) were then run at 6,000 cases each without a failure.

| Finding | Fix |
| --- | --- |
| R5-L1 | (a) When the tax left on fully credited slots is more than the balance, "everything still owed" takes as much of it as the balance, so the review's last pesewa credits. (b) A settling note may lower a unit's tax by up to what that unit added, so codes with rates of 50% or 100% settle too; below 100% that is still at most one unit for each component. A property test settles, reverses the payment, pays part again and settles twice more over Ghana's code, a compounded levy, 20%, 50%, 100% and four taxes with two compounded, ending with every row exact. |
| R5-L2 | Migration `0010_review_5_guards.sql`: a credit note's tax rows must be whole numbers of zero or more, its tax total must be the sum of its charged rows, and its rows are added up by tax with earlier notes before they are compared with the invoice. A number counter moves one at a time. Each of the review's five direct-SQL cases is refused. The seed runs on a fresh database. |
| R5-L3 | Saving settings now takes the organisation row first, then checks the numbers, so an issue in progress finishes before the check and is counted. A save that does not change numbering can no longer be refused by an issue landing between two reads. |
| R5-L4 | Invoice and credit note prefixes are refused when they are equal or one is the other followed by digits, and each series' future numbers are checked against the numbers used by both. |
| R5-L5 | A document's total and balance go through the safe-number check, so an invoice past the safe range is refused as too large. |
| R5-L6 | (a) Criterion 13 now covers both price bases; onboarding's default for Ghana (prices excluding tax) is left as it is and listed for Kobby. (b) Criterion 10's two-unit bound is stated for codes whose rates add up to 30% or less. (c) With prices including tax the amount hint steps down past any amount too small to split. (d) One long line reads "Reduction on INV-0001: line 1" with "Invoice line 1: …"; the prefilled email for an invoice with nothing owed says so; a note that takes only tax left on a slot carries that slot's tax code. (e) Listed for Kobby with the other wording questions. |

Checks after the fixes: core 184, database 86, documents 11, PDF 64, schemas 4, web unit 8 (357 run, 357 passed, 0 failed, 0 skipped); end to end 29 passed and 3 skipped by design; lint, types, format and copy rules clean; production build clean.
