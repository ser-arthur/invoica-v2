# Invoica: independent review of the review 1 fixes (review 2)

Reviewer: a separate agent, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 19 October 2026.

## Scope and commit reviewed

This review covers commit `15a6c2d` ("fix: the first independent review's findings on credit notes, payments and guards") and commit `e95f247` ("an ordinary invoice fits on one page in every template"). It checks each fix claimed in the "Resolution" section of `docs/reviews/review-1.md` and looks for new defects, with most attention on money.

The report is pinned to **commit `e95f247`**. The repository kept moving while the review ran: commits `8f6093a`, `424d4b6`, `737405f`, `f55a850` and `7a10687` landed, and the working tree had uncommitted changes. `git diff e95f247` shows that none of them touch `packages/core/src` (except a new `chaseOrder` function in `receivables.ts`), `packages/db`, `packages/schemas/src`, `apps/web/src/components/document-actions.tsx`, `apps/web/src/app/(app)/invoices/[id]/` or `apps/web/src/lib`. Every probe ran against a clean export of `e95f247` made with `git archive` at `../review/round2/pinned`. That export has its own `node_modules` links, so `@invoica/core`, `@invoica/schemas` and `@invoica/documents` resolve to the pinned copies, not to the working tree.

`e95f247` changes only template spacing in `packages/documents/src/templates` and adds a one-page PDF test. I read the diff: it contains no money logic. Layout was not checked.

Line numbers below are for `e95f247`.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| `pnpm test:core` | repository working tree, start of review | 152 run, 152 passed, 0 failed, 0 skipped (two uncommitted `receivables` tests included) |
| `pnpm test:db` | repository working tree, start of review | 51 run, 51 passed, 0 failed, 0 skipped |
| core tests (`vitest run`) | pinned `e95f247` | 150 run, 150 passed, matching the resolution's count |
| database tests (`vitest run`) | pinned `e95f247` | 51 run, 51 passed |
| Review probes, database | `../review/round2/db-probe.test.ts` | 13 run, 13 passed. Each probe asserts the behaviour it observed: 10 confirm a problem, 3 confirm sound behaviour |
| Review probes, core | `core-probe.ts`, `core-probe-2.ts` to `core-probe-6.ts`, `core-probe-5b.ts` | Each output is saved beside its script as a `.out` file |

How to rerun them. Database: `cd ../review/round2 && TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres ./node_modules/.bin/vitest run --root ../review/round2 --reporter=verbose --silent=false`. The scratch `node_modules` is a symlink to `packages/db/node_modules`. Each run creates and drops its own database through the existing helper `createTestDatabase`; the `invoica` and `invoica_demo` databases were not touched. Core: `./node_modules/.bin/tsx core-probe.ts` and the same for the other scripts.

One note on method. The first versions of the randomised core probes used a generator that overflowed double precision and repeated itself. They were replaced with mulberry32 and rerun. Every count in this report comes from the corrected runs, and every worked example was replayed exactly.

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 1 | R2-H1 |
| Medium | 3 | R2-M1, R2-M2, R2-M3 |
| Low | 5 | R2-L1 to R2-L5 |

The fixes for the cases review 1 described hold:

- A partial credit note can no longer carry a tax the invoice did not charge, a rate taken from today's tax code, or more of a line than was invoiced.
- Payments and credit notes recognise repeats by fingerprint.
- The database refuses issued inserts, credit notes above the balance, and voiding a document that has credit notes.

The new defects come from the two ways of crediting, and from rounding down:

- **R2-H1 (high).** Credit some lines, then credit the rest as an amount. The amount is shared out by what was invoiced at each rate, not by what is left. An invoice can then reach a zero balance, marked "Credited", with hundreds of pounds of VAT still charged.
- **R2-M1 (medium).** Each amount credit rounds its VAT on its own. Credits in parts do not add up to the invoice's VAT, and the last part of a balance can be refused.
- **R2-M2 (medium).** Under "VAT on the invoice total, rounded down", line credits taken in parts print VAT rows at rates they do not credit, sometimes negative ("VAT 5% -£0.01"). Some ordinary credits are refused.
- **R2-M3 (medium).** Every amount credit note is now priced including VAT, so it never shows the decrease excluding VAT, which regulation 15C(6)(g) requires.

