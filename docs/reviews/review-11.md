# Invoica: independent review of the fixes from review 10 and the tests added (review 11)

Reviewer: a separate agent, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 20 October 2026.

## Scope and commit

This review is pinned to commit `24c0132` ("docs: correct the times in the progress log") on `main`, and covers the 26 commits since `3e8cf25` (`git log 3e8cf25..24c0132`), which acted on review 10 and its Resolution section. In order of priority:

1. draft versions: `draftVersion`, the `version` and `overwrite` fields of the draft input, `updateDraft` in `packages/db/src/documents.ts`, the editor in `apps/web/src/components/invoice-editor.tsx`, `saveDraftAction` in `apps/web/src/lib/actions/documents.ts`, and rule 7 of `docs/specs/issuing.md`;
2. the confirmed total at issue (`issueDocument(..., confirmed)`, `saveAndIssueAction`, the `issueConfirmation` schema) and the editor's `router.refresh()` after a refused save, with the cases where it is skipped;
3. migration `0025_request_fingerprints.sql` and the corrected repeats in `packages/db/src/clients.ts`, `items.ts` and `taxes.ts`, for tenancy and for two requests at once;
4. migration `0024_reminder_scan_window.sql` with `queueDueReminders`;
5. `emailDeliveries` and `undeliveredEmails` in `packages/db/src/outbox.ts`, their display on the invoice page and the dashboard, and the development mailbox refusing `.invalid`;
6. `rescaleMinor` in `packages/core/src/money.ts`, `rescaleItems` in `packages/db/src/organisations.ts`, the new messages of `checkPayment` and of the state transitions in `packages/core/src/states.ts`;
7. whether the tests added would fail with the fix taken out.

