# Invoica: independent review of the review 5 fixes (review 7)

Reviewer: Claude, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 19 October 2026.

## Scope and commit

This review covers commit `5b3ae43` ("docs: review 6 and the sign-in branch in the blueprint and handover") on `main`, and within it the changes made for review 5 at `af2cf2b` and for review 6 at `8ad8ebe`. It was checked against `docs/specs/credit-notes.md` (criteria 1 to 17) and the resolution of review 5 (`docs/reviews/review-5.md`). In order of priority:

1. `packages/core/src/credits.ts`: `planBalanceCredit` taking part of the tax left on fully credited slots (`takeTaxLeft`), the cut in `settleExcludingTax` of up to what the unit added, and `amountLimit` stepping down with prices including tax; `packages/core/src/totals.ts`: total and balance through `toSafeNumber`;
2. `packages/db/migrations/0010_review_5_guards.sql`: the credit note tax row checks and the number counter trigger;
3. `packages/db/src/organisations.ts` (`updateOrganisationProfile`, `assertNumbersDoNotRepeat`) and `packages/db/src/documents.ts` (`listDocuments`, `getDocument`, amount-line titles and tax codes);
4. by reading only: `apps/web/src/proxy.ts`, `apps/web/src/app/(app)/invoices/page.tsx`, `apps/web/src/lib/secret.ts`.

Every probe ran against an export of `5b3ae43` made with `git archive` at `/home/claude/review/round7/pinned`. As in reviews 5 and 6, its `node_modules` folders hold links that point `@invoica/*` at the pinned packages and everything else at the repository's installed packages. No cache folder is linked into the repository.

The repository moved during the review. At the start the working tree had uncommitted changes to `apps/web/src/app/(app)/dashboard/page.tsx`, `docs/domain.md` and `docs/reviews/review-3.md`; later `e0b55d2` committed the first two and the third was gone. `git diff 5b3ae43 HEAD` touches only those two files, so the findings apply to HEAD as well. I did not touch any of them.

Line numbers are for `5b3ae43`.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| `pnpm test:core` | repository working tree at `5b3ae43` (packages unchanged) | 184 run, 184 passed, 0 failed, 0 skipped (17 files) |
| `pnpm test:db` | repository working tree at `5b3ae43` | 89 run, 89 passed, 0 failed, 0 skipped (10 files) |
| Pinned core and database suites | `pinned/packages/core`, `pinned/packages/db` | 184 passed; 89 passed |
| Core property probe `core/ledger-props.test.ts` | pinned | 6 tests, 6,000 cases each: 25,640 invoices with random sequences (47,678 credit notes, 21,616 notes for everything still owed, 4,312 amount hints, 8,989 final settlements); 5,679 invoices credited whole with 11,386 whole lines |
| Core targeted probes `core/targeted.test.ts` | pinned | 8 tests (T1 to T6, T5b, T5c), each asserting what it observed |
| `core/hint-example.test.ts`, `core/negative-net.test.ts` | pinned | the worked examples of R7-L2 and R7-L4 |
| Database probes `db-probe.test.ts` | pinned, fresh databases | 15 run, 15 passed, each asserting what it observed |

How to rerun them:

- Core: `cd /home/claude/review/round7/core && RUNS=6000 node node_modules/vitest/vitest.mjs run --root /home/claude/review/round7/core --testTimeout=7200000 --reporter=verbose ledger-props`, then the same command with `targeted`, `hint-example` or `negative-net` as the filter (targeted takes about three minutes).
- Database: `cd /home/claude/review/round7 && TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres node node_modules/vitest/vitest.mjs run --root /home/claude/review/round7 --no-file-parallelism --testTimeout=600000 --hookTimeout=300000 --reporter=verbose db-probe` (about 50 seconds).

