# Invoica: independent review of the fixes from review 9 and the tests added (review 10)

Reviewer: a separate agent, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 20 October 2026.

## Scope and commit

This review is pinned to commit `3e8cf25` ("docs: blueprint date") on `main`, and covers the 28 commits since `38774cf` (`git log 38774cf..3e8cf25`), which acted on review 9 and its Resolution section and on earlier testing. It also covers the branch `fix/confirm-then-sign-in`, one commit (`b51996c`) on top of `fa565e7`, the last commit on `main` before the three documentation commits that end the range. In order of priority:

1. whether each finding of review 9 is fixed, and whether each fix broke something near it: the balance-mode credit note (R9-M1), `taxPointOf` and `supplyDateOf` and the period refines (R9-M2), `keptRateFor` and the `sterlingRateFor` the editor sends (R9-L2), migration `0022_reminder_dates_in_the_app.sql` and `queueDueReminders` (R9-L1), and the smaller fixes (R9-L3 to R9-L7), among them migration `0023_money_not_dated_later.sql`, the ignore files, the migration image, `docs/deploy.md` and the two CI jobs;
2. money and tenancy wherever the range touched refunds, credit notes, payments, VAT in sterling and reminders;
3. real-world use: pages kept open across a change elsewhere, retries after lost answers, time zones and dates;
4. the tests added, and whether they would fail with the fix taken out.

Every probe ran against an export of `3e8cf25` made with `git archive` at `../review/round10/pinned`, and the branch's probes against an export of `b51996c` at `../review/round10/branch`. Each export's `node_modules` folders hold links: `@invoica/*` to that export's own packages, everything else to the repository's installed packages (`scratch/link-modules.sh`). `readlink -f` on all eleven `@invoica` links in each export, and the five in `../review/round10/node_modules/@invoica`, resolves inside the export it belongs to (`links-check.out`). The range changes no dependency. For the production build the pinned export then got a hard-linked copy of the repository's package store in `node_modules/.pnpm` and the repository's own relative links in place of the links to the repository (`scratch/prepare-build.sh`); the `@invoica/*` links were left as they were and were checked again afterwards.

Two probes import code of `38774cf` from review 9's export (`../review/round9/pinned`): the reminder scan of that version, to see what an app from before migration 0022 does against the migrated database, and two of the builder's new tests run against the old code. Line numbers are for `3e8cf25`, or for `b51996c` where a finding says "on the branch". I changed nothing in the repository; another session went on working in it during the review, which is why every check here ran against the exports.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| Core | `pinned/packages/core` | 236 run, 236 passed, 0 failed, 0 skipped (21 files) |
| Schemas | `pinned/packages/schemas` | 5 run, 5 passed, 0 failed, 0 skipped (1 file) |
| Documents | `pinned/packages/documents` | 28 run, 28 passed, 0 failed, 0 skipped (3 files) |
| Web unit | `pinned/apps/web` | 72 run, 72 passed, 0 failed, 0 skipped (14 files) |
| Database | `pinned/packages/db`, one file at a time | 205 run, 205 passed, 0 failed, 0 skipped (22 files) |
| Types (`tsc --noEmit`) | pinned core, schemas, documents, db, pdf, web | clean, all six |
| Copy rules (`scripts/copy-check.mjs`) | pinned | 308 files examined, 0 findings |
| Credit note, dated-later and role probes `guards10-probe.test.ts` | pinned, fresh database | 8 run, 8 passed |
| VAT in sterling probes `sterling10-probe.test.ts` | pinned, fresh database | 5 run, 5 passed |
| Reminder and time zone probes `reminders10-probe.test.ts` | pinned (and the scan of `38774cf`), three fresh databases | 4 run, 4 passed; 1,417 hourly scans, 119,028 comparisons with `dueReminder` |
| Retry probes `retry10-probe.test.ts` | pinned, fresh database | 3 run, 3 passed |
| Sign-in probes `auth10-main.test.ts`, `auth10-branch.test.ts` | each export's `auth.ts` on a fresh database, through `auth.handler` | 2 run, 2 passed; 2 run, 2 passed |
| Smaller probes `misc10-probe.test.ts` | pinned | 3 run, 3 passed; a property of `retypeForCurrency` over 20,000 runs |
| The builder's R9-M2 tests against `38774cf` `tests10-probe.test.ts` | code of `38774cf` on a database migrated to `3e8cf25` | 2 run, 2 passed |
| Due date probe `dates10-probe.test.ts` | pinned, fresh database | 1 run, 1 passed |
| Migration image, emulated | `scratch/migrate-image/app`: only what `FROM deps` and the three `COPY` lines hold | `migrate-image-check.out`: 23 migrations applied as an unprivileged user, then none |
| Ignore files and `sslmode` | `ignore-check.out`, `sslmode-check.out` | see "Checked and found sound" |
| Production build and server | `pinned/apps/web` | not built: the machine never had 5.5 GB available with no test run going (`build.out`) |