---

## Findings

### R2-H1. An amount credit ignores what earlier credit notes took, so mixing line and amount credits leaves VAT charged on an invoice shown as Credited

- **Severity:** high
- **Where:**
  - `packages/core/src/credits.ts:189-217`, in particular `:193-200`: the weights are the gross invoiced per tax code, and nothing about earlier credit notes is passed in.
  - `packages/db/src/documents.ts:771`: the amount branch passes only the invoice's figures.
  - `packages/core/src/credits.ts:239-256`: `checkCredit` caps each row's tax amount from above and never checks its base.
  - `packages/db/src/documents.ts:650-685`: `creditableLines` counts line credits only, so an amount credit never reduces what a line can still credit.
- **What goes wrong:** take a UK invoice with VAT per line: £5,000.00 at 20% and £5,000.00 zero-rated, total £11,000.00, VAT £1,000.00.
  1. The owner credits the zero-rated line in full ("Some of the lines": £5,000.00, VAT £0.00).
  2. The owner then credits the remaining £6,000.00 as "An amount, including tax".
  3. The £6,000.00 is shared 6,000 : 5,000, as invoiced. The second note is £3,272.73 at 20% (VAT £545.46) and £2,727.27 zero-rated.

  The invoice now shows balance £0.00 and state "Credited", and the credit notes total £11,000.00. But only £545.46 of the £1,000.00 VAT has been credited, and £7,727.27 of zero-rated supplies have been credited against £5,000.00 invoiced. £454.54 of output VAT stays on the seller's return for a sale cancelled in full, and the customer's input VAT is overstated by the same amount. The second note also prints "Zero-rated supplies £2,727.27" for a line already credited in full.

  The same happens with exempt and "No tax" lines. With a reverse-charge line, a "No tax" line and an exempt line (`core-probe.ts` C9), half of the reverse-charge line plus the whole "No tax" line by lines, then the rest by amount, leaves:
  - reverse-charge base credited £91.18 of £100.00 (notional VAT £18.24 of £20.00);
  - exempt base credited £8.23 of £20.00;
  - "No tax" base credited £70.59 of £50.00.

  In the other order the defect shows as refusals:
  - Once the standard-rated line has been credited, every amount credit is refused with "This would credit more VAT than the invoice charged", even though the whole remaining balance is zero-rated.
  - With half a standard-rated line credited, the remaining £160.00 cannot be credited by amount.

  The amount option's hint ("Shared across the invoice's tax rates in proportion to what was invoiced at each", `document-actions.tsx:497`) describes this behaviour. What it describes gives wrong VAT once any line has been credited.
- **How confirmed:** run.
  - Probe `R2-1` (first test) through `createCreditNote` printed `{"state":"credited","balance":0,"creditedTotal":1100000,"invoiceVat":100000,"creditedVat":54546,...,"row":"VAT 0% zero","invoicedBase":500000,...,"creditedBase":772727}`.
  - The second test returned "This would credit more VAT than the invoice charged." for the balance of 16000.
  - Core: `core-probe.ts` sections C1 (with the exempt variant and the refused other order) and C9.
- **Suggested fix:** work an amount credit from what is still uncredited in each tax group: the gross invoiced in the group less the gross already credited in it by every earlier credit note, line or amount. Allocate over those remaining weights. Work each group's tax cumulatively, as line credits already do: the tax on everything credited in the group after this note, less the tax credited before it. When a note completes a group, it takes that group's remaining base and tax exactly. Add a cap on each row's base to `checkCredit`. Test first: for any mixture of line and amount credits that brings the balance to zero, every tax row's credited base and amount equal the invoice's.

### R2-M1. Amount credits are rounded one note at a time, so they do not add up to the invoice and can leave a balance that cannot be credited