The property probe seeds fast-check afresh on each run, so counts differ a little between runs; the targeted probes use fixed seeds. Each database run creates and drops its own databases through `createTestDatabase`, and the seed probe makes a second one. After the last run no `invoica_test_` database was left. The `invoica` and `invoica_demo` databases were not touched. Three probes also connect as the superuser to their own test database, with triggers and foreign keys switched off for that transaction, only to build fixtures the app cannot write: E2d moves a counter to 9,998, and E5 writes a payment and a credit note that point across businesses.

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 0 | |
| Medium | 0 | |
| Low | 5 | R7-L1 to R7-L5 |

The review 5 findings are fixed:

- R5-L1's example now settles: after GH₵0.99 credited, a pesewa settled, the payment reversed and GH₵0.01 paid again, "everything still owed" issues a note of GH₵0.01 (GETFund Levy 0.01 on a base of 0.00), and after a second reversal a last note takes the NHIL pesewa. Every row ends exact (T1, E2a).
- No settlement with UK or Ghana codes was refused in any run: 21,616 notes for everything still owed during the random sequences and 8,989 at their end (UK, Ghana, high-rate and random codes), 22,766 with random codes (T3) and 9,278 against tax left on emptied slots (T4). Of 579,310 settlements in the criterion 16 sweep (T2), 8 were refused, all on five taxes compounded at 100% (R7-L3).
- Migration 0010 refuses review 5's R5-L2 cases (a) to (d), decimal and text amounts, a counter that jumps or goes back, and an upsert that resets it.
- The numbering check now waits for an issue in progress and refuses the repeat it used to let through (E3a); no save that left numbering alone was refused in 110 saves made while issues committed (E3b); the two series can no longer share a prefix.
- No deadlock in 3,275 concurrent operations with settings saves and prefix changes included. The lists match `getDocument` in every state that the invoices page shows, and no figure from another business reached a list, even with rows forged across businesses.

What remains:

- **R7-L1.** Migration 0010 can still be passed by direct SQL: a note with no tax rows and no tax for the whole £120.00 of a £100.00 plus £20.00 VAT invoice, a VAT row marked as not charged, and a counter moved forward one step at a time.
- **R7-L2.** The amount hint can say "Up to GH₵0.00" while a large amount could be credited, with Ghana's own codes and prices including tax.
- **R7-L3.** Criterion 16 does not hold for the codes it names (several taxes, taxes on taxes, rates up to 100%) with prices including tax and rounding down; and criterion 10's "a few units" reaches 15 units on such codes, also on notes that do not settle.
- **R7-L4.** With codes of five taxes at a third or more each, an invoice priced including tax shows a negative net and negative tax bases, and every credit on it is refused with a reason that blames an earlier version.
- **R7-L5.** Smaller points: a draft's balance in the list leaves out its deposit, a settings save now holds up payments, and three points from reading the web files.

---

## Findings

### R7-L1. Migration 0010 can still be passed by direct SQL

- **Severity:** low (needs a code defect or direct SQL)
- **Where:**
  - `packages/db/migrations/0010_review_5_guards.sql:91-142`: the checks cover the tax rows only. Nothing ties the note's net (its total less its tax total) to what the invoice charged before tax, and the `charged` flag of a row is taken from the note itself.
  - `0010_review_5_guards.sql:175-185`: `guard_number_counter` checks each update moves by one; nothing ties a step to an issued document.
- **What goes wrong:** as `invoica_app`, against an invoice of £100.00 plus VAT £20.00 (total £120.00):
  - **(a)** (E1b) a credit note of £120.00 with tax total £0.00 and no tax rows was accepted. The invoice shows as credited with a balance of £0.00; its VAT row of £20.00 is never credited, and £120.00 has been credited before tax against £100.00 invoiced. Further credits are refused because the forged note keeps no ledger.
  - **(b)** (E1c) a note of £120.00 whose VAT row (£20.00 on £100.00) is marked `"charged": false`, with tax total £0.00, was accepted.
  - **(c)** (E1d) a jump of five, a step back and an upsert to 1 are refused ("A number counter moves one at a time"), and a delete is not permitted. Five single steps of one are each accepted: after INV-0004 the next invoice is INV-0010.

  The app's own path (`createCreditNote`, `checkCredit`, `nextSequence`) writes none of these, so this is defence in depth, as R5-L2 was.
