# Invoica: independent review of refunds, reminders, VAT in sterling, the worker role and sign-in by email (review 8)

Reviewer: a separate agent, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 20 October 2026.

## Scope and commit

This review covers commit `536abdd` ("test(e2e): tidy the reminders test types") on `main`, and within it the ten commits since review 7 (`git log 84c5dc0..536abdd`): `3f11a3f`, `012edd1`, `d46e141`, `8cbfbba`, `3b9cdb4`, `ab3e5a3`, `b1ef540`, `cf8868e`, `3d08a7f` and `536abdd`. In order of priority:

1. refunds: migration `0013_refunds.sql`, `docs/specs/refunds.md`, `packages/core/src/credits.ts` (`refundFor`, `checkCredit`), `packages/db/src/documents.ts`, `packages/db/src/dashboard.ts`, the credit dialog in `apps/web/src/components/document-actions.tsx`, the invoice page and the export route;
2. reminders: migration `0015_reminders.sql`, `docs/specs/reminders.md`, `packages/core/src/reminders.ts`, `packages/db/src/reminders.ts`, `apps/web/src/lib/jobs.ts` and `apps/web/src/app/api/jobs/drain/route.ts`;
3. VAT in sterling: migration `0014_sterling_vat.sql`, `docs/specs/vat-in-sterling.md`, `packages/core/src/sterling.ts`, issue and credit notes in `documents.ts`, `packages/documents/src/view.ts` and the editor;
4. the worker role: migration `0012_worker_role.sql`, `packages/db/src/outbox.ts`, `apps/web/src/lib/db.ts`;
5. email verification and password reset: `docs/specs/sign-in-by-email.md`, `apps/web/src/lib/auth.ts`, `auth-mail.ts`, `auth-emails.ts`, `apps/web/src/app/(auth)/*`, with Better Auth 1.7.10 as installed (`node_modules/better-auth/dist/api/routes/*.mjs`);
6. the rest of the diff: the Resend adapter (`apps/web/src/lib/email-adapters.ts`), credit note wording in `view.ts`, `loadPreset` in `packages/db/src/taxes.ts`, copy, comments and the new tests.

Every probe ran against an export of `536abdd` made with `git archive` at `../review/round8/pinned-536abdd`. As in earlier reviews, its `node_modules` folders hold links that point `@invoica/*` at the pinned packages (checked with `readlink -f` for every package that has them) and everything else at the repository's installed packages. The round's own `node_modules/@invoica` links were moved to the new export as well. No dependency changed between `b1ef540` and `536abdd`.

An earlier attempt at this review, pinned to `b1ef540`, was interrupted by a restart. Its probes and outputs are kept beside this report (`db-probe.*`, `auth/auth-probe.*`, `pinned/`). The files they cover (migration 0013, `credits.ts`, the refund parts of `documents.ts`, `dashboard.ts`, `outbox.ts` and every auth file) are unchanged between `b1ef540` and `536abdd`, and every probe I rely on here was run again against `536abdd` under a new name. Where the two runs differ it is because the code under test is newer (the worker may now run `app.due_reminders`) or the machine was busier (timings).

`HEAD` was `536abdd` throughout and the working tree was clean. Line numbers are for `536abdd`.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| Core | `pinned-536abdd/packages/core` | 206 run, 206 passed, 0 failed, 0 skipped (20 files) |
| Database | `pinned-536abdd/packages/db` | 128 run, 128 passed, 0 failed, 0 skipped (16 files) |
| Documents, schemas, web unit | pinned | 28 passed (3 files); 4 passed (1 file); 37 passed (7 files) |
| Types (`tsc --noEmit`) | pinned core, db, documents, schemas, web | clean, all five |
| Copy rules (`scripts/copy-check.mjs`) | pinned | 270 files examined, 0 findings |
| Refund and outbox probes `refunds-probe.test.ts` | pinned, fresh databases | 15 run, 15 passed, each asserting what it observed |
| Reminder probes `reminders-probe.test.ts` | pinned, fresh database | 7 run, 7 passed; 9,072 scans compared with the core schedule (816,480 comparisons) |
| VAT in sterling probes `sterling-probe.test.ts` | pinned, fresh database | 5 run, 5 passed; 140,000 conversions compared with exact fractions |
| Smaller probes `misc-probe.test.ts`, `core/format-536.test.ts` | pinned | 2 passed; 1 passed |
| Sign-in probes `auth/auth-probe-536.test.ts` | the pinned `auth.ts` on a fresh database, called through `auth.handler` | 11 run, 11 passed |

How to rerun them, each from `../review/round8` with `TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres`:

- `node node_modules/vitest/vitest.mjs run --root . --no-file-parallelism --testTimeout=1200000 --hookTimeout=300000 --reporter=verbose <name>`, with `refunds-probe` (about 75 seconds), `reminders-probe` (about three minutes), `sterling-probe`, `misc-probe` or `auth-probe-536` (about 100 seconds) as the name.
- The pinned suites: in `pinned-536abdd/packages/<name>`, `node node_modules/vitest/vitest.mjs run`.