- **Severity:** medium
- **Where:**
  - `packages/core/src/credits.ts:203-217`: each note's tax is worked out afresh on its own amount.
  - `packages/core/src/credits.ts:247-255`: the per-row cap then refuses the note that would clear the balance.
- **What goes wrong:** take an invoice of £100.00 plus VAT £20.00.
  - **Credits that do not add up.** Two goodwill credits of £10.04 (VAT £1.67 each, exact £1.6733), then the remaining £99.92 (VAT £16.65). The balance is £0.00 and the state "Credited", but VAT credited is £19.99 of £20.00 and the net credited is £100.01 of £100.00.
  - **A balance that cannot be cleared.** Two credits of £10.05 instead (VAT £1.68 each, exact £1.675). The remaining £99.90 is refused as an amount, because its VAT of £16.65 is 1p more than the £16.64 left. It is refused as the line too ("A credit note cannot be more than the balance still owed"). The invoice stays "Issued" with £99.90 owing and will turn overdue. The largest amount accepted is £99.86; that leaves 4p, which can only be credited 2p at a time.

  Invoices with VAT per line (the UK default) show the same drift at the first amount credit:
  - 10 lines of 53p at 20% (VAT £1.10, total £6.40), credited in full by amount, credit VAT £1.07 and net £5.33, leaving 3p of VAT charged on a zero balance.
  - 10 lines of 52p cannot be credited in full by amount (VAT £1.03 against £1.00 charged).

  Review 1's resolution says credits taken in parts add up to the invoice exactly. That is true for line credits only.
- **How confirmed:** run.
  - Probe `R2-2` printed `{"state":"credited","balance":0,"invoiceVat":2000,"creditedVat":1999,...,"creditedBase":10001}` for the first case, and `{"rest":"This would credit more VAT than the invoice charged.","line":"A credit note cannot be more than the balance still owed.","balance":9990,"state":"issued"}` for the second.
  - Core: `core-probe.ts` sections C2 (`largest line credit accepted 9984, largest amount credit accepted 9986`, then `balance 4, largest further amount accepted 2`) and C3.
- **Suggested fix:** the cumulative approach from R2-H1. A note's tax in each group is the tax on the total amount credited in that group so far, less the tax already credited there, capped at what the row has left. A note that brings a group to its invoiced gross takes exactly the row's remaining base and tax, which also covers invoices whose VAT was rounded per line. Test: amount credits in any split that clear the invoice credit exactly its VAT, row by row.

### R2-M2. With "VAT on the invoice total, rounded down", line credits in parts print VAT at rates they do not credit, sometimes negative, and refuse some ordinary credits

- **Severity:** medium
- **Where:**
  - `packages/core/src/credits.ts:172`: a note's figures are the difference of two whole-document calculations.
  - `packages/core/src/totals.ts:122-164`, in particular `:140-149`: the leftover penny goes to whichever tax across the whole document has the largest remainder, so it can move between rates as quantities change.

  This is the only document-level choice offered to UK businesses (`packages/core/src/presets.ts`, `allowedRounding`).