- **How confirmed:** run, probes E1a to E1d, output in `db-probe.json`: `"E1b": {"result": "did not fail", "invoiceAfter": {"balance": 0, "state": "credited"}}`, `"E1c": {"result": "did not fail", "rows": [["VAT", 10000, 2000, false]], "taxTotal": 0}`, `"E1d": {"before": "INV-0004", "afterFiveSingleSteps": "INV-0010"}`.
- **Suggested fix:**
  - Refuse a note whose net, added to earlier notes' nets, passes the invoice's net, and a row whose `charged` differs from the invoice's row of the same key.
  - In the document trigger, require an issued document's sequence to be one more than the highest sequence already issued for its kind, so a step that issues nothing is caught at the next issue.

### R7-L2. The amount hint says "Up to GH₵0.00" when the amounts just below the balance cannot be split

- **Severity:** low
- **Where:** `packages/core/src/credits.ts:620-634`, `amountLimit`. With prices including tax it tries the balance and at most 63 amounts below it (`tries < 64`), and returns 0 when every one is too small to split. `apps/web/src/components/document-actions.tsx:490-492` shows the result as the hint. Spec, "Amount credits": the hint is "the largest amount whose credit note stays within the balance and can be split into its tax and the rest".
- **What goes wrong:**
  - The amount is shared across the slots by the value each has left. When a small slot owes more tax than its share of a large amount leaves behind, every amount near the balance is refused, and the step-down gives up before reaching one that works.
  - **Worked example** (`core/hint-example.test.ts`), Ghana's own codes, tax on the total, half up, prices including tax:
    - INV: 1 × GH₵0.24 at Standard rate (NHIL 0.01, GETFund Levy 0.01, VAT 0.03, each on GH₵0.19) and 1 × GH₵20.00 zero-rated. Total GH₵20.24.
    - An amount credit of GH₵0.01 (it comes from the zero-rated slot). The client pays GH₵0.50. The balance is GH₵19.73.
    - The hint is 0, so the dialog reads "Up to GH₵0.00 including tax, which keeps the credit note within the GH₵19.73 still owed."
    - GH₵19.73 itself is refused as too small to split; GH₵18.96 is the largest amount that can be credited.
  - **How often:** T5c, Ghana preset codes only: 10 of 39,541 random states. T5b, codes of 30% or less (Ghana, a compound levy code, VAT 20% and 5%): 10 of 19,781. T5, high-rate codes: 8 of 3,990. In every case where the hint differed from a brute-force search it was 0.
  - "Everything still owed" is not affected; it plans the balance differently and settled in every run.
- **How confirmed:** run: `core/hint-example.json` (`"hint": 0`, `"largestThatWorks": 1896`); `core/targeted.json` T5, T5b and T5c.
- **Suggested fix:** when the step-down finds nothing, keep searching downwards in strides of about what one unit of the smallest open slot's share is worth (whether an amount can be split does not change monotonically, so a binary search can miss), and show no hint when none is found. Test the hint against a brute-force search with Ghana's codes and prices including tax.

### R7-L3. Criterion 16 does not hold for the codes it names, with prices including tax and rounding down

- **Severity:** low (needs a code no UK or Ghana business uses)
- **Where:**
  - `packages/core/src/credits.ts:360-378`: with prices including tax, a settling note moves each component's tax by at most one unit, and `settleIncludingTax` (`:770-801`) can only move value to another slot.
  - Spec, criterion 16: "on codes with several taxes, taxes on taxes and rates up to 100%". Criterion 10: on codes above 30% "a note that settles the balance can be a few units further".