The sign-in probes import the pinned `apps/web/src/lib/auth.ts` with its own `auth-mail.ts` and `auth-emails.ts`; only `server-only`, `next/server` (`after()` lets the work run on), `lib/db` (the test database as the app role) and `lib/email` (a recorder that can take a set time or fail) are replaced. I did not build or serve the app on port 3100. Every database probe creates and drops its own database through `createTestDatabase`; a hand-made database for exploring roles and time zones (`invoica_test_r8explore`) was dropped at the end, and no `invoica_test_` database was left. The `invoica`, `invoica_demo` and `invoica_audit` databases and the server on port 3000 were not touched. Some probes connect to their own test database as the superuser or the owner role: to read figures (`ledgerOf`) and privileges, to expire a reset link (A5), and to switch reminders off for the businesses of earlier probes (M7).

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 0 | |
| Medium | 3 | R8-M1 to R8-M3 |
| Low | 5 | R8-L1 to R8-L5 |

What holds:

- No sequence through the data functions left a negative balance, refunds above payments, a refund without its credit note, or a refund on another business's records. In 1,260 random operations on 90 invoices (165 credit notes with refunds) and 15 seconds of eight workers at once, every rule held, every refund was exactly the part above the balance the server saw, and the list, the invoice page, the export, the dashboard's outstanding figure and top clients, and the reminder scan agreed on every invoice.
- Every place that sums payments, in SQL and in TypeScript, counts refunds.
- `app.due_reminders` returns ids only and only the worker can run it. Setting `app.reminder_scan` gives the app role nothing, also inside every definer function it may call; the worker reads no table. The scan agreed with the core schedule at every hour of 42 days around nine due dates in nine time zones, across daylight saving changes, month ends and a leap day. Four scans at once queued one reminder per invoice and offset.
- Sterling conversion matched exact fractions in every case, in currencies with no, two and three decimal places.
- Reset links work once, for an hour, and end every session; callback and redirect addresses off the site are refused on all six routes; limits follow the trusted client address.

What does not:

- **R8-M1.** The refund recorded with a credit note is worked out again on the server from the balance at that moment, and can differ from the refund the person saw and confirmed. Neither can be corrected afterwards.
- **R8-M2.** Anyone can sign up with another person's address. When that person opens the confirmation link they are signed in to an account whose password someone else chose, and the email they received opens with text that someone else wrote.
- **R8-M3.** One business's time zone can stop the reminder scan for every business: the schemas accept any zone Node knows, and the database may not know it or may read it the other way.
- **R8-L1.** Migration 0013 can be passed by direct SQL as the app role: a draft credit note moved to another invoice after its refund is recorded, and the guards under repeatable read.
- **R8-L2.** A reminder sent after its day says what suited its day ("is due today" on an overdue invoice), a reminder whose day came before the invoice was issued goes at once, and the invoice page names a later reminder than the scan sends.
- **R8-L3.** Asking for a new confirmation link takes as long as the email provider when the address has an unconfirmed account.
- **R8-L4.** A draft keeps its exchange rate when its currency or its tax point's month changes, and credit notes in pieces can credit a penny more VAT in sterling than was charged.
- **R8-L5.** Smaller points: refund dates, removal checks, the outbox, the worker's default privileges, restoring standard tax codes, comments, tests and the sender name.

---

## Findings

### R8-M1. The refund recorded can differ from the refund the person confirmed