Every probe ran against an export of `24c0132` made with `git archive` at `../review/round11/pinned`. Its `node_modules` folders hold links: `@invoica/*` to the export's own packages, everything else to the repository's installed packages (`scratch/link-modules.sh`, review 10's script). `readlink -f` on all sixteen `@invoica` links (eleven in the export, five in `../review/round11/node_modules/@invoica`) resolves inside `../review/round11/pinned/packages/` (`links-check.out`). Line numbers are for `24c0132`.

As asked, the app was not built or served and no browser test ran: another session needed the memory. Where a finding rests on what the editor does in the browser, the editor's part is by reading, and the server's part was run with the editor's own expressions reproduced in the probe.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| Core | `pinned/packages/core` | 243 run, 243 passed, 0 failed, 0 skipped (21 files) |
| Schemas | `pinned/packages/schemas` | 5 run, 5 passed (1 file) |
| Documents | `pinned/packages/documents` | 28 run, 28 passed (3 files) |
| Web unit | `pinned/apps/web` | 71 run, 71 passed (14 files) |
| Database | `pinned/packages/db`, one file at a time | 217 run, 217 passed, 0 failed, 0 skipped (23 files) |
| Types (`tsc --noEmit`) | pinned core, schemas, documents, db, pdf, web | clean, all six (`typecheck-*.out`) |
| Copy rules (`scripts/copy-check.mjs`) | pinned | 315 files examined, 0 findings (`copy-check.out`) |
| Draft versions, confirmed total, request keys, email status `drafts11-probe.test.ts` | pinned, fresh database | 5 run, 5 passed |
| "Issue mine anyway" `issue11-probe.test.ts` | pinned, fresh database | 1 run, 1 passed |
| Refresh after a refusal `refresh11-probe.test.ts` | pinned, fresh database | 1 run, 1 passed |
| Archived item and currency `misc11-probe.test.ts` | pinned, fresh database | 1 run, 1 passed |
| Reminder scan of 0024 `reminders11-probe.test.ts` | pinned, fresh database | 1 run, 1 passed; 2,017 scans every 20 minutes, 169,428 comparisons with `dueReminder` |
| Time zone readings `tzdiff-check.mjs` | read-only queries on the maintenance database | see "Checked and found sound" |
| Production build, server, end-to-end and browser tests | | not run (as instructed) |

Each probe asserts what it observed and writes its observations to a `.json` beside it; several assert a defect. To rerun one, from `../review/round11` with `TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres`: `node node_modules/vitest/vitest.mjs run --root . --no-file-parallelism --testTimeout=1800000 --hookTimeout=300000 --reporter=verbose <name>`, with `drafts11-probe`, `issue11-probe`, `refresh11-probe`, `misc11-probe` or `reminders11-probe` (about 90 seconds). The pinned suites: `scratch/run-suites.sh`.

Each probe makes its own database named `invoica_test_r11_<hex>` (`r11db.ts`, the steps of the pinned test helper) and drops it at the end; none was left behind. Two probes connect to their own database as the owner role: to mark an outbox row as given up, as the worker does, and to switch reminders off for the businesses of other parts. The `invoica`, `invoica_demo` and `invoica_prodcheck` databases were not touched.

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 0 | |
| Medium | 0 | |
| Low | 7 | R11-L1 to R11-L7 |

What holds: a save from a page opened before another tab's save is refused with rule 7's message, the draft is left as the other tab saved it, and "Save mine anyway" replaces it. The version is the trigger's `updated_at` in microseconds, read in the saving transaction, and is what the next read returns; a save refused after the check leaves the version as it was, and of two saves at once with the same version one is saved and one refused. Issuing with a total other than the server's is refused with the new figure, nothing is numbered, and the draft stays a draft whose version is still good. A request key used by two businesses makes a record in each, and two requests with one key make one record. The reminder scan with three hours either side of now queued, over four weeks in twelve zones, exactly what the app's own date said, with none early, none twice and none missed, through the dates on which this machine's PostgreSQL and Node read four of those zones an hour apart. Another business sees none of an invoice's failed emails.

What does not hold, all low: the guard of rule 7 has two ways round it, both silent ("Save mine anyway" replaces changes made after the refusal, and a new invoice's repeated first save carries no version); the refresh after a refusal can replace the editor with "not found" and lose what was typed; "Issue mine anyway" issues a total the person was not shown in the dialog; a lost answer is reported as another tab's change; a corrected repeat of a create form replaces later edits on the record's page; and an archived item can block a change of currency for good.

R10-M1 is still open on `main` (`apps/web/src/lib/auth.ts:51`, `autoSignInAfterVerification: true`), waiting for the owner's approval of the branch as the Resolution says; it was read here and not run again.

## Findings

### R11-L1. "Save mine anyway" replaces changes made after the refusal, without asking

- **Severity:** low (draft content only; nothing issued changes)
- **Where:**
  - `packages/db/src/documents.ts:558`: with `overwrite` the version check is skipped altogether.
  - `apps/web/src/components/invoice-editor.tsx:612` sends the version the page opened with `overwrite: true`; `:337` keeps that version in state, so the version of the refreshed page (`:627`) is never taken; `:622` and `:684-695` keep the button on screen until the next save, however long that is.
- **What goes wrong:** the owner and a colleague both have draft INV-0007 open. The colleague saves; the owner's save is refused with rule 7's message and the owner sees "Save mine anyway". Before the owner presses it (they go and look at the other tab, or answer the phone), the colleague saves again: a line added and a discount set. The owner presses "Save mine anyway": the draft becomes the owner's, and the colleague's second save is gone. Nobody is told; the owner agreed to replace changes they had been told about, and these came after.
- **How confirmed:** run, `drafts11-probe.json`, `"versions"`: tab B saves from `v0`, tab A is refused (`"tabARefused"`), tab B saves again from its new version ("Tab B second, after the refusal"), then tab A's save with `v0` and `overwrite: true` gives `"overwriteAfterFurtherChange": "did not fail"` and `"titleAfterOverwrite": "Tab A anyway"`. That the editor sends the opened version and keeps the button is by reading.
- **Suggested fix:** return the draft's current version with the `draft_changed` refusal; "Save mine anyway" sends that version, and the server replaces only a draft still at it (otherwise refuses again with the same message). Clear the button when the person types again or after a few minutes.

### R11-L2. A new invoice saved again after a lost first answer replaces a change made meanwhile in another tab

- **Severity:** low (needs a lost answer and the new draft opened elsewhere in between)
- **Where:** `apps/web/src/components/invoice-editor.tsx:612-614` sends no version while the page has no id, only the request key; `apps/web/src/lib/actions/documents.ts:74` (and `:108` for "Issue invoice") updates the draft found by that key with no version, so `documents.ts:558` checks nothing.
- **What goes wrong:** an owner types a new invoice and presses "Save draft"; the draft is made and the answer is lost ("could not reach Invoica"). Meanwhile the draft shows in the invoice list, and the owner (or a colleague) opens it in another tab and saves a correction. Back in the first tab the owner presses "Save draft" again: the first tab's content replaces the correction, and the answer is "Draft saved.". "Issue invoice" in the first tab would issue it.
- **How confirmed:** run, `drafts11-probe.json`, `"firstSaveRepeat": {"second": "did not fail", "title": "Mine, second press"}`, after the other tab's save ("Changed in the other tab"), with the action's steps (`lockRequestKey`, `documentForKey`, `updateDraft` without a version).
- **Suggested fix:** keep the version each keyed save produced with the request key (or return it with the draft found), and on a repeat refuse with `draft_changed` when the draft has been changed since by another request.

### R11-L3. A refused save that refreshes the page can replace the editor with "not found" and lose what was typed

- **Severity:** low (a regression of the range: at `3e8cf25` a refused save or issue left the page alone; `5b21189` added the refresh for a refused issue and `69eae16` for every refused save)
- **Where:** `apps/web/src/components/invoice-editor.tsx:626-627` refreshes after every refusal except unreachable, signed out and `document_not_draft`. A draft missing from the current business answers `document_not_found` (`packages/db/src/documents.ts:526`); the refreshed edit page finds nothing and calls `notFound()` (`apps/web/src/app/(app)/invoices/[id]/edit/page.tsx:25` and `:34`), which replaces the editor and its state. The business a request works in comes from a cookie (`apps/web/src/lib/session.ts:44-45`), so choosing another business in another tab moves this tab's saves there. `apps/web/src/lib/reach.ts:22` answers "Invoica has been updated" with no `unreachable` flag, so that refusal refreshes too.
- **What goes wrong:**
  - **Another business chosen in another tab.** An accountant with two businesses edits a long draft for the first, and in another tab switches to the second. Back in the editor they press "Save draft": "This document does not exist.", then the page becomes the not-found page and everything typed since the last save is gone. This is an in-app navigation, so neither the browser's leave warning nor the editor's leave dialog appears.
  - **The draft deleted in another tab or by a colleague:** the same.
  - **Invoica updated meanwhile.** The message says "Copy anything you typed, then reload the page.", and the refresh at once meets a server of another build, which Next.js 16.4.2 answers with a full page load (`next/dist/client/components/router-reducer/fetch-server-response.js:163-166`). The browser's own "Leave site?" prompt appears (the page is still marked as changed); pressing "Leave" loses what was typed before it could be copied.
- **How confirmed:** run, `refresh11-probe.json`: for a draft deleted elsewhere and for a save made as the other business, the answer is `{"message": "This document does not exist.", "code": "document_not_found"}`, the editor's condition (copied) gives `"refreshes": true`, and the edit page's own query finds `null`. What the router does with `notFound()` and with another build is by reading.
- **Suggested fix:** skip the refresh for `document_not_found` and for the "updated" answer (give it a code), as for `document_not_draft`; or refresh only for the codes that need the server's data (`total_changed`, `sterling_rate_stale`, `draft_changed`).

### R11-L4. "Issue mine anyway" issues a total the person was not shown

- **Severity:** low (the editor's preview shows the new total; needs a draft change and a tax or settings change together)
- **Where:** the dialog shows `totals.total` (`apps/web/src/components/invoice-editor.tsx:1471-1474`) and its button calls `save(true)` (`:1481`); "Issue mine anyway" calls `save(true, true)` directly (`:690`), and `save` sends the total of the current render (`:616`), worked out with the tax codes and settings of the page as refreshed after the refusal (`:627`).
- **What goes wrong:** the dialog says "Issue INV-0001?" with £120.00. Meanwhile another tab saved the draft and the standard rate was changed to 5%. The owner presses "Issue invoice": refused, "This draft was changed in another tab…". The page refreshes, so its total is now £105.00, and the owner presses "Issue mine anyway": INV-0001 is issued for £105.00 with no dialog. The check of R10-L2 holds only for totals that came through the dialog.
- **How confirmed:** run, `issue11-probe.json`: `"dialogShowed": 12000`, the first issue refused with rule 7's message, `"afterRefresh": 10500` (worked out with `computeDocument` and the code as the refreshed page has it, as `parse()` does), and `"issuedTotal": 10500, "lifecycle": "issued"`. That the button skips the dialog is by reading.
- **Suggested fix:** keep the total the person confirmed in the dialog and send that one, also from "Issue mine anyway"; or open the dialog again from "Issue mine anyway".

### R11-L5. The person's own save, whose answer was lost, is reported as a change made elsewhere

- **Severity:** low (the way out works; the message misleads)
- **Where:** the editor takes a new version only from an answer (`apps/web/src/components/invoice-editor.tsx:643`); `packages/db/src/documents.ts:558-562`.
- **What goes wrong:** a save reaches the server and its answer is lost ("could not reach Invoica"). The owner presses "Save draft" again from the same tab and is told "This draft was changed in another tab or on another device since you opened it…". They have one tab. If they follow "reload the page to see them", the page warns that changes will be lost, and what reloads is what they had saved, without anything typed since.
- **How confirmed:** run, `drafts11-probe.json`, `"sameTabAfterLostAnswer"`: the second save from the version the tab still holds is refused with rule 7's message.
- **Suggested fix:** say so in the message ("…since this page last heard from Invoica: in another tab, on another device, or a save here whose answer did not arrive."), or keep with each draft the request key of its last save and let a save carrying the same key through.

### R11-L6. A corrected repeat of a create form replaces later edits, and an original arriving late replaces its correction

- **Severity:** low
- **Where:** `packages/db/src/clients.ts:69-80`, `items.ts:28-39`, `taxes.ts:39-50`: a key whose stored fingerprint differs is applied with `updateClient`, `updateItem` or `updateTaxCode`, whatever has happened to the record since.
- **What goes wrong:**
  - **An edit on the record's page.** A new client "Quayside Ltd" is saved and the answer is lost. Unsure, the owner finds it in the client list in another tab and adds its email and phone. Back in the first tab they correct the name to "Quayside Limited" and press Save: the client keeps the name and loses the email and phone. Before this range the repeat changed nothing.
  - **An original that arrives after its correction** (a first request delayed on the way, then the corrected one sent and applied first): the original is applied over the correction.
- **How confirmed:** run, `drafts11-probe.json`, `"requestKeys"`: `"afterEditElsewhere": {"name": "Quayside Limited", "email": null, "phone": null}` and `"originalArrivingLate": {"name": "Corected Name Ltd", "email": null}`.
- **Suggested fix:** apply a corrected repeat only while the record is as the key's last request left it (for example compare `updated_at` with the time of that request, kept with the fingerprint); otherwise refuse it ("This was saved before your change, and has been changed since. Check it and save again.").

### R11-L7. An archived item priced in a way the new currency cannot write blocks the change of currency for good

- **Severity:** low (a change of main currency is rare)
- **Where:** `packages/db/src/organisations.ts:175` checks every item, archived ones too; `listItems` leaves archived items out (`packages/db/src/items.ts:13`), and nothing in the app restores or edits an archived item (`items.ts` has no restore; the items page offers "Archive" only).
- **What goes wrong:** a business set up in pounds by mistake has archived "Old sticker" at £12.34. Settings, "Main currency" yen: "The saved item “Old sticker” costs £12.34, which cannot be written in JPY. Change its price first." The item is on no page, so its price cannot be changed, and the main currency can never become yen (or any currency with fewer decimals than the item's price needs).
- **How confirmed:** run, `misc11-probe.json`: refused twice with that message, `"itemsPageShows": ["Location day"]`, currency still `GBP`.
- **Suggested fix:** leave archived items out of the check (rescale those that can be, and keep the others archived with a note), or let the message say the item is archived and offer to restore it.

---

## Checked and found sound

"Run" means a probe confirmed it; "read" means by reading the code.

- **Rule 7 (run, `drafts11-probe.json`; read).** Two tabs: the second save from the opened version is refused with the spec's message and the draft keeps the other tab's content; with `overwrite` it is replaced. The version returned by the save is what a new transaction reads (`"versionReturnedEqualsReadAfter": true`); twenty saves in a row give twenty different 16-digit microsecond versions. A save refused after the check ("Choose a client.") leaves the version as it was, and the next save from it goes through. Two saves at once with one version: one saved, one refused (`"twoAtOnce"`), because `lockDocument` holds the row and the version is read afterwards. The trigger `touch_updated_at` covers `document` (`0002_tenancy.sql:119-121`), sets `now()`, the transaction's start, which is also the time the save reads back; the only other writes to a draft's row are the save paths themselves (`documents.ts:497`, `:572`; `:728`, `:776`, `:804` and `files.ts:34` act on issued documents, `:1279` and `:1433` on new ones), so no background work refuses a save. `extract(epoch …)` is numeric in PostgreSQL 16, so the microseconds are exact.
- **The confirmed total (run, `drafts11-probe.json`, `"confirmedTotal"`).** With the rate changed to 5% and £120.00 confirmed: "The total changed while this was open: it is now £105.00, with the tax rates and settings as they are now. Check it and issue again.", the draft still a draft, the counter unchanged, the version still good, and the same version with £105.00 issues INV-0001. The editor works its total out with the organisation's tax level and rounding from its props, as the server does from the draft's columns (read).
- **The refresh after a refusal (read).** It is skipped for an unreachable server, for a signed-out session and for `document_not_draft`, as the code says; what was typed stays (the editor's state is not reset from new props), and today, the rate method, the tax codes and the next number come from the refreshed props. R10-L1's rate is cleared with its reason when the refreshed page works it out for another day or month (`invoice-editor.tsx:439-445`).
- **Request keys (run, `drafts11-probe.json`, `"requestKeys"`).** Business B sending business A's key for a client, an item and a tax code makes its own record each time, and A's client, item price and rate are unchanged (`"tenancy"`); the lookup, the update and the unique index are all within the business (row-level security, and `(organisation_id, idempotency_key)` in `0020` and `0021`). Two requests with one key and different content at the same moment make one client (`"rows": 1`), with the second's content. The forms make a new key for each new record (read: each form keeps its key for its life and closes after a save).
- **Migration 0024 (run, `reminders11-probe.json`, `tzdiff-check.json`; read).** Every 20 minutes from 14 October to 11 November 2026 for 84 invoices in twelve zones, issued near local midnight at :05, :30 and :50 past, with offsets -3, 0, 7 and 14: 2,017 scans, 246 reminders, each on the scan where the app's own date first made it due, none early, none twice, none missed; 535 offers with nothing due (review 10's day of margin had 1,932 in 1,417 hourly scans). Over the same times this machine's PostgreSQL and Node (22.22.0, tz 2025b) read the date differently for America/Vancouver and America/Edmonton from 2 November and for Africa/Casablanca and Africa/El_Aaiun throughout. By reading, an offer the app needs passes every condition of the scan whenever the two readings are at most three hours apart, both for the reminder's day and for the issue day (`(issued_at - 3 hours)`). The builder's new stub test (`reminders.test.ts`, "the app chooses the reminder with its own date") would fail with an app that queues `offset_days` as offered, on any machine; the window test fails with the day's margin (it is offered at 14:00 the day before).
- **Emails that have not gone (run, `drafts11-probe.json`, `"deliveriesTenancy"`; read).** The owner's invoice page and dashboard show the failed email to `ap@nowhere.invalid`; another business asking for that invoice's id gets nothing on either. The outbox keeps row-level security for the app role (`0002_tenancy.sql:88-97`; `0003` stops forcing it only for the owner role). Credit notes are never emailed (the page offers no send for them), so leaving them out of both lists loses nothing. The development mailbox's refusal is permanent (`EmailSendError(…, false)`), and its unit test passes.
- **Money and messages (read; core and database tests pass).** `rescaleMinor` returns null for a figure the new currency cannot write and past the safe range; `rescaleItems` reads the business's own currency (the organisation policy shows only the current one, `0002_tenancy.sql:74-75`) and rescales inside the profile's transaction. `checkPayment` names the balance ("The payment is more than the £81.99 still owed.") and says when nothing is owed; the transition refusals say what to do. "Everything still owed" compares the confirmed balance before planning (R10-L7 b).
- **The rest of the Resolution (read).** Sign-in emails greet no one by name (R10-L5); the deployment guide lists 0022 and 0024 with stopping the scheduler (R10-L6); a due date that follows the terms is no longer sent (R10-L4), and a saved draft without one opens following the terms; a saved item's price is retyped for the invoice's currency (R10-L3).
- **Tests added (read).** The database tests for rule 7, the confirmed total, the corrected repeats ("a true repeat records nothing more"), the currency change and the window of 0024 each fail with their fix taken out, by reading of what they assert. None of them covers R11-L1 to R11-L7.

## Not checked

- The end-to-end suite and anything in a browser, among them the new `connected-changes.spec.ts`, `editor.spec.ts` and `invoice-flow.spec.ts` tests: so the editor's half of rule 7 (taking the new version after its own save, the conflict buttons), the refresh after a refusal, R10-L3 and R10-L4 in the editor, and the accessibility of the notices were read and not run. The production build and server (as instructed). CI on GitHub, which the handover says has never run.
- Container images, Resend, Cloudflare; the branch `fix/confirm-then-sign-in`.
- A database whose time zone data reads a zone more than three hours apart from Node's (none found here); the load of `undeliveredEmails`, which reads every email and reminder row of the business on each dashboard view.
- An item form left open while the main currency is changed in another tab: by reading it parses the price in the currency the page loaded with (`apps/web/src/components/item-editor.tsx:41`), so the price would be kept in the other currency's minor units; not run.
- `pnpm check` as a whole (format and lint), and the PDF package's tests.

## Files produced by this review

All in `../review/round11/`:

- `review-11.md` (this report);
- `pinned-core.out`, `pinned-schemas.out`, `pinned-documents.out`, `pinned-web.out`, `pinned-db.out` (pinned suites), `typecheck-*.out` (types), `copy-check.out`, `links-check.out`;
- `r11db.ts` (fresh databases named `invoica_test_r11_<hex>`);
- `drafts11-probe.test.ts` with `drafts11-probe.out` and `drafts11-probe.json`;
- `issue11-probe.test.ts` with `issue11-probe.out` and `issue11-probe.json`;
- `refresh11-probe.test.ts` with `refresh11-probe.out` and `refresh11-probe.json`;
- `misc11-probe.test.ts` with `misc11-probe.out` and `misc11-probe.json`;
- `reminders11-probe.test.ts` with `reminders11-probe.out` and `reminders11-probe.json`;
- `tzdiff-check.mjs` with `tzdiff-check.out` and `tzdiff-check.json`;
- `scratch/link-modules.sh`, `scratch/run-suites.sh`;
- `pinned/` (an export of `24c0132` with `node_modules` links to its own packages) and `node_modules/` (links to `pinned/` and to the repository's installed packages).

## Resolution (builder, 20 October 2026)

| Finding | Fix |
| --- | --- |
| R11-L1 | "Save mine anyway" no longer overwrites blind: after a refusal the editor fetches the draft's version again and saves against it, so a change made after the refusal is refused in its turn (end to end: the other tab saves again after the refusal, and the next "Save mine anyway" is refused before one goes through). |
| R11-L2 | The repeat of a new invoice's first save is refused once the draft has been changed since it was made (`assertDraftUnchangedSinceCreated`), unless the person says to replace it. |
| R11-L3 | The editor fetches the server's data again only after the refusals that need it (`total_changed`, `sterling_rate_stale`, `draft_changed`, `period_incomplete`, `tax_not_registered`, `tax_number_missing`), so a draft deleted elsewhere, another business chosen in another tab, or a new version of the app no longer reloads the page away from what was typed. |
| R11-L4 | "Issue mine anyway" opens the issue confirmation again, with the total as it is now. |
| R11-L5 | The message now covers a save from the same page whose answer did not arrive: "This draft has changed since this page last saved it: in another tab, on another device, or by a save from here whose answer did not arrive." "Save mine anyway" then saves against the fetched version. |
| R11-L6 | A corrected repeat is applied only to a record as its first request made it; an edit made since, or a correction already applied, is never replaced by an older request arriving late. |
| R11-L7 | An archived item that the new currency cannot write is rounded half up to its smallest unit (`rescaleMinorHalfUp`), so it never blocks the change; a saved item in use still has to be changed first. |