- **What goes wrong:**
  - **(a)** One line of £0.05 at five taxes compounded at 100% each (the schema allows five components of up to 100%), tax on the total, rounded down, prices including tax. Credit an amount of £0.02, pay £0.02, settle, reverse the payment, pay all but £0.01. The slot has £0.02 of value left and owes £0.01 on each of the last two taxes. "Everything still owed" for £0.01 is refused: "This credit is too small to split into its tax and the rest." It has no other slot to move value to.
  - In the T2 sweep this happened in 8 of 483 settlements for that code and setting, and in none of the other 95 combinations of code, price basis, tax level and rounding (579,310 settlements in all, over Ghana, a compound levy code, four Ghana-style taxes with VAT compounded, 50%, 99.9999%, 100%, five taxes at 40% and this code).
  - **(b)** In the high-rate run the largest gap between a tax and its rate times its base was 15 units on settling notes and 14 units on amount notes, with prices excluding tax. A later note takes up what a settling note left, so the gap is not confined to settling notes as criterion 10 says. On codes whose rates add up to 30% or less no tax was more than two units away (1.6 at most with UK and Ghana codes).
- **How confirmed:** run, `core/targeted.json` T2 (`"cmax/incl/document/down": {"tried": 483, "refused": 8}`); `core/ledger-props.json`, "seq: high rates", `maxDeviationFromRateTimesBase`.
- **Suggested fix:** narrow criterion 16 to the codes it holds for, or allow a settling note on a single slot with prices including tax to move a component by more than one unit when no other slot can take value. In criterion 10, say that on such codes any note can be up to the tax that one unit of value adds away.

### R7-L4. Five taxes of a third or more give an invoice with a negative net, which then cannot be credited

- **Severity:** low (needs a code no UK or Ghana business uses)
- **Where:**
  - `packages/core/src/tax.ts:152-169`, `splitGross`: each component is rounded on its own from the exact net, and the net is what is left of the gross. Nothing stops the rounded taxes adding up to more than the gross.
  - `packages/core/src/credits.ts:255-260`: `creditState` treats a negative base on the invoice as more already credited than invoiced.
  - `packages/db/src/documents.ts:793-818`: `creditPosition` turns that into "issued by an earlier version of Invoica".
- **What goes wrong (E6):**
  - A business creates a code of five taxes at 40% each (the form and schema allow it) and issues, with prices including tax, 4 × £0.01 at that code and 1 × £1.00 with no VAT.
  - The invoice is issued showing the first line with a net of −£0.01 and £0.05 of tax, and five tax rows of £0.01 each on a base of −£0.01.
  - Crediting the whole invoice, an amount of £0.50, or only the untaxed line, is refused: "This invoice was issued by an earlier version of Invoica and its figures cannot be worked out again, so it cannot be credited here."
  - The smallest codes that do this, of equal components, are five taxes at 33.3334% each (`core/negative-net.json`). No Ghana price from GH₵0.01 to GH₵100.00 does it, in any rounding.
- **How confirmed:** run: `db-probe.json` E6; `core/negative-net.json`; 9 invoices in the property runs and 6 in T3 were set aside for this (`invoicesWithNegativeNetSetAside`).
- **Suggested fix:** refuse at issue a line priced including tax whose taxes come to more than its value, with the same reason as a credit too small to split, or cap the rounding so the net is never below zero.

### R7-L5. Smaller points