Each probe asserts what it observed and writes its observations to a `.json` beside it; several of them assert a defect. To rerun them, from `../review/round10` with `TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres`: `node node_modules/vitest/vitest.mjs run --root . --no-file-parallelism --testTimeout=1800000 --hookTimeout=300000 --reporter=verbose <name>`, with `guards10-probe`, `sterling10-probe`, `reminders10-probe` (about three minutes), `retry10-probe`, `auth10-main`, `auth10-branch`, `misc10-probe`, `tests10-probe` or `dates10-probe` as the name. The pinned database suite: `scratch/run-suites.sh`.

The sign-in probes replace only `server-only`, `next/server` (`after()` lets the work run on), `lib/db` (the test database as the app role) and `lib/email` (a recorder). Every database probe creates and drops its own database through `createTestDatabase`; the emulated migration image used `invoica_test_r10mig` and the HTTP run `invoica_test_r10http`, both dropped at the end. Some probes connect to their own test database as the superuser or the owner role: to read the outbox, to clear `sterling_rate_for` or a period date on a draft (as a draft saved before migration 0019 or before this range has it), to switch reminders off for the businesses of other probes, and to put back the scan of migration 0016 in one database. The `invoica`, `invoica_demo`, `invoica_prodcheck` and `invoica_audit` databases and the server on port 3000 were not touched.

The app was not built or served over HTTP this time. A guarded build (`scratch/build-when-free.sh`, which waits for no test run or build and at least 5.5 GB available) waited from 07:20 to 07:55; another session's development server and end-to-end tests kept available memory between 2.5 and 4.3 GB throughout, so I stopped the wait. The browser probes written for it (`http10-probe.mjs`: the credit dialog with a payment removed in another tab, the rate method changed in Settings while the editor is open, an action the server does not know, and an action after signing out) were not run, and the database made for them (`invoica_test_r10http`) was dropped. Where a finding below rests on the editor's behaviour, the editor's part is by reading and its expressions are reproduced in the probes.

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 0 | |
| Medium | 1 | R10-M1 |
| Low | 8 | R10-L1 to R10-L8 |

What holds:

- **R9-M1 is fixed.** "Everything still owed" now carries the balance the person confirmed. A payment removed or recorded, or a colleague's credit note, while the dialog is open is refused with the new figure; nothing is recorded and no number is used; the same request key then issues with the new figure, and a retry returns the same note. Two tabs at once make one note.
- **R9-M2 is fixed.** The editor, saving and issuing all take the tax point from `taxPointOf`; a period with one date is refused when saved and again at issue; an invoice dated in November for October asks for, keeps and prints October's rate.
- **R9-L2 is fixed** for every route review 9 ran: the same figure typed for a new day is saved, a carried-over one is refused, a rate with no record is asked for again on saving and on issue, and a save that needs no VAT in sterling keeps the old record so the next save that needs it asks again. A copy of an issued invoice carries no rate.
- **R9-L1 is fixed.** All 484 names the new guard accepts are names the app reads, and the scan with a day's margin queued exactly what the app's own date says, at every hour for eight weeks in twelve zones (Vancouver, Edmonton, Casablanca and El Aaiun among them, where the database and Node read the clock an hour apart): 119,028 comparisons, none early, none twice, none missed.
- **R9-M3 and R9-L3 are fixed.** Onboarding sent twice, or twice at once, makes one business; new clients, items, tax codes and copies sent again make one record; void and delete asked again are done; a draft saved after it was issued names its number.
- **R9-L4 is fixed.** "1.500" in euros or pounds is refused again, and amounts already typed are written for a new currency where the figure is the same.
- **R9-L7 (b) is fixed.** Migration 0023 refuses money dated more than a day after the database's today in the business's time zone; the app role still cannot run the scan, change role or switch off row-level security, and the worker still cannot read the business tables.
- **R9-L6 is fixed.** The servers' settings files are ignored by Git and Docker, the guide's `sslmode` and certificate advice matches what pg 8 does, and the migration image, emulated from exactly the files its stage holds, migrates an empty database as an unprivileged user and runs again cleanly.

What does not:

- **R10-M1.** On `main`, opening a confirmation link still signs the owner of the address in to an account someone else created (R9-M4, R8-M2). The branch closes it and is still waiting for approval.
- **R10-L1.** An invoice open in the editor from before midnight, a month's end, or a change of the rate method or time zone cannot save its exchange rate: each rate typed is refused with the same message until the page is reloaded.
- **R10-L2.** The issue dialog shows a total worked out with the tax codes the page loaded; a code changed meanwhile issues the invoice at another total.
- **R10-L3.** A saved item added to an invoice in yen is priced at a hundred times its figure, and in dinars at a tenth.
- **R10-L4.** A draft prepared ahead with no issue date keeps the due date worked out the day it was first saved.
- **R10-L5.** Once the owner has confirmed the address, the reset, password-changed and existing-account emails greet them with the name someone else chose (R9-L5 is fixed only before confirmation).
- **R10-L6.** An app from before migration 0022, as the guide's way back would run it, sends reminders a day early and one the issue-day rule forbids.
- **R10-L7.** Corrections made between a lost answer and the second press are dropped without a word, and "everything still owed" after the invoice was paid meanwhile answers "A credit note must be for more than zero."
- **R10-L8.** Tests that claim more than they check, and CI jobs that have not run.