- **What goes wrong:** take an invoice of 4 × £15.03 at 20% and 1 × £10.13 at 5%, prices excluding VAT, VAT rounded down on the total: VAT 20% £12.02, VAT 5% £0.51. Credited one unit at a time:

  | Note | Credits | VAT printed |
  | --- | --- | --- |
  | 1 | one unit of line 1 | VAT £3.00 |
  | 2 | line 2 | VAT 5% £0.51 |
  | 3 | one unit of line 1 | "VAT 20% £3.01" and "VAT 5% -£0.01", on a 5% base of £0.00 |
  | 5 | a unit of the 20% line | "VAT 5% £0.01" on a base of £0.00 |

  Across all notes the rows still add up to the invoice. With prices including VAT, rows with a negative base also appear: "VAT 5%: base -£0.01, VAT £0.01" on a credit for a 20% line.

  Some ordinary credits are refused. Take 2 × £15.03 at 20% and £10.13 at 5% (VAT £6.01 and £0.50). After one unit of line 1 is credited, crediting line 2 in full is refused with "This would credit more VAT than the invoice charged", because the leftover penny moves to 5% and its VAT comes out at £0.51. Crediting the other unit of line 1 first, then line 2, works.

  How often: 40,000 random invoices (two or three lines at 20% and 5%, £1 to £200 a unit, one to four units), each credited one unit at a time in random order:
  - 237,677 credit notes were accepted;
  - 22,237 carried VAT at a rate they did not credit;
  - 6,228 had a negative VAT row;
  - 7,867 had a negative base;
  - 3,963 sequences stopped at a refusal.

  Under every other rounding setting no negative VAT row appeared (`core-probe-5.ts`: 0 in 75,070 notes in the other ten modes, against 151 in the two "rounded down, document" modes).

  A credit note that shows a negative VAT amount at a rate nothing was credited at, or VAT on a base of zero, does not state "the rate and the amount of the VAT credited in respect of the decrease in consideration" (regulation 15C(6)(h), `docs/specs/tax-uk.md` section 6).
- **How confirmed:** run.
  - Probe `R2-3` issued the three notes through `createCreditNote`. The third note's snapshot has the row `["VAT",50000,0,-1]`, and its HTML rendered by the pinned `renderDocumentHtml` contains `VAT 5% -£0.01`.
  - The second `R2-3` test returned the refusal.
  - Core: `core-probe-3.ts` (the worked example), `core-probe-2.ts` (the counts), `core-probe-5.ts` (by mode).
- **Suggested fix:** for document-level rounding down, give each note only the tax groups whose quantities it changes.
  1. Round the note's VAT down as the floor of the exact VAT on everything credited after it, less the VAT already credited.
  2. Share it among the groups the note touches, by largest remainder of their exact increments.
  3. Cap each row at what the invoice has left on it, and let the note that completes a group take that group's remainder.

  Property tests: no credit note row has a negative amount or base; no row appears at a rate the note does not credit; any order of line credits that the balance allows is accepted. The existing property test in `credits.test.ts` checks sums only, and every credit in it takes a share of every line, so it cannot see this.

### R2-M3. Amount credit notes no longer show the decrease excluding VAT

- **Severity:** medium
- **Where:**
  - `packages/core/src/credits.ts:208-217`: `pricesIncludeTax: true` for every amount credit.
  - `packages/db/src/documents.ts:801`: stored on the credit note.
  - `packages/documents/src/view.ts:162-178`: the only figure before tax is the "Total before VAT" row, printed only when there are discounts and prices exclude tax.
- **What goes wrong:** before `15a6c2d`, an amount credit followed the invoice's own setting ("An amount, plus VAT 20%" in `document-actions.tsx` at `47e90f9`). Now every amount credit note is priced including VAT.

  Take a £300.00 credit on a UK invoice priced excluding VAT (£500.00 at 20%, £200.00 zero-rated). The credit note prints:
  - Credit against INV-0001, 1, £225.00, 20%, £225.00
  - Credit against INV-0001, 1, £75.00, 0%, £75.00
  - Subtotal £300.00
  - VAT 20% included £37.50
  - Total credited £300.00
  - Zero-rated supplies £75.00

  The decrease in consideration excluding VAT (£262.50 in all, £187.50 of it at 20%) appears nowhere. Regulation 15C(6)(g) requires "the amount of the decrease in consideration excluding VAT" (`docs/specs/tax-uk.md` section 6). The line title "Credit against INV-0001" does not describe the goods or services either (15C(6)(f)); the reason is printed separately. By reading only: the same missing total before VAT applies to invoices priced including VAT, and that part predates these commits.
- **How confirmed:** run. Probe `R2-6` issues the credit note through `createCreditNote`, renders its snapshot with the pinned `renderDocumentHtml` and searches the text. It printed `Credit against INV-0001 1 £225.00 20% £225.00 Credit against INV-0001 1 £75.00 0% £75.00 Subtotal £300.00 VAT 20% included £37.50 Total credited £300.00 Zero-rated supplies £75.00`, and £262.50 is not in the document.
- **Suggested fix:** print the net credited, in total and per rate, on every credit note. Alternatively, build amount credits priced the way the invoice was, splitting the amount into a net per rate before tax. Wording on a statutory document needs approval (CLAUDE.md, "Ask first").

