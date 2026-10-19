# Invoica: independent review of the slot ledger, "everything still owed" and the plans (review 4)

Reviewer: a separate agent, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 19 October 2026.

## Scope and commit

This review covers commit `c886cbb` ("fix: credit notes worked out slot by slot, everything still owed credits the balance exactly (review 3)"). It was checked against `docs/specs/credit-notes.md` (criteria 1 to 12), decision `0009-credit-ledger-by-slot.md`, `docs/specs/plans.md` and the resolution of review 3 (`docs/reviews/review-3.md`, at `085fc26`). In order of priority:

1. `packages/core/src/credits.ts` (`creditSource`, `checkSlots`, `creditSlots`, `creditSourceOf`, `creditState`, `slotTaxAt`, `buildNote` with `cut` and `settles`, `planLineCredit`, `planAmountCredit`, `amountLimit`, `largestWithin`, `planBalanceCredit`, `checkCredit`) and `computeDocumentDetail` in `packages/core/src/totals.ts`;
2. `packages/db/src/documents.ts` (`issueDocument`, `creditLedger`, `creditPosition`, `createCreditNote` including mode `balance`, the amount-credit line titles) and `packages/db/migrations/0007_review_3_guards.sql`;
3. the trial and the free plan: `packages/core/src/plans.ts`, `packages/db/src/plans.ts`, `applyEntitlements` in `packages/core/src/snapshot.ts`, the client limit in `packages/db/src/clients.ts`;
4. by reading only: `apps/web/src/components/document-actions.tsx`, `apps/web/src/app/(app)/invoices/[id]/page.tsx`, `apps/web/src/app/(app)/dashboard/page.tsx`, `apps/web/src/lib/actions/documents.ts`.

Every probe ran against an export of `c886cbb` made with `git archive` at `../review/round4/pinned`. Its `node_modules` folders hold links that point `@invoica/*` at the pinned packages and everything else at the repository's installed packages.

The repository moved during the review: nine commits landed, up to `ef7f173`. `git diff c886cbb ef7f173` shows no change to `credits.ts`, `totals.ts`, `tax.ts`, `plans.ts`, `snapshot.ts`, the migrations, `clients.ts`, the invoice page or the server actions. `document-actions.tsx` changed the credit preview's layout and moved the dialog into its own component. `documents.ts` added a `credits` field to document summaries. The findings below therefore apply to `ef7f173` too, by reading.

Line numbers are for `c886cbb`.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| `pnpm test:core` | repository, start of review (packages identical to `c886cbb`) | 168 run, 168 passed, 0 failed, 0 skipped (14 files) |
| `pnpm test:db` | repository, start of review | 71 run, 71 passed, 0 failed, 0 skipped (7 files) |
| Pinned core suite | `pinned/packages/core` | 168 run, 168 passed |
| Core property probe `core/ledger-props.test.ts` | pinned | 2 tests: 7,384 invoices credited whole (14,903 whole-line notes); 18,742 invoices with random sequences, 25,744 credit notes |
| Core targeted probes `core/targeted.test.ts` | pinned | 12 tests (T1 to T8), each asserting what it observed |
| Database probes `db-probe.test.ts` | pinned, fresh databases | 19 run, 19 passed, each asserting what it observed |

How to rerun them:

- Core: `cd ../review/round4/core && node node_modules/vitest/vitest.mjs run --root ../review/round4/core --testTimeout=1800000 --reporter=verbose`.
- Database: `cd ../review/round4 && TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres node node_modules/vitest/vitest.mjs run --root ../review/round4 --no-file-parallelism --testTimeout=600000 --hookTimeout=300000 --reporter=verbose db-probe`.

`round4/node_modules` and `round4/core/node_modules` are real folders of links, so Vitest's cache goes into the review folder. The repository's own `.vite` result files were last written at 03:47 to 03:48 by the builder's run before commit `ef7f173`. Each database run creates and drops its own databases through `createTestDatabase`; the seed probe makes a second one. The `invoica` and `invoica_demo` databases were not touched.

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 0 | |
| Medium | 1 | R4-M1 |
| Low | 7 | R4-L1 to R4-L7 |