- **Severity:** low
- **(a) A draft's balance in lists leaves out its deposit (run, E5).** `listDocuments` works out a draft's balance as its total, while `getDocument` takes off the deposits entered on it (`documents.ts:136` against `:250-260` and `:307`). A draft of £120.00 with a deposit of £20.00 lists a balance of £120.00 and shows £100.00 on its own page. The invoices page hides balances of drafts and the "Unpaid now" figure leaves drafts out, so nothing on screen is wrong today; the two functions differ for any later use. Every other state matched exactly: issued, sent, part paid, paid, payment removed, credited, settled, credited whole, void, overdue, an issued invoice with a deposit, and a credit note.
- **(b) A settings save now holds up payments and issues (run, E4 waits).** `updateOrganisationProfile` takes the organisation row for update (`organisations.ts:155-160`), which conflicts with the key-share lock that every insert referring to the organisation takes. With a save held open for 1.5 seconds, a payment and an issue each waited 1.5 seconds; a list did not wait (31 ms). A save is short in the app, and no deadlock or timeout came of it in E4.
- **(c) Content security policy (by reading).** `apps/web/src/proxy.ts:37-45`:
  - Requests carrying `Next-Router-Prefetch` or `Purpose: prefetch` skip the proxy, so their responses carry no policy, and the `x-nonce` request header is then whatever the client sent. For Next.js's own prefetches the response is flight data, which a browser does not show as a page, so this matters only if such a response were ever used as one.
  - The lookahead `(?!api|files|doc-fonts|…)` has no slash after each word, so a future page whose path starts with one of them (`/filesystem`, `/apiary`) would also go without a policy. No current page does.
- **(d) The drain secret (by reading).** `apps/web/src/lib/secret.ts:7-11` encodes both sides as UTF-8, while Node reads header bytes as Latin-1, so a secret with a character outside ASCII can never match. Say in the deployment notes that the secret must be ASCII.
- **(e) Paging (by reading).** `apps/web/src/app/(app)/invoices/page.tsx:33-45` reads every invoice and then shows fifty, so the page limits rendering and not the query. A page number that is not digits, or out of range, falls back to the first or last page (`apps/web/src/lib/paging.ts:3-6`).

---

## Checked and found sound

"Run" means a probe confirmed it; "read" means by reading the code.