### R2-L1. The database caps only a credit note's total; quantities, tax and which invoice a line credits are left to the app

- **Severity:** low
- **Where:** `packages/db/migrations/0005_review_1_guards.sql:45-63`, where issuing checks only the currency and the total against the balance, and `:108-113`, where `credited_line_id` is checked when the line is written, not when the credit note is issued.
- **What goes wrong:** as `invoica_app`:
  - A draft credit note was made against a £100.00 zero-rated invoice. Its one line credits 50 units of the invoice's 1-unit line, at VAT 20%. It was issued with total £100.00, `tax_total` £16.60 and an empty snapshot, and the database accepted it. `creditableLines` then reports 50,000 of 1,000 thousandths credited.
  - A draft credit note line was checked against invoice X; the draft was then pointed at invoice Y and issued. The database accepted it. X's line shows fully credited while X's balance is unchanged at £120.00, and Y's balance went down.
  - Both used sequences picked freely (77, 78), skipping the counter. Review 1 M2 suggested checking this as an option; it was not done.

  Reaching any of these needs a code defect, as in review 1 M2. The per-line and per-tax rules exist only in `createCreditNote`.
- **How confirmed:** run. Probes `R2-5` (second and third tests): `{"result":"did not fail","creditedQuantity":50000,"invoiced":1000,"balance":0,"state":"credited"}` and `{"result":"did not fail","xCreditedQuantity":1000,"xBalance":12000,"yBalance":11900}`.
- **Suggested fix:** in the draft-to-issued branch for credit notes:
  - check that every line with a `credited_line_id` points to a line of `new.credited_document_id`;
  - check that the quantities credited per invoice line across issued credit notes do not exceed the quantity invoiced;
  - refuse a change of `credited_document_id` on a draft that has lines;
  - optionally, check that the sequence is the counter's previous value.

### R2-L2. A repeated first save that overlaps the first one is told "nothing was saved", although the invoice was issued

- **Severity:** low
- **Where:** `apps/web/src/lib/actions/documents.ts:76-83` (`documentForKey`, then `createDraft`) and `apps/web/src/lib/actions/result.ts:14-21`.
- **What goes wrong:** say a client retries "Save and issue" while the first request is still running. Both requests find no document for the key, and both insert. The second waits on the unique index `document_idempotency`, then fails with SQLSTATE 23505. `failure()` reports that as "Something went wrong and nothing was saved. Try again." One invoice was issued, so the message is wrong. A retry finds the invoice, so no duplicate is created.
- **How confirmed:** probe `R2-7` (run) performs the action's steps twice at once with one key. It printed one success, one `{"code":"23505","message":"duplicate key value violates unique constraint \"document_idempotency\""}`, and `issued invoices 1`. The message mapping is by reading.
- **Suggested fix:** take `pg_advisory_xact_lock(hashtext(key))` before `documentForKey`. Alternatively, catch 23505 on that index and answer with what `documentForKey` finds.

### R2-L3. Line credits in parts: a printed line amount can differ from quantity times price, and stored line shares can disagree with the note's totals