---

## Findings

### R10-M1. On `main`, confirming an address still signs the owner in to someone else's account

- **Severity:** medium on `main` (as R9-M4 and R8-M2); low on the branch
- **Where:** `apps/web/src/lib/auth.ts:63`, `autoSignInAfterVerification: true`. On the branch, `apps/web/src/lib/auth.ts:65` sets it to `false`, and the confirmation page sends the person to sign in.
- **What goes wrong:** someone signs up with the owner's address and a password of their own. The owner opens the confirmation link sent to them and is signed in to that account (302 to `/confirm-email` with a session cookie). The other person can then sign in with their password, and what either sets up is in the same account (review 9's A5: the business and bank details the other person set up were what the owner found). The fix waits on the branch, as the Resolution of review 9 says.
- **How confirmed:** run, `auth10-main.json`: `"confirmationOpened": {"status": 302, "location": "/confirm-email", "sessionCookie": true}`; on the branch, `auth10-branch.json`: `"sessionCookie": false`, with `"emailVerifiedAfterOpening": true` on both. The branch merges cleanly onto `main` (`git merge-tree`).
- **Suggested fix:** merge the branch once approved, then consider asking for the account's password on the confirmation page, as review 9 suggested, so a click by the owner confirms nothing for someone else.

### R10-L1. A page opened before midnight, a month's end, or a change of rate method or time zone cannot save its exchange rate

- **Severity:** low (the server refuses correctly and nothing wrong is issued; the person is stuck and may lose what they typed)
- **Where:**
  - `apps/web/src/components/invoice-editor.tsx:321` takes `today` and `org` from the page's props, which are fixed when the page is rendered (`apps/web/src/lib/editor-data.ts:28` and `:60`). `:411-426` work out what the rate is for from that `today` (for an issue date left blank, as every new invoice starts, `editor-data.ts:78`) and that rate method; `:781-783` record it when the rate is typed, and `:592` sends it with the save.
  - `packages/db/src/documents.ts:389-418` (`keptRateFor`) works out what the rate is for from the server's today and the business's current method, and refuses a rate entered for anything else.
  - After a refused save the editor shows the message (`invoice-editor.tsx:598-601`) and nothing refreshes the page's `today` or method.
- **What goes wrong:**
  - **Across midnight, market rates.** At 23:50 on 19 October an owner opens a new invoice in euros, chooses the client, types the lines and the market rate for 19 October, and presses "Save draft" at 00:01. The answer is "The exchange rate was entered for 19 October 2026. Enter the market rate for 20 October 2026." They look up the rate for 20 October, type it and save again: the same message, because the page still works the rate out for the 19th. "Issue invoice" answers the same. Only a reload helps, and on a new invoice a reload loses everything typed (the page warns). Saving once with the rate field empty, which opens the draft at its own address, is a way out the page does not mention.
  - **Across a month's end, HMRC rates:** the same between 31 October and 1 November ("The exchange rate was entered for October 2026. Enter HMRC's rate for November 2026.").
  - **The method changed in Settings** in another tab, or by a colleague: "The exchange rate was entered before the way rates are chosen changed. Enter it again.", after every attempt.
  - **The time zone changed in Settings**, to one where it is already tomorrow: as across midnight.