The slot ledger is a clear improvement. In the random runs:

- every invoice credited whole reproduced every figure;
- every whole line under VAT per line credited exactly the tax it was charged;
- every invoice whose slots were all emptied credited every tax row exactly;
- no note had a negative figure;
- `checkCredit` never disagreed with a planner;
- the amount hint's limit was always the largest amount that fits;
- planning stayed fast on the largest figures the schemas allow.

The plan rules hold under concurrency, and free-plan documents lose the template, colour and logo as specified.

What remains:

- **R4-M1 (medium).** "Everything still owed" is refused on an invoice priced including tax under a code with several taxes (Ghana's default) when the balance is one minor unit. Nothing else can clear that unit. The spec's own rule for this case ("that tax is lowered") never runs, because a negative-base check comes first.
- **R4-L1 (low).** With prices including tax, an "everything still owed" note can print tax bases a unit away from its net. If the payment is later removed, the invoice ends fully credited with one levy a pesewa short.
- **R4-L2 (low).** With prices excluding tax, when "everything still owed" lowers tax on a slot's last unit and the payment is then removed, that tax can no longer be credited.
- **R4-L3 to R4-L7 (low).**
  - Amount-credit descriptions are cut at 4,000 characters and name lines that were already credited.
  - A prefix change can make the next number one already used.
  - Migration 0007 still accepts credit notes whose figures do not follow from their lines.
  - Plan rules can be bypassed by direct SQL, and archived clients cannot be invoiced from the app on the free plan.
  - Smaller points on wording and the spec.

---

## Findings

### R4-M1. "Everything still owed" is refused under Ghana's default settings when one pesewa is owed, and nothing else can clear it

- **Severity:** medium
- **Where:**
  - `packages/core/src/credits.ts:355`: `buildNote` throws `credit_too_small` when a component's base or amount for the note is negative.
  - `packages/core/src/credits.ts:357-368`: the `settles` branch, which lowers tax that is more than the value taken. It runs after the check at `:355`.
  - `packages/core/src/credits.ts:627-628`: with prices including tax, `planBalanceCredit` is an amount credit of the balance with `settles`.
  - Spec, "Everything still owed": "If a slot's tax would come out more than the value it takes, that tax is lowered, at most one unit for each component." Criterion 11.
- **What goes wrong:** NHIL and GETFund Levy have the same rate, so their rounding steps fall on the same pesewa. Where a slot's cumulative tax rises by two pesewas over one pesewa of value, the base for that pesewa comes out at minus one. The note is refused before the lowering the spec describes can run.
  - **Worked example.** Ghana's default settings: tax on the invoice total, half up. Prices include tax.
    - Invoice: 1 × GH₵100.00 at the Standard rate. Rows: NHIL 2.08, GETFund Levy 2.08 and VAT 12.50, each on GH₵83.34.
    - An amount credit of GH₵29.99: net GH₵25.00, NHIL 0.62, GETFund 0.62, VAT 3.75.
    - The client pays GH₵70.00, leaving GH₵0.01.
    - "Everything still owed" is refused: "This credit is too small to split into its tax and the rest."
    - An amount credit of GH₵0.01 is refused with the same message.
    - The smallest line credit, 0.001 of the line, is GH₵0.10 and is refused as more than the balance.
    - On 31 December the invoice still owes GH₵0.01, is part paid, and shows as overdue. Only a payment the client never made can close it.
  - **Why.** After GH₵29.99 the slot's tax is 62, 62 and 375 pesewas; after GH₵30.00 it is 63, 63 and 375. One pesewa of value carries two pesewas of tax.
  - **How often.**
    - On this invoice, a balance of one pesewa is refused after 208 of the 9,999 possible earlier amount credits (one in 48). Balances of 2 to 10 pesewas were always accepted.
    - On random invoices priced including tax, with an earlier amount credit and 1 to 40 minor units still owed, 47 of 17,512 with a multi-tax code were refused. None of 12,220 with single-tax codes were.
  - **Prices excluding tax are not affected.** The one-unit adjustment loop handles them, and no refusal occurred in the random runs.

  The dialog offers "Everything still owed, GH₵0.01", shows the refusal and disables "Issue credit note" (`document-actions.tsx:421-422`, `:547-551`, by reading).
- **How confirmed:** run.
  - Core: `core/targeted.test.ts` T1 (three tests). `targeted.json` has `"balance": "credit_too_small"`, `"taxAt2999"` 62/62/375, `"taxAt3000"` 63/63/375, `"refusedByBalance": {"1": 208}` and `"severalTaxes:credit_too_small": 47`.
  - Database: probe `R4-1` through `createCreditNote` and `recordPayment`, output in `db-probe.json`: `"balanceBefore": 1`, the three refusals, and `"onDec31": {"balance": 1, "state": "part_paid", "overdue": true}`.
- **Suggested fix:**
  - In a settling note with prices including tax, lower the tax first, one unit per component at most, until it is no more than the value taken.
  - Then set each non-compound base to the net the note takes from the slot, and only then refuse negatives.
  - Test first: criterion 11 including tax with several taxes, after an earlier credit, for balances of 1 to 3 units.

### R4-L1. With prices including tax, an "everything still owed" note can carry bases that are not its net, and a later note can leave a levy short

- **Severity:** low
- **Where:**
  - `packages/core/src/credits.ts:300-303`: `slotTaxAt` caps the base at the slot's base.
  - `packages/core/src/credits.ts:370-374`: the check that what is left of a slot can still hold its tax is skipped for settling notes.
  - Spec, "The ledger": "when every slot is credited, every tax row's amount and base equal the invoice's, whatever the order and mix of credits". Criterion 10.
- **What goes wrong:** when a settling note stops a unit or two short of a slot's end, the capped base differs from the note's net. The slot can also be left with more tax to credit than value.
  - **Worked example.** Ghana's default settings, prices including tax.
    - Invoice: an exempt line of GH₵1,000.00 and a standard-rated line of GH₵1.20 (net 0.99, NHIL 0.03, GETFund 0.03, VAT 0.15).
    - A deposit of GH₵5.00 is recorded, and "everything still owed" credits GH₵996.20.
    - The standard slot takes GH₵1.19. Its rows are NHIL 0.02, GETFund 0.02 and VAT 0.15, each on a base of GH₵0.99, while the net it takes is GH₵1.00. That breaks criterion 10.
    - The deposit is then removed ("Deposit returned") and "everything still owed" credits the GH₵5.00. The note is exempt 4.99 plus "GETFund Levy" 0.01 on a base of 0.00.
    - The invoice is now fully credited (balance 0, state "credited"). Yet the two notes credit NHIL 0.02 of the 0.03 charged and a net of 1.00 against 0.99.
  - A second example (core T2): GH₵100.08 with one pesewa paid. The note's rows are on GH₵83.39 while its net is GH₵83.40. After the payment is removed, NHIL ends at 2.08 of 2.09.
  - **How often.** A base differing from the net occurred in 2 of 19,997 settling notes after random part payments. It needs a small multi-tax slot beside large ones, or a payment of a unit or two. The second half needs a payment removed after the note.
  - The builder's criterion 10 test (`packages/core/test/credits-review-3.test.ts:176-229`) checks line and amount credits only, never settling notes.
- **How confirmed:** run.
  - Probe `R4-3`: `"ghanaSlot": {"taxes": [{"base": 99, "amount": 2}, ...], "value": 119}`, `"creditedInAll": {"NHIL": 2, "GETFund": 3, "VAT": 15}` and `"invoiceEnd": {"balance": 0, "state": "credited"}`.
  - `core/targeted.test.ts` T2: `"C10 base is not the net taken": 2` of 19,997.
- **Suggested fix:**
  - With the R4-M1 change, take each base from the net actually taken.
  - Also keep a settling note from leaving a slot with more tax to credit than value. Either apply the rest check, moving a unit to another slot, or record the lowered unit so the note that empties the slot takes it.

### R4-L2. Tax lowered on a slot's last unit cannot be credited once the payment is removed

- **Severity:** low
- **Where:** `packages/core/src/credits.ts:636-658`. When no slot can take one more unit without passing the balance, `planBalanceCredit` lowers the tax on the first slot where that works, even when that unit empties the slot. A later note can only take up the lowered tax from a slot that still has value.
- **What goes wrong:**
  - **Worked example.** UK default settings: VAT per line, half up, prices excluding VAT.
    - Invoice: 5 × £5.98 at 5%, 3 × £340.08 at 20%, 4 × £1.00 at 5% and 3 × £41.64 zero-rated. Total £1,384.81.
    - A payment of £0.64 is recorded, then "everything still owed" credits £1,384.17 (net £1,178.53, VAT £205.64).
    - The first line is credited in full with VAT £1.49 of its £1.50.
    - The payment was recorded against the wrong invoice and is removed. The balance is £0.64: 47p and 6p of value on the second and fourth lines, 10p of VAT on the second, and 1p of VAT on the first, which has no value left.
    - "Everything still owed" is refused: "The balance cannot be credited exactly in one note. Credit an amount instead."
    - The best amount credit gives 63p, leaving 1p that nothing can clear.
  - **How often.** 70 of 37,838 random UK invoices of one to five ordinary lines, with a payment from 1p to £1,000. Every case had a payment under £1 (the largest was 96p).
- **How confirmed:** run.
  - Probe `R4-2`: `"slotsAfter": [{"slot": "line:0", "left": 0, "taxCredited": [149]}, ...]` and `"again"` gives the refusal.
  - `core/targeted.test.ts` T3: `{"tried": 37838, "stuck": 70, "largestPay": 96}` and `"bestTotal": 63`.
- **Suggested fix:** when choosing where to lower tax, prefer a slot that keeps value after the note. Or allow a note to take the remaining tax of a slot whose value is all credited, within what the slot showed. Test: after any settling note, removing its payment leaves a balance that "everything still owed" credits exactly.

### R4-L3. Amount-credit descriptions do not always name every line reduced, and can name lines no longer on the invoice

- **Severity:** low
- **Where:**
  - `packages/db/src/documents.ts:899-910`: the description is `` `Lines reduced: ${titles}`.slice(0, 4000) `` because the column allows 4,000 characters.
  - The list is every line of every slot the note takes from (`:899-902`).
  - Spec, "Amount credits": "the description names every one". The resolution of R3-L4: "so no line goes unnamed".
- **What goes wrong:**
  - **(a)** An invoice of 140 lines titled "Site visit and report, job 001-B" (32 characters each) gets an amount credit of £50.00. The line is titled "Reduction on INV-0001: 140 lines", and its 4,000-character description names 117 of the 140. Invoices may have 200 lines with titles of up to 500 characters.
  - **(b)** With tax on the invoice total, "Kitchen units" is credited in full and an amount credit follows. The new note's title is "Reduction on INV-0001: Kitchen units, Fitting", although nothing of "Kitchen units" is left to reduce.

  For a UK credit note this bears on regulation 15C(6)(f) (identifying the goods or services). Tax wording is for whoever approves it.
- **How confirmed:** run, probes `R4-4a` (`"descriptionLength": 4000, "linesNamed": 117, "ofLines": 140`) and `R4-4b`.
- **Suggested fix:**
  - Name only lines with value or quantity left before the note.
  - When the list cannot fit, name lines by their positions on the invoice ("lines 1 to 140"), which always fits.
  - Correct the R3-L4 resolution note.

### R4-L4. A prefix change can make the next number one already used; a settings save during an issue fails the issue

- **Severity:** low
- **Where:**
  - The unique key `(organisation_id, kind, number)` in `0001_init.sql:237`.
  - The number check in `0007_review_3_guards.sql:71-77`, which reads the organisation's prefix when the issue is written.
  - The settings hint at `apps/web/src/components/settings-form.tsx:354` ("Next invoices look like …1", always sequence 1).
- **What goes wrong:**
  - **(a) Collision.**
    - With prefix "Q1" and padding 1, ten invoices are numbered Q11 to Q19, then Q110.
    - The prefix is changed to "Q". The next sequence is 11, so the next number is Q11, already used.
    - Every issue then fails on the unique key. The app shows "Something went wrong and nothing was saved. Try again." (`apps/web/src/lib/actions/result.ts`), and every retry fails the same way until the prefix changes again.
    - The settings hint showed "Q1", not the real next number.
    - It takes a prefix ending in a digit to be shortened, so it is rare.
  - **(b) Race.**
    - Another session saves new settings (prefix "NEW-") after the issue has read the organisation and before it writes the document.
    - The trigger refuses the issue: "A document number must be its prefix and sequence". A retry succeeds as NEW-0001.
    - The probe holds the counter row to time the two sessions. In use the window is a few queries long.
- **How confirmed:** run.
  - Probe `R4-6c`: `"first": ["Q11", ..., "Q110"]` and `"blocked": "duplicate key value violates unique constraint \"document_organisation_id_kind_number_key\""`, the same on retry.
  - Probe `R4-6d`: `{"first": "A document number must be its prefix and sequence", "retry": "NEW-0001"}`.
- **Suggested fix:**
  - (a) On saving numbering settings, refuse a rule whose next numbers are already used in either series, and show the real next number in the hint.
  - (b) Lock the organisation row for share at the start of `issueDocument` and `createCreditNote`, or let the database derive the number from the prefix it checks against.

### R4-L5. Migration 0007 still accepts credit notes whose totals and tax do not follow from their lines

- **Severity:** low (needs a code defect or direct SQL)
- **Where:** `packages/db/migrations/0007_review_3_guards.sql:22-79`. On issue, a credit note is checked for:
  - its invoice and currency;
  - the balance;
  - lines crediting lines of its invoice;
  - credited quantities;
  - the tax of lines without a credited line;
  - the number and sequence.

  Its `total`, `tax_total` and snapshot are not checked against its lines. Lines that credit an invoice line are not checked for that line's tax or unit price.
- **What goes wrong:** as `invoica_app`, against a £100.00 plus VAT £20.00 invoice, this credit note was accepted:
  - a line of 1p at VAT 20% crediting no invoice line;
  - a line crediting the invoice's £100.00 line at £1,000.00 at "No VAT";
  - `total` £120.00 and `tax_total` £120.00.

  That is £120.00 of VAT credited against £20.00 charged. The checks in `createCreditNote` and `checkCredit` keep the app from doing this, so it is defence in depth, as R3-L3 was.
- **How confirmed:** run, probe `R4-5b`: `"result": "did not fail"`. Probe `R4-5a` shows the review 3 cases now refused.
- **Suggested fix:**
  - On issue, require `total` to equal the lines' figures, and the tax rows to stay within what the invoice charged, less earlier notes.
  - Require a line that credits an invoice line to carry that line's tax and unit price.

### R4-L6. Plan rules live only in application code, and archived clients cannot be invoiced from the app on the free plan

- **Severity:** low
- **Where:**
  - `packages/db/src/plans.ts:33-47` (`assertRoomForClient`), `packages/db/src/clients.ts:60-61` and `:82-83`.
  - The `organisation_update` policy in `0002_tenancy.sql:76-78` lets the app role update any column of its own organisation.
  - `clientsForEditor` (`documents.ts:984`) lists active clients only.
  - `newDraftState` in `apps/web/src/lib/editor-data.ts` drops a `?client=` that is not active.
  - Spec `plans.md`, line 20 ("Never limited, on any plan: drafting and issuing invoices to any client already in the account") and criterion 2 (restoring is limited).
- **What goes wrong:**
  - **(a) Direct SQL.** As `invoica_app` with plans enforced, on the free plan with three active clients, two statements were accepted:
    - an `insert into client`;
    - `update organisation set trial_ends_at = '2099-01-01'`, after which `createClient` adds clients again.

    Both need direct SQL or a code defect.
  - **(b) Archived clients.**
    - An organisation that ends its trial with four active clients archives one.
    - Restoring it is refused ("On the free plan you can have three active clients…") until two more are archived.
    - Until then the editor cannot select it (by reading). The server itself drafts and issues an invoice to it (INV-0001 in the probe).

    So a client already in the account cannot be invoiced from the app, which the spec's line 20 says is never limited. No server rule stops a correct invoice; this is a decision for Kobby.
- **How confirmed:** run, probes `R4-5c` (`"direct": "did not fail", "trialExtended": "did not fail", "addAfterExtending": "added"`) and `R4-7d` (`"restore"` refused, `"issuedToArchived": "INV-0001"`). The editor behaviour is by reading.
- **Suggested fix:**
  - (a) Column privileges or a trigger on `organisation` for `trial_ends_at` and `plan`. A trigger on `client` counting active clients when plans are enforced, or an accepted note that these rules are application-level.
  - (b) Decide whether an archived client can be invoiced without restoring, or restored when it has open invoices, and say so in the spec.

### R4-L7. Smaller points: the email text, refusals the spec does not describe, and tax-only credit notes

- **Severity:** low
- **Where and what:**
  - **(a) The amount in the prefilled email.** It states the amount due at issue: `money(snapshot.balanceDue)` (`apps/web/src/app/(app)/invoices/[id]/page.tsx:84-86`). After payments or credit notes, "Send again" proposes "Please find attached invoice INV-0001 for £120.00" when less is owed. By reading.
  - **(b) Refusals the spec does not describe.** "This quantity is too small to credit on its own." (`credits.ts:496-498`) occurs on 0.15 of a 3p line with a 90% discount (core T6). A quantity whose value rounds to nothing is refused with "A credit note must be for more than zero." Neither is in criterion 5 or "Line credits". Both arise only on lines of a few pence.
  - **(c) Tax-only credit notes.** A settling note can credit tax alone, as R4-L1's second note shows: "GETFund Levy" 0.01 on a base of 0.00, with nothing before tax. Its rate times its base is within criterion 10's two units. Whether such a note should print is a question for whoever approves tax wording, alongside the open R3-L4 points.
- **How confirmed:** (a) by reading; (b) run, T6 and the refusal catalogue in `ledger-props.json`; (c) run, probe `R4-3`.
- **Suggested fix:** (a) use the current balance; (b) list both refusals in the spec; (c) put to the person who approves tax wording.

---

## Checked and found sound

"Run" means a probe confirmed it; "read" means by reading the code.

- **The spec's criteria, each checked independently (run).** The random runs used:
  - tax per line and per document;
  - rounding half up, half even and down;
  - prices excluding and including tax;
  - percentage and amount discounts;
  - standard, reduced, 17.5%, zero-rated, reverse-charge, exempt, outside-scope and no-tax lines;
  - Ghana's three components from `presetFor('GH')`, and a compound code;
  - two codes with the same rate and different labels;
  - zero-price lines;
  - quantities from 0.001 to 7,500;
  - random line, amount, "everything still owed" and limit credits, with part payments and removals.

  Each criterion:
  1. The whole invoice credited in one note reproduces subtotal, discount, net, tax, total and every row: 7,384 invoices, no difference. `checkCredit` accepted each.
  2. Whenever every slot was emptied (11,268 sequences), every row's base and amount and the total, tax and net were exact. Each slot was exact whenever it was emptied. The exception needs a payment removed after a settling note (R4-L1).
  3. No negative tax, base, line amount, discount, net, tax share, value or unit price, and no row for a slot not credited: none in 25,744 notes, nor in 2,333 notes on the largest invoices.
  4. Line tax shares add up to the tax total, the total is net plus tax, and charged rows add up to the tax total: no exception.
  5. Refusals above what is left: on 4,945 invoices each, quantity gives `credit_exceeds_quantity`, amount gives `credit_exceeds_invoice` and balance gives `credit_exceeds_invoice`. On 1,085, a slot taken by an amount gives `credit_exceeds_group` (T7). In the random runs, legitimate requests were refused only:
     - above the balance after payments;
     - beyond a slot's value;
     - for a value rounding to nothing;
     - six times as too small (five multi-tax including tax, one near-total discount).

     "Everything still owed" and the limit were never refused there.
  6. Review 2's worked examples: the builder's tests pass.
  7. Amount credits on invoices excluding tax add tax on top: checked through criterion 4 and the totals in every run.
  8. The database refuses more of a line than invoiced: the builder's tests pass; review 3 tested the race.
  9. Under VAT per line, 14,903 whole lines credited one note each in random order took exactly the line's tax and its slot's rows.
  10. Within two units of rate times base, and base equal to the net taken: no exception on line or amount credits. The exceptions are on settling notes (R4-L1).
  11. "Everything still owed" was exact every time in the random sequences, including 1,500 invoices at 8.4 × 10^15. The exceptions are R4-M1 and R4-L2.
  12. A credit note without a ledger stops further credits with the reason shown (probe `R4-8`); the invoice page shows that reason (read).
- **Planners and `checkCredit` (run).** `checkCredit` never refused a planned note except above the balance. `creditState` never threw after a planned note.
- **`amountLimit` (run).** In 3,996 brute-force cases it was the largest amount within the balance, checked over the next 200 amounts, and never gave a note above the balance.
- **Timing and termination (run, read).**
  - 7,500 units at £10,000,000,000.00 (9 × 10^15 with VAT): `amountLimit` 1.3 ms, `planBalanceCredit` 1.1 ms.
  - 200 lines under VAT per line: worst 75 ms over random balances.
  - The loop in `planBalanceCredit` adds one unit of value per pass, so it ends.
- **What the snapshot keeps (run).**
  - An issued invoice's `slots` equal `creditSlots` recomputed from its snapshot.
  - Credit notes keep `ledger` and no `slots`.
  - `creditSlots` refused none of the 26,000 invoices issued in the core runs.
  - Every core run read the slots back through a JSON round trip, as the database stores them.
  - Crediting reads the kept slots through `checkSlots`. It recomputes only the tax on a part of a slot and a line's amount at a part quantity, which the spec defines.
- **Database, legitimate use (run).**
  - Five invoices and three credit notes (amount, whole, "everything still owed") issued at once all succeeded: INV-0004 to INV-0008, CN-0001 to CN-0003.
  - Sequences past the padding give INV-9999 and INV-10000.
  - With prefixes and padding changed between issues: B/2026/10001, CR02, 00010002.
  - The two series stay separate.
  - The seed ran on a fresh database: 15 sent, 2 draft and 1 void invoices, and 1 credit note. All 16 issued invoices keep slots, and the credit note keeps a ledger.
- **Migration 0007 (run).** A printed number other than prefix and sequence, a change of kind, and a line at a tax the invoice did not use are each refused.
- **Plans (run).**
  - With one place left, six clients added at once gave one client.
  - A restore and an add at once gave one success.
  - An invoice issued on the free plan, and a credit note issued on it against an invoice from the trial, both use Signature, `#17795a`, no logo, and "Made with Invoica".
  - The invoice from the trial keeps Poster, its own colour and its logo.
  - Read: the invoice page and the PDF take the logo from the snapshot; the editor's preview applies the same entitlements; the email job uses the snapshot's seller name only.
- **Web, by reading.**
  - The dialog plans with the same functions and inputs as the server and runs `checkCredit` on the preview.
  - "Everything still owed" is offered once the whole invoice can no longer be credited.
  - The amount hint uses `amountLimit`.
  - The server action validates with `creditNoteInput`, which includes mode `balance`. The invoice lock makes repeated requests with one key wait for each other.
  - The dashboard labels the month's figure "Invoiced this month, less credit notes" when credit notes were issued, with both parts beneath (R3-L5).

## Not checked

- Anything in a browser: the credit dialog, the invoice page and the dashboard. The dialog behaviour in R4-M1 and the editor behaviour in R4-L6 are by reading.
- `pnpm check`, `pnpm build`, the end-to-end suite and the PDF templates.
- The commits after `c886cbb`, beyond the `git diff` noted under "Scope and commit". This includes VAT in sterling (`sterling.ts`), which is new there.
- The `invoica` and `invoica_demo` databases, which were not touched.
- Tax wording beyond the concerns listed; Ghana's statutory content for credit notes; the JSON and CSV export of credit notes.
- Billing and subscriptions, which are not built.

## Files produced by this review

All in `../review/round4/`:

- `review-4.md` (this report);
- `baseline-core.out` and `baseline-db.out`;
- `db-probe.test.ts`, with outputs `db-probe.out` and `db-probe.json`;
- `core/model.ts` (fixtures and an independent driver), `core/ledger-props.test.ts` and `core/targeted.test.ts`, with outputs `core/ledger-props.out`, `core/ledger-props.json`, `core/targeted.out` and `core/targeted.json`;
- `pinned/` (an export of `c886cbb` with `node_modules` links to the pinned packages), `node_modules/` and `core/node_modules/` (folders of links).

---

## Resolution (builder, 19 October 2026)

Tests were written first and run before each change: the five tests in `packages/core/test/credits-review-4.test.ts` and the eight in `packages/db/test/review-4.test.ts` all failed, each for the reason the finding gives. The spec (`docs/specs/credit-notes.md`) gained criteria 13 to 15, and `docs/specs/plans.md` criterion 6. The credit property tests (`credits.test.ts`, `credits-review-3.test.ts`, `credits-review-4.test.ts`) were then run at 6,000 cases each without a failure.

| Finding | Fix |
| --- | --- |
| R4-M1 | A settling note with prices including tax now moves each component's tax by at most one unit before anything is refused, so that neither the note nor what is left of the slot is below zero before tax. If a slot still cannot hold it, a unit or two of value moves between it and another slot. The review's example credits its last pesewa, and every earlier amount from GH₵29.00 to GH₵31.00 followed by a balance of one to three pesewas settles. |
| R4-L1 | Every note's bases are now worked out from the net it takes (a tax on tax: the net and the taxes before it), so each base is its net by construction and the bases still add up to the invoice's once a slot is credited in full. A settling note keeps what is left of each slot able to hold its tax. The review's example, the deposit later returned, ends with every row exact. |
| R4-L2 | "Everything still owed" with prices excluding tax first takes any tax left on slots whose value is all credited, and, when it lowers tax, puts the unit where the slot keeps value if it can. The review's example (£0.64 paid, the rest credited, the payment removed) now credits the 64p exactly. A property test settles, removes the payment and settles again over random invoices, ending with every row exact. |
| R4-L3 | An amount credit names only lines not already credited in full. A long list is named in the description by position ("Invoice lines 1 to 140") and, when the titles fit, by title. The R3-L4 resolution's claim now holds. |
| R4-L4 | (a) Saving numbering settings is refused when the next numbers in either series would repeat one already used ("Q11 is already used, and this prefix would number a later invoice the same. Choose another prefix."). The settings hints now give the real next invoice and credit note numbers. (b) Issuing an invoice or a credit note holds the organisation row for the rest of the transaction, so a settings save in progress finishes first and the number uses the saved prefix (tested with the save held open). |
| R4-L5 | Migration `0008_review_4_guards.sql`: on issue, a credit note's lines that credit invoice lines must carry those lines' price and tax, its total and tax total must be its snapshot's, and its tax rows with earlier notes may not credit more tax or base than the invoice charged. The review's direct-SQL case is refused. The seed runs on a fresh database. |
| R4-L6 | (b) The editor lists archived clients under "Archived clients", so a client already in the account can always be invoiced, as the plans spec says. (a) Not changed: enforcing plan limits in the database changes tenancy rules. The spec now says the limits are kept by the application, and the question is in Kobby's list. |
| R4-L7 | (a) The prefilled email states what is owed now. (b) Both refusals are in the spec, under "Line credits". (c) Tax-only credit notes join the wording questions for Kobby. |

Checks after the fixes: core 179, database 79, documents 11, PDF 64, schemas 4, web unit 5 (342 run, 342 passed, 0 failed, 0 skipped); end to end 29 passed and 3 skipped by design; lint, types, format and copy rules clean; production build clean.