- **Severity:** medium (a stale dialog or a colleague's change; the record cannot be corrected)
- **Where:**
  - `packages/schemas/src/index.ts:332-338`: `refundInput` carries a date, a method and a reference, and no amount ("Its amount is worked out").
  - `apps/web/src/components/document-actions.tsx:443` works out the refund the dialog shows from the balance the page loaded with; `submit` (`:445-474`) sends no figure.
  - `packages/db/src/documents.ts:904` and `:953` work it out again from the balance inside the transaction, and `:1047-1059` records that figure. Refunds are append-only and credit notes cannot be voided (`0013_refunds.sql:31-32`, `:295-297`).
- **What goes wrong:**
  - **A payment recorded meanwhile (R3).** An invoice of £120.00 (£100.00 plus VAT) with £60.00 paid. The owner opens the credit dialog and chooses the whole invoice: "Refund of £60.00. This credit note is £60.00 more than is still owed, so that much goes back to the client." The owner refunds £60.00 and, before pressing the button, a colleague (or the owner in another tab) records the client's other £60.00. "Issue credit note and record refund" then records a refund of £120.00, and the activity says "Refund recorded, £120.00 with CN-0001". The books say £120.00 went back; £60.00 did. The invoice shows "Credited" with nothing owed either way, so the £60.00 still due to the client appears nowhere.
  - **A payment removed meanwhile (R3).** Two payments of £60.00; the dialog shows a refund of £120.00, and the owner pays it back. A colleague removes one payment as bounced. The refund recorded is £60.00.
  - **Under load (R8).** Eight workers on three invoices for 15 seconds, each choosing an amount from the balance it had just read: of 27 credit notes issued with a refund, 8 recorded a different refund from the one the dialog would have shown (6 of 24 in an earlier run).
  - The opposite case is caught: a credit the dialog thought fitted the balance, sent without a refund, is refused when the balance has fallen meanwhile ("unless you record the refund of the difference").
- **How confirmed:** run. `refunds-probe.json`, `"R3": {"paymentRecordedMeanwhile": {"shownInDialog": 6000, "recorded": 12000}, "paymentRemovedMeanwhile": {"shownInDialog": 12000, "recorded": 6000}}`; `"R8": {"counts": {"note with refund": 27, "refund recorded differs from the one the dialog showed": 8}}`.
- **Suggested fix:** send the refund the dialog showed (or the balance it was worked out from) with the request, include it in the request's fingerprint, and refuse when the server's figure differs: "The amount owed changed while this was open: the refund would now be £120.00. Check it and issue again." Test both directions first.

### R8-M2. Anyone can open an account with someone else's address and keep its password

- **Severity:** medium (needs the owner of the address to open a link they did not ask for; the email's opening words are the other person's)
- **Where:**
  - `apps/web/src/lib/auth.ts:49-56`: `autoSignInAfterVerification: true`. Better Auth stores the password given at sign-up (`better-auth/dist/api/routes/sign-up.mjs:214-240`) and, when the link is opened, signs the opener in without asking for it (`email-verification.mjs:297-315`).
  - `apps/web/src/lib/auth-emails.ts:9` and `:11-26`: the confirmation email opens with "Hello {name}," where the name is whatever the sign-up gave, of any length and with line breaks.
- **What goes wrong (A10, A9):**
  - Someone signs up with `owner@…` and a password of their own, and the name "there. Your accountant has shared your invoices with you on Invoica. Confirm below to see them." Invoica sends the owner of the address an email that begins "Hello there. Your accountant has shared your invoices with you on Invoica. Confirm below to see them." and then the confirmation link.
  - The owner opens the link and is signed in (302 to `/confirm-email`, a session cookie, then onboarding). They never chose a password, and nothing tells them one exists.
  - The other person then signs in with their own password: 200, a session on the same user. The owner's session stays valid. Everything the owner enters (their business, clients, invoices, bank details) is open to the other person until the owner happens to reset the password.
  - A name of 20,000 characters is accepted, and the text can be anything, so Invoica's own sending address carries the other person's message to any address (A9: "Hello there. Your Invoica trial has a billing problem. Pay now at https://pay.example/invoica or your invoices will be deleted.").
- **How confirmed:** run, `auth/auth-probe-536.json`: `"A10": {"opened": {"status": 302, "location": "/confirm-email", "sessionCookie": true}, "attackerSignIn": 200, "sameUser": true, "ownerStillSignedIn": true}`; `"A9": {"longNameStatus": 200}`.
- **Suggested fix:** do not sign in on confirmation. Either ask for the account's password on the confirmation page before confirming, or confirm and send the person to sign in, with `/confirm-email` saying the address is confirmed (it now says a link "has expired or has been used" to anyone not signed in). Keep names to one line of a sensible length, and leave the name out of emails to an address that is not yet confirmed ("Hello,").

### R8-M3. One business's time zone can stop the reminder scan for every business

- **Severity:** medium (a crafted settings request from any signed-in owner, on any plan; depends on the database's time zone data)
- **Where:**
  - `packages/schemas/src/index.ts:85` and `:123` accept any time zone for which `isValidTimeZone` (`packages/core/src/dates.ts:43-50`) can build an `Intl.DateTimeFormat`. The forms offer 16 names (`apps/web/src/lib/countries.ts:2-25`), but the server takes any value. `updateOrganisationProfile` (`packages/db/src/organisations.ts:143-173`) saves it unchecked by the database; only `create_organisation` checks it there (`0005_review_1_guards.sql:180`).
  - `0015_reminders.sql:52`: `(p_now at time zone o.time_zone)::date` for every organisation with reminders on, in one query. `saveReminderSettingsAction` (`apps/web/src/lib/actions/settings.ts:69-79`) and `updateReminderSettings` do not check the plan, and the scan reads `reminders_enabled` alone.
  - `packages/db/src/reminders.ts:30-54`: one failure ends the loop over every organisation. `apps/web/src/app/api/jobs/drain/route.ts:12-13`: the jobs run only after the reminders are queued.
- **What goes wrong:**
  - **A zone the database does not know (M7).** Node accepts `Asia/Calcutta` (and `Europe/Kiev`, `Asia/Saigon`, `America/Buenos_Aires` and other old names); this PostgreSQL, built against system time zone data without the old names, refuses them. With one business set to `Asia/Calcutta`, reminders on and one open invoice, the scheduled drain fails at once with `time zone "Asia/Calcutta" not recognized`: another business's reminder due that day was not queued, and a job waiting for the schedule stayed pending. With that business's reminders off, both went through. Until someone finds the row, no business gets a scheduled reminder and the schedule runs no retries; jobs drained after a request (`runJobsLater`) still run.
  - **A zone the database reads the other way (M2).** `+05:30` is accepted by both. Node reads it as five and a half hours ahead of UTC; PostgreSQL reads a bare offset as POSIX, five and a half hours behind. At 22:00 UTC on 20 October the app's date there is 21 October and the scan's is 20 October. In the hour-by-hour run, 1,265 scans for that business disagreed with the core schedule; none did for the nine named zones.
  - Which old names a production database knows depends on its time zone data, and Node's list grows with each release, so the same gap can open the other way after an upgrade.
- **How confirmed:** run. `reminders-probe.json`: `"M7": {"schemaAccepts": true, "drain": "time zone \"Asia/Calcutta\" not recognized", "goodQueued": [], "pdfJobStatus": "pending", "afterBadOff": {"drain": "did not fail", "goodQueued": [0], "pdfJobStatus": "done"}}`; `"M2": {"mismatches": {"+05:30": {"n": 1265}}}`. By hand: `select (timestamptz '2026-10-20 22:00+00' at time zone '+05:30')` gives 16:30 on the 20th, and `Asia/Kolkata` gives 03:30 on the 21st.
- **Suggested fix:** accept only region names that the database also knows (check with `pg_timezone_names` when saving, or keep a fixed list and refuse anything else, offsets included). In the scan, keep one business's error to that business (an exception block per organisation in `app.due_reminders`, a `try` per row in `queueDueReminders`), and run the jobs in the drain route whether or not queuing the reminders failed.

### R8-L1. Migration 0013 can be passed by direct SQL as the app role

- **Severity:** low (needs a code defect or direct SQL; the app's own path writes neither)
- **Where:**
  - `0013_refunds.sql:159`: on issue, `own_refund` counts the refunds of the note wherever they point. `:273-277`: a draft credit note may move to another invoice while it has no lines, refund or not. `guard_refund` (`:45-48`) checks the note's invoice only when the refund is inserted.
  - `0013_refunds.sql:41`, `:55-59`, `:91-97`, `:102-116`, `:146-170`: each guard locks the invoice and then sums payments, refunds and credit notes. Under read committed each statement sees what committed while it waited; under repeatable read or serializable it sees its transaction's first snapshot.
- **What goes wrong:**
  - **(a) A note moved after its refund (R1).** Two invoices of £120.00 with no VAT, each paid in full. In one transaction as `invoica_app`: a draft credit note on A, a refund of £120.00 recorded with it, the note moved to B, a line of B added and the note issued. It commits. A shows payments £120.00, a refund of £120.00, no credit note and £120.00 owed again ("issued"); B shows £120.00 credited, no refund and a balance of −£120.00 ("settled"). The dashboard shows £120.00 outstanding. "Everything still owed" on A is then accepted with no refund (R1b), so A ends with £120.00 credited and £120.00 refunded against £120.00 paid.
  - **(b) Repeatable read (R2).** A £120.00 invoice paid in two halves. One transaction removes a payment while another credits the whole invoice with a refund of £120.00; both opened before either wrote. Under repeatable read both commit, in either order: payments £60.00, refunds £120.00. Under serializable one is refused, and under read committed, which the app uses, the second waits and is refused. The payment guard from earlier migrations has the same dependence: two payments of the whole £120.00 under repeatable read both commit, a balance of −£120.00.
- **How confirmed:** run, `refunds-probe.json`: `"R1": {"outcome": "committed", "invoiceA": {"balance": 12000, "creditNotes": 0, "refundsListed": 1}, "invoiceB": {"balance": -12000, "state": "settled"}}`; `"R2-repeatable-read": {"removeFirst": {"remove": "committed", "refund": "committed", "ledger": {"payments": 6000, "refunds": 12000}}}`; `"R2-payments-repeatable-read": {"ledger": {"balance": -12000}}`.
- **Suggested fix:** on issue, require every refund of the note to be on the invoice it credits, and refuse moving a draft credit note that has a refund (extend the check at `:273-277`). In each guard, refuse to run outside read committed (`current_setting('transaction_isolation')`), or keep running totals on the invoice row so that two writers conflict on it under any isolation.

### R8-L2. Reminders sent after their day, or before the invoice existed

- **Severity:** low (wrong wording to clients, and an email the business did not expect yet)
- **Where:**
  - `packages/db/src/reminders.ts:119-126`: a scheduled reminder takes its wording from its offset (`reminderKind`, `packages/core/src/reminders.ts:17-19`); only "Send a reminder now" looks at the date. The scan sends an offset up to six days late (`0015_reminders.sql:74-78`, `dueReminder` at `core/src/reminders.ts:25-37`), and a job can run after midnight.
  - `0015_reminders.sql:58-78`: nothing compares a reminder's day with the invoice's issue date or whether it has been sent. `apps/web/src/lib/jobs.ts:100` marks an issued invoice as sent when its reminder goes.
  - `packages/db/src/reminders.ts:206` with `nextReminder` (`core/src/reminders.ts:40-50`): the page names the next offset from today on, while the scan sends the latest one of the past week.
- **What goes wrong (M3, M4, M5):**
  - **(a)** Offsets on the due date and 7 days after; an invoice due on 15 October; reminders turned on, or the invoice resumed, on 18 October. The scan queues the due-date reminder and the client reads "Invoice INV-0001 is due today" and "Invoice INV-0001 for £120.00 is due today", three days late. With offsets of three days before and 7 after and a due date of 17 October, the client reads on the 18th "Reminder: invoice INV-0001 is due on 17 October 2026". A due-date reminder queued at 23:58 and sent at 00:03 says "due today" on the day after.
  - **(b)** An invoice issued on 18 October with two days to pay: its "three days before" reminder was due on the 17th, so the first scan after issue queues it, while the invoice is still issued and not sent; when it goes, the job marks the invoice as sent. An invoice dated 1 October, due on the 15th and issued on the 18th gets "Invoice INV-0002 is due today" at the first scan.
  - **(c)** An invoice due on 16 October, seen on the 18th: the page says "Next reminder on 23 October 2026" while the scan sends the due-date reminder that day.
- **How confirmed:** run, `reminders-probe.json`: `"M3": {"dueToday": {"queued": [0], "subject": "Invoice INV-0001 is due today"}, "before": {"subject": "Reminder: invoice INV-0001 is due on 17 October 2026"}, "afterMidnight": {"today": "2026-10-19", "subject": "Invoice INV-0001 is due today"}}`; `"M4": {"shortTerms": {"lifecycle": "issued", "queued": [-3]}, "backdated": {"queued": [0], "subject": "Invoice INV-0002 is due today"}}`; `"M5": {"pageSays": {"offset": 7, "date": "2026-10-23"}, "scanQueued": [0]}`. The job's `markSent` by reading.
- **Suggested fix:** choose the wording from the date at sending, as "Send a reminder now" does; skip an offset whose day is before the invoice's issue date (or before it was sent); and have the page ask `dueReminder` for today before `nextReminder`, so it says "Next reminder today" when the scan will send one. Say in the spec what a reminder caught up from an earlier day says.

### R8-L3. Asking for a new confirmation link takes as long as the provider for an unconfirmed account

- **Severity:** low (tells whether an address has an unconfirmed account, when the provider is slow or failing)
- **Where:**
  - Better Auth's `/send-verification-email` (`email-verification.mjs:98-118`) awaits `sendVerificationEmailFn` (`:111`), which calls `sendVerificationEmail` directly (`:32`), not through the background handler that the other routes use. Its 500 ms floor (`:105`) hides only sends that finish within it.
  - `apps/web/src/lib/auth.ts:54-55` passes `sendAuthEmail`, which waits for the provider and, on a failure, pauses one and then two seconds before trying again (`apps/web/src/lib/auth-mail.ts:12-33`).
  - Spec rule 4: "the time a request takes does not depend on whether an email was sent."
- **What goes wrong (A3, A3b):** for an unknown or a confirmed address the answer takes 502 to 504 ms (median) whatever the provider does. For an address with an unconfirmed account it takes what the provider takes: 810 ms with a provider of 800 ms, 3,016 ms with 3,000 ms, and 3,011 ms while the provider fails. The answers are the same ("200 {"status":true}"). Sign-up, reset and sign-in send after the answer and showed no such difference.
- **How confirmed:** run, `auth/auth-probe-536.json`, `"A3"` and `"A3b": {"resend": {"unknown": {"median": 504}, "confirmed": {"median": 502.4}, "unconfirmed": {"median": 3011.4}}}`.
- **Suggested fix:** make Invoica's `sendVerificationEmail` hand the send to `inBackground` and return at once; Better Auth does not use its result. That covers every route that sends the link.

### R8-L4. VAT in sterling: a rate kept through changes, and credit notes in pieces

- **Severity:** low (the business can see the preview; a penny on a VAT return)
- **Where:**
  - `packages/db/src/documents.ts:396` keeps the draft's rate as typed, `:565-580` applies it at issue whatever the currency and the tax point's month are by then. `apps/web/src/components/invoice-editor.tsx:494`: choosing a client sets the currency and leaves the rate.
  - `documents.ts:1075-1086`: each credit note converts its own VAT, rounded on its own.
- **What goes wrong (S5, S2):**
  - **(a)** A draft in euros with the rate 1.1500, then put in yen (by choosing a client billed in yen): it issues with "VAT in sterling £1,739.13" for ¥2,000 of VAT (about £10.50 at 190.5) and "VAT in sterling at £1 = 1.1500 JPY". Nothing refuses it.
  - **(b)** A draft with October's HMRC period rate whose supply date then moves to 2 November issues with October's figure and the words "HMRC period rate for November 2026".
  - **(c)** An invoice with €20.00 of VAT shows £17.39 in sterling. Ten credit notes of €10.00 each credit €2.00 of VAT and £1.74 each, so £17.40 is credited in sterling against £17.39 charged. Three notes of a third each happened to add up exactly.
- **How confirmed:** run, `sterling-probe.json`: `"S5": {"currencyChanged": {"currency": "JPY", "vat": 2000, "sterlingVat": {"rate": 1150000, "charged": 173913}}, "monthChanged": {"note": "VAT in sterling at £1 = 1.1500 EUR, HMRC period rate for November 2026."}}`; `"S2": {"tenNotes": {"invoiceSterling": 1739, "notesVatEur": 2000, "notesSterling": 1740}}`.
- **Suggested fix:** keep with the draft the currency (and, for HMRC's period rate, the month) its rate was entered for, and ask for the rate again when either changes, in the editor and on issue. For credit notes, keep a sterling ledger as the tax ledger does, so a note that completes an invoice's VAT also completes its sterling figure.

### R8-L5. Smaller points

- **Severity:** low
- **(a) Refund dates (run, R5, X2).** A refund may carry any date: before the payment it returns, before the invoice, or in 2099. The dashboard counts it on that date, the lists at once. A refund this month for a July payment makes "Paid in the last 30 days" read "-£120.00" and draws October as an empty bar (`dashboard.ts:69-85`, `apps/web/src/app/(app)/dashboard/page.tsx:140-144`, `:269`). A refund dated 1 March for a payment of 15 October leaves the dashboard at £120.00 paid in the last 30 days, with the refund before the six months the chart shows, while the list says nothing was paid and the invoice is "Credited". Refuse dates before the latest payment on the invoice and after today, and label the figure "Received, less refunds".
- **(b) Removing a payment (read, R4).** Spec rule 5 says the app checks first; `removePayment` (`documents.ts:740-751`) leaves it to the database, and the invoice page shows "Remove" on every payment (`invoices/[id]/page.tsx:280-282`). The database's message reaches the person and is clear ("This payment cannot be removed: the refunds on the invoice would be more than the payments left"), so this is a gap in the spec's wording more than in behaviour.
- **(c) The outbox (run, R6, M6).** A handler that rejects with `null` or `undefined` makes `drainOutbox` reject (`outbox.ts:91`, "Cannot read properties of null"), leaving that job and the rest of its claimed batch running until the ten-minute lease ends; read `retry` with optional chaining. `queueDueReminders` counts a key that already existed (`reminders.ts:50`): four scans at once each reported 5 for the 5 jobs there were.
- **(d) The worker's default privileges (run, R6, by hand).** Beyond its three functions the worker can create temporary tables and functions and large objects, as any role can by default (`TEMP` on the database and `lo_create` for `PUBLIC`). Nothing it makes reaches data, but large objects persist. Revoking `TEMP` from `PUBLIC` and granting it to the roles that need it would close this.
- **(e) Restoring the standard codes (run, X1).** A standard code edited to 17.5% and then archived comes back from "add the standard codes" as the 17.5% code under the standard key, and no 20% code is added (`taxes.ts:95-135`). The comment says edited codes stay as they are; for an archived one, the person most likely wants the standard rate back.
- **(f) Comments that describe history (read; the repository's rule is "Comments describe what the code does now, never its history").** `packages/db/test/worker-role.test.ts:9` ("can no longer call"), `packages/documents/src/view.ts:168` ("approved 19 October 2026"), `packages/db/migrations/0012_worker_role.sql:1` ("review 1, L3"), `packages/documents/test/credit-wording.test.ts:7` and `packages/db/test/tax-defaults.test.ts:11` ("session 2, answer …").
- **(g) Tests that claim more than they check (read).**
  - `packages/db/test/refunds.test.ts:301-320` is named "the list, the client's paid to date and the dashboard", reads no client page, and records the payment and the refund on the same day, so criterion 7's "on the refund's date" is untested.
  - `apps/web/e2e/reminders.spec.ts` covers "Send a reminder now" only; no test sends a scheduled reminder through the drain route.
  - `packages/db/test/reminders.test.ts:103-114` ("two scans on the same day") runs the scans one after the other; M6 ran four at once and found one job each.
  - `packages/db/test/worker-role.test.ts:49-52` passes on "does not exist" as well as "permission denied".
- **(h) The sender name (read, not tried against Resend).** `apps/web/src/lib/jobs.ts:37` and `:85` put the business name unquoted before "via Invoica <…>". A name with a comma ("Mensah, Owusu & Co") gives a From value that RFC 5322 reads as two addresses; quote the display name.

---

## Checked and found sound

"Run" means a probe confirmed it; "read" means by reading the code.

- **Refunds through the data functions (run, R7).** 90 invoices of three shapes (UK VAT with a zero-rated line; Ghana's three taxes with prices including tax and an untaxed line; small single lines), 14 random steps each: 111 payments, 22 removals (54 refused, each exactly when the refunds would have passed the payments left), 281 credit notes of every kind (whole, lines, amounts, everything still owed), 165 of them with a refund, each exactly the part above the balance. Every "everything still owed" settled exactly, every invoice ended at £0.00 after its payments were removed and the rest credited, and the 57 credited in full ended with every tax row exact.
- **Figures that agree (run, R7, R8).** For every invoice: the list, the invoice page ("Paid" as payments, "Refunded", balance and state), the export (payments not removed less refunds), the dashboard's outstanding figure and top clients, and the reminder scan's balance (1,260 checks during the random sequences, with the scan run on each invoice's due date) all agreed. The client page sums the list's figure (read).
- **Payments and refunds at once (run, R8, R2, R9).** Eight workers recording payments, removing payments and issuing credit notes with refunds on three invoices for 15 seconds: no deadlock, serialisation failure or lock timeout, every failure a refusal the app describes, every ledger consistent. Under read committed a removal and a refund that race are taken one after the other and the second is refused; the same payment removed twice at once is refused the second time.
- **Refund guards (run, R4; and the builder's tests).** A refund on another business's invoice (with either business's id) is refused; one recorded with a draft that is never issued is refused at commit; a second refund on an issued note, voiding a credit note, and removing a payment the refunds need are refused. The table forces row-level security, the app role has no update or delete on it, and the append-only trigger stops the owner role. The other business sees no refund.
- **Every sum of payments counts refunds (read).** In SQL: `guard_payment`, `guard_refund`, `guard_document` (0013) and `due_reminders` (0015) are the only live functions that read payments, and each reads refunds (checked in the database's `pg_proc`). In TypeScript: `appliedAmounts`, `listDocuments`, `getDashboard` (payments and refunds on their dates), the export route and the invoice page. Voiding, recording a payment, crediting and reminders all take their balance from `appliedAmounts`.
- **The scan's view across organisations (run, M1).** Only the worker can run `app.due_reminders`; it returns organisation, invoice, offset and owner, nothing more. As the app role with the flag set for the session and for the transaction: every table showed only its own business, another business's invoice was invisible, `my_organisations`, `current_organisation_id` and `create_organisation` behaved as usual, and `set role invoica_owner` and the scan were refused. The worker reads no table, flag or not, and after the scan the flag is empty again until the transaction ends. The owner role sees every business with the flag, as it could anyway by switching row-level security off on its own tables; the web app never connects as it (read: `apps/web/src/lib/env.ts`).
- **The schedule (run, M2, M6; read).** For nine due dates (31 January, 28 February, 29 February 2024, 29 March and 25 October for London's clock changes, 27 September for Auckland's, 4 October for Sydney's, 1 November for New York's, 31 December) in London, New York, St John's, Sydney, Auckland, Kiritimati, Pago Pago, Kolkata and Kathmandu, the scan and `dueReminder` agreed at every hour from four days before to 38 days after. Missed days send only the latest reminder within a week. Four scans at once queued five jobs for five invoices, and a later scan that day none. The plan is checked before queuing and again at sending, and so are pauses, clients' choices and the balance (read, and the builder's tests).
- **VAT in sterling (run, S1 to S4).** 140,000 conversions in yen, CFA francs, euros, dollars, cedis, Kuwaiti and Bahraini dinars matched exact fractions rounded half up; exact halves round up; the spec's examples give £173.91 and £2.62. Reverse-charge VAT is converted and printed on its own ("Reverse-charge VAT in sterling £17.39" beside "VAT in sterling £8.70"), on invoices and credit notes. A credit note after the business moved to market rates and deregistered keeps the invoice's rate, method and date. A draft whose lines change after the rate is entered converts the new VAT. Rates of zero, below a millionth, with commas or exponents, or negative are refused.
- **The worker role (run, R6).** The app role cannot claim, finish or scan, and sees only its own jobs, also with another business's id set. The worker runs only its three functions and the trigger functions any role has by default, reads no table and calls none of the app's functions. A failure with `retry` false fails at once, one with `retry` null is retried, and finishing a job that is not running does nothing.
- **Sign-in by email (run, A1 to A8).**
  - Sign-up answers 200 with the same shape and no cookie for a new address, a confirmed one and an unconfirmed one, with times overlapping in every case (medians 97 to 123 ms); the owner of an existing address gets "You already have an Invoica account" and no second account is made.
  - A reset request gives the same body for any address, and sends after the answer (medians 7.6 and 8.7 ms with an 800 ms provider).
  - Sign-in gives the same answer for an unknown address and a wrong password; only the right password of an unconfirmed account gives "Email not verified" and a new link.
  - Reset links: 24 characters, stored as the user's id under the token; they work once, refuse after expiry and when guessed, end both open sessions, the old password stops working, and the owner is told.
  - Confirmation links sign in on first use only; expired and forged ones are refused.
  - Six forms of address off the site (another host, `//`, `/\`, a look-alike host, an encoded `//`, `javascript:`) are refused with 403 on verification, the reset landing, sign-up, sign-in, the reset request and the resend.
  - Limits: three requests, then 429, per client address from the trusted header, for resets, resends, sign-ups and sign-ins; `X-Forwarded-For` does not spread them; reset submissions fall under the general 30 a minute.
- **Copy (run, read).** The copy check passed, and the new interface text, emails and printed wording read in British English with no em dash or banned construction.

## Not checked

- Anything in a browser, the end-to-end suite, `pnpm check` as a whole (lint and format), `pnpm build`, and the PDF package's tests.
- The app served over HTTP on port 3100: the sign-in probes call the pinned configuration's handler directly, so Next.js's routing, `after()` and the proxy in front were not exercised.
- Resend itself: only by reading, and through the builder's adapter tests with a fake `fetch`.
- The time zone data of the production database, and which old names it knows.
- HMRC's rules on tax points and rates beyond what the spec states; Ghana's statutory wording.
- Load at scale: the reminder scan over many organisations, and the dashboard over many refunds.

## Files produced by this review

All in `../review/round8/`:

- `review-8.md` (this report);
- `pinned536-core.out`, `pinned536-db.out`, `pinned536-documents.out`, `pinned536-schemas.out`, `pinned536-web.out` (pinned suites), `typecheck536-*.out` (types), `copy-check536.out`;
- `refunds-probe.test.ts` with `refunds-probe.out` and `refunds-probe.json`;
- `reminders-probe.test.ts` with `reminders-probe.out` and `reminders-probe.json`;
- `sterling-probe.test.ts` with `sterling-probe.out` and `sterling-probe.json`;
- `misc-probe.test.ts` with `misc-probe.out` and `misc-probe.json`; `core/format-536.test.ts` with `core/format-536.out`;
- `auth/auth-probe-536.test.ts` with `auth/auth-probe-536.out` and `auth/auth-probe-536.json`;
- `scratch/make-db.mts` (creates the database used for exploring roles and time zones) and `scratch/intl-zones.txt` (the zones Node accepts);
- `pinned-536abdd/` (an export of `536abdd` with `node_modules` links to the pinned packages), and `node_modules/` (links, now to `pinned-536abdd`);
- from the interrupted attempt at `b1ef540`, kept as they were: `pinned/`, `db-probe.test.ts`, `db-probe.out`, `db-probe.json`, `auth/auth-probe.test.ts`, `auth/auth-probe.out`, `auth/auth-probe.json`, `core/format.test.ts`, `added-lines.txt`, `pinned-*.out` and `typecheck-*.out`.

---

## Resolution (builder, 20 October 2026)

Each fix began with a test that failed before the change. The specs gained the rules and criteria named below.

| Finding | Fix |
| --- | --- |
| R8-M1 | The request carries the refund the dialog showed (`refundInput.amount`). The server works it out again and, when a payment was recorded or removed meanwhile, refuses with the new figure ("The amount owed changed while this was open: the refund would now be £120.00. Check it and issue again."); nothing is recorded, and the dialog reloads its figures to confirm. Refunds rule 7, criterion 9; a two-tab end-to-end test; the race test now expects exactly one of the credit and the removal to go through. |
| R8-M2 | On `main`: the confirmation email greets no one by name, and a sign-up name is one line of at most 100 characters with no control or invisible characters, checked before the address is looked up, so new and existing addresses answer alike (sign-in rule 7). The main fix changes an auth rule, so it waits for approval on the branch `fix/confirm-then-sign-in`: opening the link confirms the address and signs nobody in, and sign-in then asks for the password ("Your email address is confirmed. Sign in to continue."). Its end-to-end tests pass, including the case from this review. |
| R8-M3 | A time zone is a region name: bare offsets are refused in core, and migration 0016 refuses any name the database does not know. The scan (`app.due_reminders`) works one business at a time and leaves out, with a warning, one whose date cannot be worked out; a reminder that fails to queue waits for the next scan; the drain runs the jobs even when the scan fails and then answers 500. Turning reminders on now checks the plan. Reminders rules 9 and 10. |
| R8-L1 | Migration 0017: a draft credit note with a refund cannot move to another invoice, and payments, refunds and documents are written only under read committed, where the guards' locks and sums hold. Refunds rules 8 and 9. |
| R8-L2 | A reminder is worded for the day it goes, so one caught up late reads as late; no reminder goes for a day before the invoice was issued, in the business's time zone (core and migration 0016); the invoice page names the reminder the scan sends today before the ones to come. Reminders rules 7, 8 and 11. |
| R8-L3 | The confirmation link is handed on and sent after the answer (`sendLater`), so the resend route no longer waits for the provider. |
| R8-L4 | A draft keeps what its rate was entered for (migration 0019): the currency, the method, and the month or day of the tax point. A rate kept through a change of either is refused on saving and on issue, and the editor clears it and asks for the new one; a draft saved in October with no dates and issued in November is asked for November's rate. Credit notes are a ledger against the invoice's sterling, so ten notes of a tenth credit exactly £17.39. Sterling criteria 8 and 9. |
| R8-L5 | (a) A refund cannot be dated before the latest payment on the invoice (app and migration 0017); the dashboard shows "Net received in the last 30 days" with what was paid and refunded when there were refunds. (b) Removing a payment is checked in the app first. (c) A job that fails with null is recorded and retried, and the scan counts only what it added. (d) Only the migration role may create temporary tables (migration 0018). Large objects are left as they are: the functions belong to the database's superuser, which the migration role is not. (e) An edited standard tax code that was archived stays archived as it was, and the standard code is added afresh. (f) The comments now describe the code or point at its spec; migration 0012's first line stays, as a migration that has run is never edited. (g) The client's "Paid to date" and the refund's own date are tested, a scheduled reminder goes through the drain route end to end, two scans at once are counted, and the worker test expects "permission denied" alone. (h) The business name in the sender is kept to one line and quoted when it holds a comma or another special character. |

Found while testing in this round and fixed with tests:

- A call that failed on the way (a dropped connection, a lost answer, a new version of the app) replaced the page with the error screen, losing what was typed and saying nothing had changed. Every call to the server now answers a message instead; buttons without a message area show it at the foot of the screen, and the reminder button keeps its request key until it succeeds (`apps/web/e2e/connection.spec.ts`).
- Payments, deposits and refunds could be dated after today.
- Links inside sentences relied on colour alone in light mode; they are underlined.
- The first save of a new draft set "Draft saved." on the page it was leaving, so the message often never showed.
- A price typed with more places than the currency has ("100.00" in yen) was unreadable; zeros past a currency's places are now read.