- **Severity:** low
- **Where:** `packages/core/src/credits.ts:75-100` and `:172-181`. Each figure is a difference between two calculations, and only the chosen lines' differences are kept.
- **What goes wrong:**
  - **Line amounts.** 1.5 hours at £33.33, credited half an hour at a time, gives notes of £16.67, £16.66 and £16.67. The second prints "0.5 × £33.33 = £16.66" where 0.5 × 33.33 rounds to £16.67. The three notes add up to the invoiced £50.00.
  - **A middle part of nothing.** A line of 1.5 units at £0.01 credited in halves gives a middle note of £0.00, which is refused.
  - **Line shares.** At document level, half up: 3 × £1.03 and 3 × £9.99 at 20%, one unit of each credited, then one more unit of line 1. The note's only line stores a VAT share of £0.20, while the note's VAT is £0.21. The other line's change in share is dropped. Line shares are stored in the snapshot (and the JSON export) and not printed.
  - **A negative line net.** When a tiny quantity of a cheap line is credited, the discount share can round up while the amount rounds down. In `core-probe-5.ts` (random invoices with discounts), 16 of 90,086 credit notes stored a line with amount £0.00, discount £0.01 and net -£0.01, at both tax levels. With 1.5 kg at 3p and a 10% discount, credits of 0.1, 0.4, 0.5 and 0.5 kg give a third note with amount 1p and discount 1p, so £0.00, which is refused.
- **How confirmed:** run, by `core-probe-6.ts`, `core-probe.ts` section C6, `core-probe-4.ts` part (a), `core-probe-5.ts` and `core-probe-5b.ts`.
- **Suggested fix:** keep every line's difference in the plan, or refuse a plan in which a line that was not chosen changes. Decide in the spec whether a credited line may show an amount other than quantity times price, which is the cost of exact totals, and say so on the document if it may.

### R2-L4. "Invoiced this month" counts invoices cancelled by credit notes

- **Severity:** low
- **Where:** `packages/db/src/dashboard.ts:71-82`.
- **What goes wrong:** the figure adds the total of every invoice issued in the month except void ones, and credit notes are never subtracted. An invoice with a credit note can no longer be voided (the M2 fix). So a £1,200.00 invoice cancelled in full by a credit note in the same month still counts as £1,200.00 invoiced, while a voided one counts nothing.
- **How confirmed:** by reading; not run.
- **Suggested fix:** subtract credit notes issued in the month, by issue date, or show them beside the figure. Record the definition in `docs/domain.md`.

### R2-L5. A paid invoice cannot be credited at all (a design gap from before these commits, now also a database rule)

- **Severity:** low
- **Where:** `packages/core/src/credits.ts:233-238`, `packages/db/migrations/0005_review_1_guards.sql:60-62`, `apps/web/src/app/(app)/invoices/[id]/page.tsx:260` (the button is shown only while a balance remains).
- **What goes wrong:** say a client pays an invoice in full and then returns goods, or a price reduction is agreed. Regulation 15C requires a credit note within 14 days of a decrease in consideration. Invoica refuses any credit note above the balance, so after full payment none can be issued. The only route is to remove the payment, which misstates the record. "Whole invoice" is refused once anything is paid, including a deposit recorded at issue.
- **How confirmed:** by reading. Review 1 itself suggested the balance guard; it is listed here because it is now enforced in the database.
- **Suggested fix:** allow credit notes up to the invoice total less earlier credit notes. Record any excess over the balance as money owed to the client (a refund or credit balance), with its own state.

---

## Checked and found sound

"Run" means a probe or test confirmed it; "read" means by reading the code.

- **H1, single mode (run).** Each of these holds:
  - Line credits take the price and tax from the invoice's snapshot.
  - A tax code edited after issue does not change the rate credited.
  - A quantity above what is left, a line from another invoice and a tax the invoice did not charge are each refused.
  - Line credits taken in parts add up exactly to the invoice's total, VAT and every tax row, in every rounding mode, with prices excluding or including tax, discounts, reverse charge, zero-rated, exempt and no-tax lines, and the Ghana code (the repository's property test, plus `core-probe-2.ts` and `core-probe-5.ts`).
  - Outside "document, rounded down" no credit note row had a negative VAT amount (`core-probe-5.ts`).
  - Ghana's default (per document, half up, prices excluding tax): every NHIL, GETFund Levy and VAT row on a credit note in parts is within one pesewa of rate times base and never negative (`core-probe.ts` C8). With prices including tax, 19 of 2,952 rows were more than one pesewa from rate times base, because each note is a difference of two rounded figures.