- **How confirmed:** run, `sterling10-probe.json`, `"stalePage"`: for each of the four cases, the rate the page sends (worked out with the editor's own expressions, as above) is refused on the first save, a new figure typed and saved is refused with the same message, "Issue invoice" is refused, and the same figure from a reloaded page is saved. For example `"marketAcrossMidnight": {"pageAsksFor": "EUR|market|2026-10-19", "serverNeeds": "EUR|market|2026-10-20", "first": "The exchange rate was entered for 19 October 2026. Enter the market rate for 20 October 2026.", "second": "The exchange rate was entered for 19 October 2026. …", "afterReload": "did not fail"}`. That nothing refreshes the page after the refusal is by reading.
- **Suggested fix:** when a save is refused with `sterling_rate_stale`, refresh the page's data (`router.refresh()`) so `today` and the method are the server's, and keep what was typed; or return the record the server needs with the refusal and let the editor take it. Saying "Reload the page to enter it" in the message would at least point to the way out.

### R10-L2. The issue dialog's total comes from the tax codes the page loaded

- **Severity:** low (needs a tax code changed while an invoice is open; the issued invoice cannot change; this predates the range)
- **Where:** the editor works its totals out with the codes it loaded (`apps/web/src/components/invoice-editor.tsx:399`) and the issue dialog shows that total (`:1431-1435`). "Issue invoice" saves the draft as sent and issues it (`apps/web/src/lib/actions/documents.ts:90-92`), and saving resolves every line's tax from its code as the code stands now (`packages/db/src/documents.ts:361-379`). `updateTaxCode` says lines already on documents keep their tax (`packages/db/src/taxes.ts:70-71`), which drafts do not.
- **What goes wrong:** an owner has an invoice of £100.00 at "Standard rate" open in the editor; the dialog asks "Issue INV-0001?" and shows £120.00. Meanwhile a colleague (or the owner in another tab) changes the code's rate to 5%. The owner presses "Issue invoice": the invoice issued is for £105.00. The figure confirmed and the figure issued differ, as in R8-M1 and R9-M1 for credit notes.
- **How confirmed:** run, `guards10-probe.json`: `"staleTaxCode": {"dialogShowed": 12000, "issued": 10500, "number": "INV-0001"}`. The probe works the dialog's total out with `computeDocument` and the code as loaded, as the editor does, then saves and issues as the action does.
- **Suggested fix:** send the total the person confirmed with "Issue invoice" and refuse when the server's differs ("The total changed while this was open: it is now £105.00. Check it and issue again."), as credit notes now do; or send each line's tax as the page knows it and refuse when a code has changed.

### R10-L3. A saved item added to an invoice in another currency takes another figure

- **Severity:** low (the price shows before the invoice is issued; this predates the range)
- **Where:** `apps/web/src/components/invoice-editor.tsx:530` writes a saved item's price as `toDecimalString(from.unitPrice, state.currency)`. An item's price is kept in minor units of the business's own currency (the items page reads and shows it in that currency) and has no currency of its own. The menu "Add a saved item" (`:1133-1149`) is offered whatever the invoice's currency.
- **What goes wrong:** a UK business saves "Location day" at £500.00 (50,000 pence). On an invoice in yen for a Japanese client the line is priced "50000", ¥50,000; in Kuwaiti dinars "50.000", KWD 50.000; in euros "500.00". The figure the owner saved is 500 in no case for yen or dinars. R9-L4's fix writes typed amounts for a new currency "where the figure is the same"; a saved item does not go through it.
- **How confirmed:** run, `misc10-probe.json`, `"itemPrice": {"itemSavedAs": "£500.00", "JPY": {"priceField": "50000", "onTheInvoice": "¥50,000"}, "KWD": {"priceField": "50.000", "onTheInvoice": "KWD 50.000"}}`, with the editor's own expression; that the menu is offered for every currency is by reading.
- **Suggested fix:** write the item's price with `retypeForCurrency(toDecimalString(price, baseCurrency), baseCurrency, invoiceCurrency)`, or offer saved items only on invoices in the business's currency, or give items a currency.

### R10-L4. A draft prepared ahead keeps the due date worked out the day it was first saved

- **Severity:** low (the preview shows the due date; this predates the range)
- **Where:** with the issue date left blank, the editor sets the due date from the terms and today (`apps/web/src/components/invoice-editor.tsx:361-373`) and sends it with every save (`:299`). A saved draft opens with `dueTouched: !!d.dueDate` (`apps/web/src/lib/editor-data.ts:129`), as if the date had been changed by hand, so it no longer follows the terms. Issuing keeps a due date that is set (`packages/db/src/documents.ts:632`).
- **What goes wrong:** on 1 October an owner prepares an invoice for a client on 14-day terms, leaving the issue date blank so that it takes the day it is issued. On 10 October they open it and issue it: it is dated 10 October and due on 15 October, five days, and reminders follow that date. Issued on 20 October it is refused with "The due date cannot be before the issue date." The hint "Set from the payment terms." has gone from the field, which is the only sign.
- **How confirmed:** run, `dates10-probe.json`: `"issuedOn10October": {"issueDate": "2026-10-10", "dueDate": "2026-10-15"}`, `"issuedOn20October": "The due date cannot be before the issue date."`, and the same draft saved without a due date is due on `"2026-10-24"`. That the editor sends the date it set, and opens a saved draft as touched, is by reading.
- **Suggested fix:** send no due date while it follows the terms (the server already works it out at issue), or keep whether it was set by hand with the draft.

### R10-L5. Sign-in emails greet the owner with the name someone else chose, once the owner has confirmed

- **Severity:** low
- **Where:** `apps/web/src/lib/auth-emails.ts:12-13` greets by name when `confirmed`; `apps/web/src/lib/auth.ts:45`, `:50` and `:56` pass `user.emailVerified`. Opening the confirmation link sets it, whoever chose the name.
- **What goes wrong:** someone signs up with another person's address and the name "there. Your Invoica trial has ended: settle it at pay-invoica.example today". Before the owner opens the link, a reset email reads "Hello," (the R9-L5 fix). The owner then opens the confirmation link sent to them, which confirms the account. From then on the reset link they ask for to take the account back, the "Your Invoica password was changed" email that follows it, and the "You already have an Invoica account" email all open "Hello there. Your Invoica trial has ended: settle it at pay-invoica.example today," from Invoica's own address. On the branch this is the very path by which the owner takes the account back (R9-M4), and anyone can ask for more reset emails to the address.
- **How confirmed:** run on both exports, `auth10-main.json` and `auth10-branch.json`: `"resetBeforeConfirming": "Hello,"`, `"emailVerifiedAfterOpening": true`, and `"resetAfterConfirming"`, `"passwordChanged"` and `"existingAccount"` each `"Hello there. Your Invoica trial has ended: settle it at pay-invoica.example today,"`.
- **Suggested fix:** greet by name only once the person has signed in with the account's password at least once (for example a `nameConfirmed` flag set at the first sign-in), or never greet by name in sign-in emails.

### R10-L6. An app from before migration 0022 sends reminders early against the migrated database

- **Severity:** low (nothing is deployed yet; it needs the previous image running after the migration, which the guide gives as the way back)
- **Where:** migration 0022 changes what `app.due_reminders` returns in place: `offset_days` may now be an offset whose day is tomorrow by the database's date, or the day before the invoice was issued (`0022_reminder_dates_in_the_app.sql:69-75`). The app of `38774cf` queues `row.offset_days` as it comes (`packages/db/src/reminders.ts:49-50` at `38774cf`). `docs/deploy.md:88` says the previous version keeps working against the new database, and "To go back, start the previous image".
- **What goes wrong:** with the new scan and the previous app, a London invoice issued on 6 November and due on 10 November gets its "due today" reminder on 9 November and its "seven days late" one on 16 November, a day early each, and its "three days before" one on 6 November for the 7th. An invoice issued on 8 November, due on the 10th, gets a "three days before" reminder on the day it is issued, which rule 10 forbids. Each early reminder takes its offset's key, so the one on the right day never goes. This happens between running the migration image and restarting the app (the scheduler calls every five minutes), and for as long as a previous image runs after a rollback.
- **How confirmed:** run, `reminders10-probe.json`, `"oldAppNewScan"`: with `38774cf`, `"0": "queued 2026-11-09T00:30:00.000Z (London 2026-11-09); its day 2026-11-10"` and, for the invoice issued on the 8th, `"-3": "queued 2026-11-08T10:30:00.000Z (London 2026-11-08); its day 2026-11-07"`; with `3e8cf25` on the same database, each on its day and no `-3` for that invoice.
- **Suggested fix:** keep the old function's contract and add the new scan as a new function (`app.reminder_candidates`), granted to the worker, so a previous app still gets what it expects; and say in the guide which migrations a previous image cannot run against.

### R10-L7. Retries and messages

- **Severity:** low
- **Where:** `packages/db/src/clients.ts:62-67`, `items.ts:25-30`, `taxes.ts:35-40` and `organisations.ts:59` return the record a request key made, whatever the second request asked for; `packages/db/src/documents.ts:1069-1071` works out the balance credit before comparing the balance.
- **What goes wrong:**
  - **A correction after a lost answer is dropped.** A new tax code "Reduced rate" at 5% is saved and the answer is lost; the owner notices the rate should be 12.5%, corrects it in the same form and presses Save again. The form closes as saved and the code kept is the 5% one. The same for a client ("Harbour Mil Ltd" corrected to "Harbour Mill Ltd" with an email added: the first is kept, without the email), an item (a price corrected from £500.00 to £650.00: £500.00 is kept) and onboarding (the second name is ignored). A draft saved again with the same key takes the correction (`saveDraftAction` updates it), so the forms behave differently from the editor.
  - **"Everything still owed" after the invoice was paid in full meanwhile** answers "A credit note must be for more than zero." (also the answer to the second of two tabs pressed at once). Nothing is recorded; the message does not say that the balance changed.
- **How confirmed:** run, `guards10-probe.json` `"changedRetry": {"sameCode": true, "keptRatePpm": 50000}`, `"balanceOtherChanges": {"paidInFull": "A credit note must be for more than zero.", "paidInFullNotes": 0}`, `"balanceRace": {"outcomes": ["issued", "A credit note must be for more than zero."], "creditNotes": 1}`; `retry10-probe.json` `"changedRetry": {"client": {"same": true, "name": "Harbour Mil Ltd", "email": null}, "item": {"same": true, "unitPrice": 50000}}` and `"onboarding": {"sameId": true, "businesses": ["Lagoon Studio"]}`. That the forms close as saved is by reading.
- **Suggested fix:** keep a fingerprint with each key, as payments and credit notes do, and on a different request either apply it (as drafts do) or refuse it ("This was saved before your change. Check it and save again."); compare the confirmed balance before working out the plan.

### R10-L8. Tests that claim more than they check, and CI jobs that have not run

- **Severity:** low
- **(a) The hourly reminder test needs the two time zone readings to differ (run).** `packages/db/test/reminders.test.ts:287` ("in every zone, at every hour, the scan queues what the app's own date says is due") fails with the fix taken out here, at three of its 363 checks (121 hours, three invoices: two in Casablanca from 29 October 23:30 UTC, one in Vancouver at 07:30 UTC on 2 November), because this machine's PostgreSQL and Node read those zones an hour apart (`reminders10-probe.json`, `"hourlyTestReverted"`, with the scan of 0016 and the app of `38774cf`). Where the two readings agree, as they may in CI, it passes either way. A test of `queueDueReminders` with a scan stub that returns a candidate a day out would check the app's choice on any machine.
- **(b) The November-for-October test passes at `38774cf` too (run).** `packages/db/test/sterling.test.ts:245`, "an invoice dated in November for October takes October's rate, as the editor asks", gives both dates of the period, which the old rule already handled; every value it asserts is the same with the code of `38774cf` (`tests10-probe.json`, `"novemberForOctober": {…, "passesAt38774cf": true}`). It does not check what the editor asks. The test after it ("a draft kept with one date of its period is refused at issue") does fail at `38774cf`, on its message.
- **(c) CI (read).** The handover says CI has never run on GitHub, so the new `image` and `e2e-production` jobs have not run anywhere; the migration part of `image` was emulated here (see "Checked and found sound"), and the end-to-end suite was not run against a production server in this review.

---

## Checked and found sound

"Run" means a probe confirmed it; "read" means by reading the code.

- **R9-M1 (run, `guards10-probe.json`).** A payment removed while the dialog showed £60.00: "The amount owed changed while this was open: everything still owed is now £120.00. Check it and issue again.", no credit note, the number counter unchanged; the same key with £120.00 then issues CN-0001 and the balance is £0.00; the same request again returns the same note; the same key with the old figure is refused as a reused key. A payment recorded meanwhile: refused with £60.00. A colleague's credit note meanwhile: refused with £48.00. Two tabs at once: one note. A request without `balance` (a page from before the change) is refused by the schema. The dialog sends `balance` and refreshes its figures after a refusal (read).
- **R9-M2 (run, `sterling10-probe.json`; read).** `taxPointOf` and `supplyDateOf` are the only rule, in the editor (`invoice-editor.tsx:411-426`, `:455`), on save (`documents.ts:397-401`) and on issue (`:638-649`). A period with only its end or only its start is refused by the schema with "Enter both dates of the period, or neither." on the missing date's field, and at issue for a draft kept with one date. An invoice dated 3 November for October: the editor asks for October, the draft keeps `EUR|hmrc_period|2026-10`, and it prints "VAT in sterling at £1 = 1.1500 EUR, HMRC period rate for October 2026."
- **R9-L2 (run, `sterling10-probe.json`).** With what the editor sends: the same figure for a new day is saved and kept as `EUR|market|2026-10-20`, and a carried-over one is refused. A rate with no record is refused at issue and on saving, whether the request sends `null` or leaves the record out ("Enter the exchange rate again: HMRC's rate for October 2026."). A crafted save in yen with a zero-rated line keeps `EUR|hmrc_period|2026-10`, and the next save with a VAT line is refused whether the record is sent back or left out. A record of any shape can be kept while VAT in sterling is not needed, and is refused once it is (with a date error for a malformed one); it is the business's own request, so nothing reaches another business. A copy of an issued euro invoice has no rate, no record and no supply date.
- **R9-L1 (run, `reminders10-probe.json`).** Of the database's 499 names, 484 pass the new guard (the Resolution's figure), and Node reads all of them; "CET", "Factory", "posix/Europe/London", "right/Europe/London", "Europe/Kiev" and "Asia/Calcutta" are refused by the trigger as the app role, and a name with a trailing line break too. 18 old names that Node knows and this database does not (such as "Asia/Calcutta") pass `isValidTimeZone` and are then refused by the database with "Choose a time zone from the list."; the forms offer none of them. The scan with a day's margin, at every hour from 14 September to 12 November 2026 for 84 invoices in twelve zones issued near local midnight and due up to nine days later, with offsets -3, 0, 7 and 14: 1,417 scans, 278 reminders, each queued on the hour the app's own date first made it due, none before its day, none before the issue day, none twice; 1,932 candidates offered with nothing due were left alone. The margin is enough while the two readings are at most a day apart (read: a reminder due by the app's date passes every condition of the scan with a day's margin on its date, its catch-up week and its issue day).
- **Reminders and roles (run).** `app.due_reminders` is still refused to the app role ("permission denied for function due_reminders") after `create or replace`; the worker is refused on `payment`, `organisation` and `document`; the app role cannot `set role invoica_owner` or turn row-level security off, and sees no documents without a business set.
- **Migration 0023 (run, `guards10-probe.json`).** As `invoica_app`, in London, Kiritimati and Pago Pago: a payment dated the database's tomorrow in the business's zone is accepted (the stated margin), two days on is refused with "A payment cannot be dated after today.", and moving a payment's date later is refused (a recorded payment cannot be changed). The app still refuses anything after its own today (read).
- **Request keys and tenancy (run, `guards10-probe.json`, `retry10-probe.json`).** The same key in two businesses makes a client and an item in each; one business cannot copy another's invoice ("This invoice does not exist."). Onboarding twice at once and a third time with another name: one business. Void again: done, and the first reason kept; delete again: done; a copy asked for again: one copy, and the same key for another invoice is refused; a draft saved after it was issued: "This invoice has already been issued as INV-0002, so it can no longer be changed."
- **Amounts (run, `misc10-probe.json`).** "1.500", "2.000", "0.001" and "1.5000" are refused in euros and pounds, "1.500" is 1.500 in dinars, and "1,500" is 1,500.00. `retypeForCurrency` writes "100.00" euros as "100" yen and leaves "100.50" for the person to correct; over 20,000 random amounts and pairs of eight currencies, every retyped amount reads in the new currency as the same figure, and every amount left as typed is one the new currency cannot hold and is refused there.
- **Sign-up names (run, `auth10-*.json`, `"G2"`).** A Persian name with a zero-width non-joiner and a Sinhala one with a joiner are accepted; a right-to-left override, an isolate, a soft hyphen, a zero-width space, a byte order mark and a line separator are refused.
- **The migration image (run, emulated, `migrate-image-check.out`).** A folder holding only what the `deps` stage copies, installed with `pnpm install --frozen-lockfile --offline`, plus the three `COPY` lines of the `migrate` stage, with no `tsconfig.json`: `packages/db/node_modules/.bin/tsx packages/db/scripts/migrate.ts`, run as an unprivileged user against an empty database created as the guide and the CI job create it, applied all 23 migrations, and a second run applied none. No Docker daemon runs here, so the image itself was not built.
- **Ignore files and certificates (run, `ignore-check.out`, `sslmode-check.out`; read).** With the pinned `.gitignore`, `deploy/invoica.env`, `migrate.env`, `scheduler.env` and `tunnel.env` are ignored and `git add -A` stages none of them; `.dockerignore` has `**/*.env`, and `.env.example` matches neither. pg 8.23.1 (pg-connection-string 2.14.1) reads `require`, `verify-ca` and `prefer` as `verify-full`, with its warning, as the guide now says; `NODE_EXTRA_CA_CERTS` is read by Node's TLS defaults, which pg uses when no `ca` is given (read).
- **Messages (read; the web unit tests `reach.test.ts` and `result.test.ts` pass).** `reach` answers "Invoica has been updated. Copy anything you typed, then reload the page." for an action the server no longer knows (its unit test uses Next.js's own error class), and `failure` answers "You have been signed out, so this was not saved. …" for a redirect to `/sign-in` (Next.js 16.4.2's digest is `NEXT_REDIRECT;<type>;/sign-in;307;`).
- **The leave dialog and archived codes (read).** With changes not saved, a link to another page of the app asks first; links that open a new tab or download, and links to the same page, are left alone. A draft line keeps a tax code archived since it was chosen, labelled "(archived)", and the code is offered on no other line.
- **The branch (run, read).** On `b51996c`, opening a confirmation link confirms the address and signs nobody in; its changes to `apps/web/src` and `apps/web/e2e` are line for line those of `487d471`, which review 9 ran, and it merges onto `main` without conflict.