- **The spec's criteria, each checked independently (run).** The random runs used:
  - tax per line and per document, rounding half up, half even and down, prices excluding and including tax, percentage and amount discounts;
  - standard, reduced, 17.5%, zero-rated, reverse-charge, exempt, no-tax and outside-scope lines; Ghana's three components from `presetFor('GH')` with its zero-rated and exempt codes; a compound code; two codes labelled "Standard rate" at 20%;
  - high rates the schema allows: 50%, 99.9999%, 100%, five taxes at 40%, five compounded at 100%, four Ghana-style taxes with VAT on the levies; and random codes of one to five components, 0% to 100%, compound or not;
  - random line, amount, "everything still owed" and hint credits, with payments of any size, payments leaving one to five units, and payments removed at any point. At the end of every sequence all payments were removed and "everything still owed" credited the rest.

  Each criterion:
  1. The whole invoice in one note reproduced every figure and row, high and random codes included: 5,679 invoices. `checkCredit` accepted each.
  2. Every invoice credited in full ended with every row's base and amount, and the net and tax, exact: all 8,989 final settlements, the T2 to T4 sequences and the database runs (E2b, every row exact in all twelve cases).
  3. No negative tax, base, line figure, net, value or unit price, and no row for a slot not credited, in 47,678 notes. The exception is the invoice itself in R7-L4.
  4. Line tax shares add up to the tax total, the total is net plus tax, and charged rows add up to the tax total, in every note.
  5. Not run again: the refusals in `planLineCredit`, `planAmountCredit` and at the start of `planBalanceCredit` are unchanged since review 5, which checked them (read). Every refusal the random runs met was one the spec describes.
  6. The builder's tests of review 2's examples pass.
  7. Amount credits excluding tax have their net equal to the amount and tax on top (checked in every amount note).
  8. The database refuses more of a line than invoiced and a line of another invoice (review 5's D2g; migration 0010 keeps those checks unchanged).
  9. Whole lines under VAT per line credit exactly their own tax: 11,386 lines, high and random codes included.
  10. Every base not charged on another tax was the net the note took. On codes of 30% or less every tax was within two units of rate times base (1.6 at most with UK and Ghana codes). Above that, see R7-L3(b).
  11. "Everything still owed" was exact on every attempt in the random runs. The exception is R7-L3(a).
  12. A note without a ledger stops further credits with the reason shown (E1b).
  13. Ghana with tax on the total, both price bases, every rounding: balances of one to three units after an earlier amount credit settled in all 53,507 Ghana settlements of T2 with tax on the total (98,809 with both tax levels).
  14. After a settling note, removing its payment left a balance that a second note credited exactly, with every row exact, in every sequence and in E2b.
  15. The database refuses tax rows that are not whole numbers of zero or more, a tax total that is not the charged rows, and rows that with earlier notes pass what the invoice charged (E1a). The gaps are R7-L1.
  16. After a settle, a reversal and part paid again, a further settle was exact in 579,310 tries over eight codes, both bases, both levels and every rounding (T2), and in 22,766 with random codes (T3). The exception is R7-L3(a).
  17. A document whose total would pass 2^53 − 1 is refused as too large: review 5's D7 lines give "The total is too large.", while one line of 7,500 units at £10,000,000,000.00 with VAT gives £90,000,000,000,000.00, net plus tax exactly (T6).
- **`takeTaxLeft` (run, read).** Against balances of one unit up to the whole tax left on an emptied slot, each component taken was within what the slot still owed, the total was the balance, and a later settle took the rest exactly: 9,278 cases (T4). Each note takes only from slots of the codes it names, so the tax-only line carries the invoice line's tax code (E2a).
- **The cut in `settleExcludingTax` (read, run).** The cut is never more than the unit added, so a note's tax is never below what was due before that unit and never negative; the ledger takes up the difference later.
- **Timing and termination (run, read).** The worst single planning call in the random runs took 25 ms. On 200-line invoices at high rates per line: "everything still owed" up to 116 ms and the hint up to 126 ms with prices excluding tax, and under 26 ms with prices including tax (T6). The loop in `settleExcludingTax` adds one unit of value per pass; the hint tries at most 64 amounts.
- **Migration 0010, legitimate use (run).**
  - Every kind of credit note issued under VAT per line and on the total, both price bases, with two codes "Standard rate" at 20%, a reverse-charge line, a zero-rated line and a discount, and for Ghana both ways including a balance of one pesewa and a settle after a reversal: 40 notes, every invoice ending at a balance of 0 with every row exact (E2b).
  - The demo seed ran on a fresh database: 15 sent, 2 draft and 1 void invoices, and 1 credit note with a ledger (E2c).
  - 24 concurrent issues numbered INV-0001 to INV-0024 with no gap or repeat; INV-9998, INV-9999, INV-10000 and INV-10001 followed with padding 4 (E2d).
- **Numbering (run).** A prefix change from "Q1" to "Q" saved during an issue now waits for it and is refused: "Q11 is already used…" (E3a). Equal prefixes and prefixes that differ by digits are refused; swapping the two series' prefixes is refused at the first number the other series used, "INV-0003 is already used, and this prefix would number a later credit note the same" (E3c).
- **Locks (run).** Twelve workers issued invoices, credit notes of three kinds, payments, payment removals, clients, settings saves (notes and prefixes), list reads and document reads on one organisation for 15 seconds, with plans off and enforced: 3,275 operations, no deadlock or lock timeout, every failure a refusal the app describes, p99 under 0.4 s and the worst 0.8 s (E4).
- **Lists and tenancy (run, read).** The correlated subqueries in `listDocuments` filter on the outer document's organisation, and row-level security applies inside them. With a payment and a credit note of another business forged to point at this business's invoices, the list showed only this business's figures, and the other business's list only its own (E5).
- **Content security policy and secret (read).** A fresh nonce per request, `'strict-dynamic'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'self'` and `form-action 'self'`; the root layout reads headers, so every page renders per request and gets the nonce; the document preview frames are `srcdoc` with `sandbox="allow-same-origin"`, so they inherit the policy and run no script. `bearerMatches` compares bytes in constant time after a length check and refuses a missing secret or header.

## Not checked

- Anything in a browser: the credit dialog, the settings page, the invoices page and the policy's effect on pages.
- `pnpm check`, `pnpm build`, the end-to-end suite and the PDF templates.
- Commit `e0b55d2` (dashboard layout and `docs/domain.md`), beyond the `git diff` noted under "Scope and commit".
- Concurrency across several organisations, and any connection limit or statement timeout in production.
- The `invoica` and `invoica_demo` databases, which were not touched.
- Tax wording; Ghana's statutory content for credit notes.

## Files produced by this review

All in `/home/claude/review/round7/`:

- `review-7.md` (this report);
- `baseline-core.out` and `baseline-db.out` (repository suites), `pinned-core.out` and `pinned-db.out` (pinned suites);
- `db-probe.test.ts`, with outputs `db-probe.out` and `db-probe.json`;
- `core/model.ts` (fixtures and an independent driver, adapted from review 5's), `core/ledger-props.test.ts`, `core/targeted.test.ts`, `core/hint-example.test.ts` and `core/negative-net.test.ts`, with outputs `core/ledger-props.out`, `core/ledger-props.json`, `core/targeted.out`, `core/targeted.json`, `core/hint-example.out`, `core/hint-example.json`, `core/negative-net.out` and `core/negative-net.json`;
- `pinned/` (an export of `5b3ae43` with `node_modules` links to the pinned packages), `node_modules/` and `core/node_modules/` (folders of links).

---

## Resolution (builder, 19 October 2026)

Tests were written first and run before each change: two of the three tests in `packages/core/test/credits-review-7.test.ts` failed (the third checks that the hint keeps the balance when the balance works, which held) and the test in `packages/db/test/review-7.test.ts` failed. The spec gained criteria 18 and 19, and criteria 10 and 16 were narrowed to what holds. The credit property tests were then run at 4,000 cases each without a failure.

| Finding | Fix |
| --- | --- |
| R7-L1 | Migration `0011_review_7_guards.sql`: each of a credit note's tax rows must be charged, or shown and not charged, as the invoice's row for that tax was. Not changed, and recorded as the next step for the database guards: a credit note whose rows leave out tax the invoice charged (the database cannot work out tax rounding to check it), and a number counter stepped forward without a document (a deferred check that every step has its document needs the older direct-SQL tests rewritten to step and issue in one transaction). Both need direct SQL as the app role or a defect; the app's own checks prevent them. |
| R7-L2 | With prices including tax, the hint now searches the nearest amounts one by one, then further down in strides of about a two-hundred-and-fifty-sixth of the balance, then back up within the stride. The review's example gives an amount that can be credited. The spec says the hint may name an amount a little below the largest that works. |
| R7-L3 | Criterion 16 now names the codes it holds for (UK and Ghana codes, a levy with VAT charged on it, single rates up to 100%) and records the refusal on several compounded high-rate taxes; criterion 10 says that on codes above 30% any note can be up to the tax one unit adds away, with a later note taking up the rest. No UK or Ghana code is affected. |
| R7-L4 | A line priced including tax whose taxes, rounded one by one, come to more than its price is refused when the invoice is worked out ("The taxes on a line come to more than its price. Raise the price or use another tax code."), in the editor and on the server, so no invoice is issued with a net below zero. |
| R7-L5 | Noted, not changed: a draft's balance in lists leaves out its deposit (shown nowhere); a settings save holds issues and payments while it runs, which is the lock review 5 asked for; the content security policy is left off prefetch requests, as Next.js advises, and off paths beginning `api` or `files`, which serve no pages; a drain secret should be ASCII (now noted in `.env.example`); the invoices page reads every invoice and shows fifty, which measured 65 ms at 2,000 invoices. |

Checks after the fixes: core 187, database 90, documents 11, PDF 64, schemas 4, web unit 10 (366 run, 366 passed, 0 failed, 0 skipped); end to end 30 passed, 1 failed and 3 skipped by design in the full run, the failure being the keyboard walk timing out at 90 seconds under load; it passed twice when run again, and its time limit is now four minutes. Lint, types, format and copy rules clean; production build clean.