- **H3, a first amount credit (run).** On an invoice with no earlier credits, the amount is shared across the rates in proportion, and each share carries that rate. A reverse-charge share is a net amount, with VAT shown and not charged.
- **H2 (run and read).**
  - A repeated payment or credit note request with the same key and the same request returns the earlier result; a reused key with a different request or a different invoice is refused (existing tests rerun).
  - `recordPayment` and `createCreditNote` lock the invoice row before looking up the key, so two identical requests in flight serialise.
  - Each dialog makes a fresh `crypto.randomUUID()` key when it opens and reuses it on a retry inside the dialog (read).
  - The payment dialog says when the server answers that the payment was already recorded (read).
- **Concurrency (run).** Three line credits for the same remaining quantity sent at once: one issued, two refused with "This is more than is left to credit on the line." A payment, an amount credit and a line credit sent at once on a £120.00 invoice: one succeeded, the others were refused, and the balance never went below zero (`R2-4`). The credit-note guard locks the invoice row `FOR UPDATE`, as `guard_payment` does.
- **M1 and M2 guards (run).**
  - Documents can only be inserted as drafts.
  - A line cannot be inserted into, changed in or deleted from an issued document (`R2-5`, first test), and cannot move between documents.
  - A credit note above the balance is refused even by direct SQL.
  - An invoice with an issued credit note cannot be voided, and a credit note cannot be voided, in the app and in the database.
  - The schema's `check (kind = 'invoice' or credited_document_id is not null)` stops the guard's invoice lookup from being bypassed with a null invoice.
- **L2 (run and read).** Stored files cannot be changed, and a file in use cannot be deleted. Nothing in the app updates or deletes `stored_file` rows (search of `apps/web/src` and `packages/db/src`), so no current flow is broken by the new guard. `keepPdfIfMissing` already avoids replacing a kept PDF.
- **M3 and M4 (run).** On the total, rounded down: 53p at 20% plus 53p at 5% gives VAT 13p; two 20% codes on 53p each give 21p; £10.01 including VAT gives VAT £1.66. Ghana GHS 100.00 including tax gives NHIL 2.08, GETFund Levy 2.08, VAT 12.50, net 83.34. Line amounts round half up whatever the setting (1.5 × £33.33 is £50.00 under "down").
- **M5 (run).** An unregistered business cannot issue a line with a rated code, zero-rated included (existing test). Credit notes are not affected, which is correct.
- **M6 (run and read).**
  - `deriveState` keeps paid, credited and settled apart.
  - The "Paid" filter shows paid and settled invoices; "Open" includes invoices credited in part.
  - Receivables and overdue use payments plus credits; top clients and the monthly paid figures use payments only.
  - The JSON and CSV export does not mix paid and credited.
- **L3, L4, L5, L6, L7 (read, with existing tests).** `finish_outbox` acts only on running jobs. `create_organisation` checks the trial length, the codes and the time zone. Rounding pairs are validated per country on the server. `parseQuantity("1,5")` is null and `parseQuantity("1,500")` is 1,500,000 thousandths (run). The activity list uses the organisation's time zone. The HMRC reverse-charge wording is printed for GB sellers only.
- **The new `discount` field on `LineInput` (read).** It must lie between zero and the line amount and cannot be mixed with document discounts. Only credit plans set it; drafts and issuing never pass it. Issued documents are never recomputed from their rows (the only `computeDocument` callers are drafts, the editor, credit plans and samples), so it does not matter that the field is missing from `document_line`.
- **Web side (read).** The credit dialog's preview calls `planLineCredit`, `planAmountCredit` and `checkCredit` with the same inputs the server builds: snapshot lines, quantities from `creditableLines`, and earlier credit notes' snapshot totals. The server checks everything again. Line positions are kept when lines with nothing left are filtered out. "The whole invoice" appears only when nothing is paid or credited, matching the server.

## Not checked