## Not checked

- The end-to-end suite, against either server; `pnpm check` as a whole (format and lint); the PDF package's tests.
- Building or running the container images (no Docker daemon); Resend, Cloudflare and a provider's certificates.
- The branch over HTTP.
- The production build and server, and with them the browser probes in `http10-probe.mjs` (see "Tests run").
- The four commits on `main` after `3e8cf25` (`5b21189` to `dc305e1`), made while this review ran, and the uncommitted migration `0024_reminder_scan_window.sql` in the working tree. By its subject, `5b21189` ("issuing checks the total the person confirmed") may touch R10-L2; none of them was read or run here.
- Whether HMRC's rules and the market-rate method are what the specs say (as in review 9, the findings above are about the code agreeing with itself).
- Load: with its margin the scan offers invoices that have nothing due (a day early by the database's date, or with an earlier offset skipped by the issue-day rule): 1,932 such offers in the 1,417 hourly scans here, each one short transaction as the owner. The scheduler scans every five minutes; not measured at scale.

## Files produced by this review

All in `../review/round10/`:

- `review-10.md` (this report);
- `pinned-core.out`, `pinned-schemas.out`, `pinned-documents.out`, `pinned-web.out`, `pinned-db.out` (pinned suites), `typecheck-*.out` (types), `copy-check.out`, `links-check.out`;
- `guards10-probe.test.ts` with `guards10-probe.out` and `guards10-probe.json`;
- `sterling10-probe.test.ts` with `sterling10-probe.out` and `sterling10-probe.json`;
- `reminders10-probe.test.ts` with `reminders10-probe.out` and `reminders10-probe.json`;
- `retry10-probe.test.ts` with `retry10-probe.out` and `retry10-probe.json`;
- `auth10-shared.ts`, `auth10-main.test.ts` with `auth10-main.out` and `auth10-main.json`, `auth10-branch.test.ts` with `auth10-branch.out` and `auth10-branch.json`;
- `misc10-probe.test.ts`, `tests10-probe.test.ts` and `dates10-probe.test.ts`, each with its `.out` and `.json`;
- `migrate-image-check.out` and `scratch/migrate-image/` (the emulated migration image), `ignore-check.out` and `scratch/ignore-check/`, `sslmode-check.out`;
- `http10-probe.mjs` (written for the production server and not run) and `build.out`; `scratch/http/` (empty);
- `scratch/link-modules.sh`, `scratch/run-suites.sh`, `scratch/prepare-build.sh`, `scratch/build-when-free.sh`, `scratch/make-http-db.mts`, `scratch/serve.sh`;
- `pinned/` (an export of `3e8cf25`, with a hard-linked copy of the repository's package store in `node_modules/.pnpm`) and `branch/` (an export of `b51996c`), each with `node_modules` links to its own packages, and `node_modules/` (links to `pinned/`).

## Resolution (builder, 20 October 2026)

Each fix began with a test that failed before the change, except where the table says otherwise.

| Finding | Fix |
| --- | --- |
| R10-M1 | Approved and built on 20 October 2026: the branch is merged and the confirmation page asks for the account's password (R9-M4), so the owner's click confirms nothing for someone who signed up with their address. |
| R10-L1 | A refused save or issue now fetches the page's data again (`router.refresh()`), so today, the rate method, the time zone, the tax codes and the next number are the server's; what was typed stays, the rate is cleared with the reason, and the rate typed again is saved. End-to-end: the way rates are chosen changed in another tab. |
| R10-L2 | Fixed in `5b21189`: issuing carries the total the person confirmed, and another total is refused with the new figure ("The total changed while this was open: it is now £110.00, with the tax rates and settings as they are now. Check it and issue again."); the editor then shows the new total to confirm (`docs/specs/issuing.md`). |
| R10-L3 | A saved item's price is written in the business's currency and retyped for the invoice's (`retypeForCurrency`): £500.00 is "500" on a yen invoice and "500.000" in dinars. |
| R10-L4 | A due date that follows the payment terms is no longer sent with a save, so a draft prepared ahead takes its due date from the day it is issued; a date set by hand is kept as before. |
| R10-L5 | Sign-in emails greet no one by name (sign-in rule 7). |
| R10-L6 | The deployment guide now says which migrations a previous image cannot run the scan against (0022 and 0024) and to stop the scheduler while migrating and while an older image runs. Keeping the old function's contract and adding the new scan as a function of its own would change the worker role's grants, which the owner approved on 20 October 2026: migration 0026 keeps `app.due_reminders` as an older image expects and adds `app.reminder_candidates` for the app (decision 0011), so the scheduler needs no stopping. Migration 0024 also narrows the scan's margin from a day to three hours either side of now. |
| R10-L7 | (a) A new client, item or tax code keeps a digest of its request (migration 0025): the same request again changes nothing, and one corrected between a lost answer and the second press is saved as corrected, as a draft is. Onboarding sent again opens the business already made; its details can be changed in Settings. (b) "Everything still owed" compares the confirmed balance before working out the credit, so one paid in full meanwhile answers "The amount owed changed while this was open: nothing is owed on it now, so there is nothing to credit." |
| R10-L8 | (a) A test with a scan that offers the wrong offset, and a day out, checks the app's choice on any machine. (b) The "November for October" database test stays as a check of the period's rule; what the editor asks for a period is checked end to end. (c) The CI jobs still wait for GitHub. |

Found while testing in this round and fixed with tests:

- The invoice page and the dashboard now say when an email or reminder has not gone, is being tried again, or could not be sent (`docs/specs/email-status.md`).
- Refusals of a state change say what to do ("This invoice is void, so it cannot be marked as sent.").
- Long unbroken names, titles, addresses and item names pushed the client page, the item list, the editor and page headers past the edge of a phone's screen; they wrap.