- Anything in a browser: the dialogs, focus behaviour and the Playwright suite were not run. Statements about the client components are from reading.
- `pnpm check` (format, copy rules, lint, types) and `pnpm build`.
- The seed script and the demo data. By reading, credit notes issued before migration 0005 have no `credited_line_id`, so their line credits are not counted per line after the migration (the balance cap still applies). Not run against existing data.
- The commits after `e95f247`, beyond confirming that they do not touch the files reviewed.
- The email change ("a document voided after its email was queued is not sent"), the settings form, and the editor's filtering of tax codes for unregistered businesses.
- Statutory credit note content for Ghana (no spec read); VAT in sterling on foreign-currency invoices; performance.

## Files produced by this review

- `../review/round2/review-2.md` (this report)
- `../review/round2/db-probe.test.ts` and its output `../review/round2/db-probe.out`
- `../review/round2/core-probe.ts`, `core-probe-2.ts`, `core-probe-3.ts`, `core-probe-4.ts`, `core-probe-5.ts`, `core-probe-5b.ts`, `core-probe-6.ts`, `view-shim.ts`, with outputs `core-probe.out`, `core-probe-2.out`, `core-probe-3.out`, `core-probe-4.out`, `core-probe-5.out`, `core-probe-5b.out`, `core-probe-6.out`, all in `../review/round2/`
- `../review/round2/pinned/` (a clean export of commit `e95f247`, with `node_modules` links to the repository's installed packages and to the pinned workspace packages)

---

## Resolution (builder, 19 October 2026)

The credit note calculation was rebuilt as a ledger by tax group, written up with acceptance criteria in `docs/specs/credit-notes.md`. Tests were written first: `packages/core/test/credits.test.ts` (criteria 1 to 7, including a property test over random invoices and random mixes of line and amount credits in every rounding mode, with prices excluding and including tax, discounts, reverse charge, exempt, zero-rated, no-tax and Ghana lines) and `packages/db/test/review-2.test.ts` (each finding by name). The four database tests for R2-L1 and R2-L4 were run before their fixes and failed. The core tests are written against the ledger's new interface, so they were checked by mutation instead: sharing an amount by what was invoiced instead of what is left, or working tax from the rate instead of the ledger, makes them fail.

| Finding | Fix |
| --- | --- |
| R2-H1 | An amount credit is shared across the tax groups in proportion to the value each has left, and every credit note, by lines or by amount, takes value from the same per-group ledger. A group may not be credited beyond its value. |
| R2-M1 | A group's tax on what has been credited is the invoice's tax for that group in proportion to the value credited, rounded half up, and each note takes the difference. Credits in any split add up to the invoice's tax and base for every row; the last part of a balance can always be credited. |
| R2-M2 | The ledger works group by group, so a credit note only shows rows for the groups it credits, and never a negative tax or base, under every rounding setting. |
| R2-M3 | An amount credit is entered and priced the way the invoice was: before tax when the invoice's prices exclude tax. Documents priced including tax now also print "Total before VAT" (or "tax"), the label the documents already used after discounts. Amount credit lines are titled "Reduction on INV-0001:" followed by the invoice lines they reduce. |
| R2-L1 | Migration `0006_review_2_guards.sql`: on issue, a credit note's lines must credit lines of its own invoice and never more of a line than was invoiced, every document's number must come from its counter, and a draft credit note with lines cannot be moved to another invoice. |
| R2-L2 | The first save of a new invoice holds its request key with a transaction-level advisory lock, so an overlapping repeat waits and then finds the same invoice. |
| R2-L3 | Each line's tax share is now its part of its group's tax for the note, so line shares add up to the note's tax. A part that would leave a line with a negative value is refused as too small. A line credited in parts can still show an amount a penny away from its own quantity times price, so that the parts add up to the invoice line exactly; the spec records this choice. |
| R2-L4 | "Invoiced this month" takes off credit notes issued this month, as defined in `docs/domain.md`. |
| R2-L5 | Not changed: crediting a paid invoice needs a refund or a client credit balance, which is a product decision. Added to Kobby's open questions. |

Checks after the fixes: core 152, database 59, documents 10, PDF 50, schemas 4, web unit 5, end to end 17 passed with 3 skipped by design (tests that run on one screen size only), lint, types, format and copy rules clean.
