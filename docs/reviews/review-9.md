# Invoica: independent review of the fixes from review 8, the tests added and production readiness (review 9)

Reviewer: a separate agent, acting as an independent reviewer. I did not write this code and changed no file in the repository.

Date: 20 October 2026.

## Scope and commit

This review is pinned to commit `38774cf` ("docs: blueprint and handover after the night's testing and review 8") on `main`, and covers the 23 commits since review 8 (`git log 536abdd..38774cf`), which acted on review 8 and its Resolution section and added tests, a health check, a start-up settings check, a container image and a deployment guide. It also covers the branch `fix/confirm-then-sign-in`, one commit (`487d471`) on top of `38774cf`. In order of priority:

1. refund confirmation: `refundInput.amount` (`packages/schemas/src/index.ts:332-342`), `createCreditNote` (`packages/db/src/documents.ts:976-1259`) and the credit dialog (`CreditNoteButton`, `apps/web/src/components/document-actions.tsx:342-669`);
2. migrations `0016_reminder_scan.sql` to `0019_sterling_rate_for.sql`, the seed script, the export and onboarding;
3. VAT in sterling: `sterlingRateFor`, `staleRateMessage` and `creditNoteSterlingVat` (`packages/core/src/sterling.ts:111-178`), their use in `createDraft`, `updateDraft`, `issueDocument` and `createCreditNote`, the editor (`apps/web/src/components/invoice-editor.tsx`), and `parseMoney` (`packages/core/src/money.ts:134-150`);
4. connection handling in the browser: `apps/web/src/lib/reach.ts`, `notice.ts`, `components/notices.tsx` and every call of a server action in `apps/web/src`;
5. reminders: wording by the sending day, the plan check, the drain route, the scan's count and `reminderStatus`;
6. sign-in: `sendLater`, the sign-up name rule in `hooks.before`, and on the branch `autoSignInAfterVerification: false` with the new `/confirm-email` and `/sign-in?confirmed=1` pages;
7. production readiness: `config-check.ts`, `start-check.ts`, `instrumentation.ts`, `/api/health`, `Dockerfile`, `deploy/compose.yaml`, `docs/deploy.md` and `next.config.ts`;
8. the tests added this round.

Every probe ran against an export of `38774cf` made with `git archive` at `../review/round9/pinned`, and the branch's probes against an export of `487d471` at `../review/round9/branch`. As in review 8, each export's `node_modules` folders hold links: `@invoica/*` to that export's own packages, everything else to the repository's installed packages. `readlink -f` on all eleven `@invoica` links in each export, and the five in `../review/round9/node_modules/@invoica`, resolves inside the export it belongs to. The only dependency change in the range is `fast-check` 4.10.2 added to `packages/db` as a development dependency, which the repository already had installed.

Line numbers are for `38774cf`, or for `487d471` where a finding says "on the branch". I changed nothing in the repository. The builder went on working in it during the review (by the end `main` had moved past `38774cf` and the working tree had an uncommitted change), which is why every check here ran against the exports.

## Tests run

| Suite | Where | Result |
| --- | --- | --- |
| Core | `pinned/packages/core` | 223 run, 223 passed, 0 failed, 0 skipped (21 files) |
| Database | `pinned/packages/db`, one file at a time | 183 run, 183 passed, 0 failed, 0 skipped (19 files) |
| Documents, schemas, web unit | pinned | 28 passed (3 files); 4 passed (1 file); 67 passed (13 files) |
| Types (`tsc --noEmit`) | pinned core, schemas, documents, db, pdf, web | clean, all six |
| Copy rules (`scripts/copy-check.mjs`) | pinned | 297 files examined, 0 findings |
| Refund and guard probes `guards9-probe.test.ts` | pinned, fresh databases | 4 run, 4 passed |
| Reminder probes `reminders9-probe.test.ts` | pinned, fresh database | 5 run, 5 passed; 1,728 scans, 293,336 comparisons with `dueReminder` |
| VAT in sterling probes `sterling9-probe.test.ts` | pinned, fresh database | 9 run, 9 passed; 17,344 random invoices with 88,670 credit notes |
| Retry probes `retry9-probe.test.ts` | pinned, fresh database | 2 run, 2 passed |
| Sign-in probes `auth9-main.test.ts`, `auth9-branch.test.ts` | each export's `auth.ts` on a fresh database, called through `auth.handler` | 6 run, 6 passed; 6 run, 6 passed |
| Smaller probes `misc9-probe.test.ts` | pinned | 3 run, 3 passed |
| Production build and server | `pinned/apps/web`, `.next/standalone` on port 3200 | built; start-up check, health, drain and five browser probes (H0 to H5) as reported below |
| Deployment checks | `deploy-check.out`, `sslmode-check.out` | see R9-L6 |

Each probe asserts what it observed and writes its observations to a `.json` beside it. A probe "passing" means its assertions about the observed behaviour held; several of them assert a defect. How to rerun them, from `../review/round9` with `TEST_DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres`: `node node_modules/vitest/vitest.mjs run --root . --no-file-parallelism --testTimeout=1200000 --hookTimeout=300000 --reporter=verbose <name>`, with `guards9-probe`, `reminders9-probe` (about three minutes), `sterling9-probe`, `retry9-probe`, `auth9-main`, `auth9-branch` or `misc9-probe` as the name. The pinned database suite: in `pinned/packages/db`, `node node_modules/vitest/vitest.mjs run test/<file>` for each file.

The sign-in probes replace only `server-only`, `next/server` (`after()` lets the work run on), `lib/db` (the test database as the app role) and `lib/email` (a recorder that can take a set time). Every database probe creates and drops its own database through `createTestDatabase`, or through `provisionDatabase` and `dropDatabase` for the migration probe; one `invoica_test_` database left by the run stopped by the restart was dropped first, and none was left at the end. Some probes connect to their own test database as the superuser: to read rows, to clear `sterling_rate_for` on a draft (as a draft saved before migration 0019 has it), to give a business a time zone the guard refuses (with the trigger switched off for that statement), and to switch reminders off for the businesses of earlier probes; in the HTTP run's database, to take away and give back the worker's right to run the scan. The `invoica`, `invoica_demo`, `invoica_prodcheck` and `invoica_audit` databases and the server on port 3000 were not touched.

The app was also built and served over HTTP. `pnpm build` in `pinned/apps/web` ran once nothing else was building or testing, with a watchdog that would have stopped it below 3 GB of available memory (the lowest was 3,769 MB). Turbopack will not follow links that leave the export, so for the build `pinned/node_modules/.pnpm` became a hard-linked copy of the repository's package store and the other links were copied from the repository, where they are relative links into it; the `@invoica/*` links were left as they were and still resolve inside the export. The standalone server ran on port 3200 with `NODE_ENV=production`, the settings the brief lists and its own database (`invoica_test_r9http`, created with `provisionDatabase` and dropped at the end), and was stopped when the browser probes (`http9-probe.mjs`, playwright-core with the Chromium in `/opt/pw-browsers`) had run. The branch was not built. To rerun the browser probes: `scratch/serve.sh` (after `pnpm build` and copying `.next/static` into the standalone folder), then `MAILBOX_DIR=scratch/http/mail CRON_SECRET=<the one in serve.sh> node http9-probe.mjs`.

---

## Summary

| Severity | Count | Findings |
| --- | --- | --- |
| Critical | 0 | |
| High | 0 | |
| Medium | 4 | R9-M1 to R9-M4 |
| Low | 7 | R9-L1 to R9-L7 |

What holds:

- The refund recorded is now the refund confirmed. A payment recorded or removed while the dialog was open, or a figure a penny off either way, is refused with the new figure and records nothing, and no credit note number is used. Migration 0017 holds against direct SQL as `invoica_app`: a draft credit note with a refund cannot move, writes under repeatable read or serializable are refused, and a refund dated before the latest payment is refused.
- The reminder scan agreed with `dueReminder`, issue day included, at every hour for ten weeks in twelve time zones across clock changes (293,336 comparisons), and in those zones the invoice page named the reminder the scan sent. One business's unknown time zone now leaves out that business only.
- Credit notes in pieces credit exactly the invoice's sterling, charged and reverse-charge VAT apart, also against invoices with no record of what their rate was for.
- On the branch, opening a confirmation link signs nobody in, in every order of events tried.
- What the app does is still accepted: onboarding in all 16 offered time zones, migrating a database from 0015 that holds a bare offset, the seed script and the export.
- The production build stops at start with a list of missing settings, answers its health check, and the drain route answers 500 when the scan fails, after running the jobs.

What does not:

- **R9-M1.** "Everything still owed" credits the balance at the moment of issue, which can differ from the figure the person confirmed, and a credit note cannot be voided.
- **R9-M2.** When a service period has only one of its dates, the editor asks for the exchange rate of one month and the invoice records it as the rate of another.
- **R9-M3.** Onboarding sent twice (a lost answer tried again, or two tabs) makes two businesses; on any other device the person lands in the empty one and nothing in the app reaches the other.
- **R9-M4.** On `main`, the confirmation link still signs the owner of an address in to an account whose password someone else chose (R8-M2). The branch closes this; what the other person set up in the account stays after the owner takes it back.
- **R9-L1.** The app and the database read some time zones differently because their time zone data differ in version; the guard checks names only.
- **R9-L2.** VAT in sterling: the same figure typed again for a new day or month is refused, and two ways a kept rate still reaches an issued invoice.
- **R9-L3.** Retries and messages in the browser: "try again" records a second client, item, tax code or draft, and after a deployment or a sign-out the message gives advice that cannot work.
- **R9-L4.** "1.500" in euros is now read as €1.50, where it was refused.
- **R9-L5.** A reset link asked for an unconfirmed account greets the address with the name someone else chose, and names in scripts that join letters with invisible characters are refused.
- **R9-L6.** The deployment's settings files are ignored by neither Git nor Docker, so an image built on the server holds every secret; and `sslmode=require` checks the database's certificate against Node's authorities, which a provider's own may not chain to.
- **R9-L7.** Tests that claim more than they check, and smaller points.

---

## Findings

### R9-M1. "Everything still owed" can credit another balance from the one confirmed

- **Severity:** medium (a stale dialog or a colleague's change; a credit note cannot be voided)
- **Where:**
  - `apps/web/src/components/document-actions.tsx:521` offers "Everything still owed, {balance}" from the balance the page loaded with, `:432-433` previews a credit note of that balance, and `:477-478` sends only `{ invoiceId, reason, idempotencyKey, mode }`.
  - `packages/db/src/documents.ts:1001-1002` reads the balance inside the transaction and `:1047-1049` credits it (`planBalanceCredit(source, state, balance)`). The request's fingerprint (`:983-989`) holds no figure for this mode, so nothing can be compared.
  - `0013_refunds.sql:295-296`: a credit note cannot be voided.
- **What goes wrong:** an invoice of £120.00 (£100.00 plus VAT) with £60.00 paid. The owner opens "Credit note", chooses "Everything still owed, £60.00", sees "Credit note total £60.00" and writes the reason. Before the button is pressed, the £60.00 payment bounces and is removed (by a colleague, or in another tab). The note issued is for £120.00: the client owes nothing, and the £60.00 that bounced has been written off with the rest. The other way, a payment of £60.00 recorded meanwhile on an unpaid £120.00 invoice makes the note £60.00 where £120.00 was confirmed. This is the shape of R8-M1, which the fix closed for refunds only.
- **How confirmed:** run, `guards9-probe.json`: `"balanceModeAfterRemoval": {"dialogShowed": 6000, "issued": 12000, "after": {"paid": 0, "creditNotes": 1, "balance": 0}}` and `"balanceModeAfterPayment": {"dialogShowed": 12000, "issued": 6000}`.
- **Suggested fix:** send the balance the dialog showed with a request for everything still owed, include it in the fingerprint, and refuse when the server's balance differs, as refunds now do ("The amount owed changed while this was open: everything still owed is now £120.00. Check it and issue again.").

### R9-M2. A service period with one date: the editor asks for one month's rate and the invoice prints another

- **Severity:** medium (a period with its start or end left blank; the issued invoice cannot change, and its credit notes keep its rate)
- **Where:**
  - The editor's tax point (`apps/web/src/components/invoice-editor.tsx:386-395`): in period mode, the period's end, or today when there is no end.
  - The server's (`packages/db/src/documents.ts:384-392` for `sterlingRateFor` on save, `:620` and `:630` on issue): a supply date, else (when there is no period start) the issue date, else the period's end, else the issue date. When a period has only one of its dates, that is the issue date either way.
  - The editor names the month and links to HMRC's rates for it (`:719-735`), and its preview prints the editor's month (`:466-474`). Neither the schema (`packages/schemas/src/index.ts:283-316`) nor the editor requires both dates of a period.
- **What goes wrong:**
  - **An end and no start.** On 3 November, an invoice in euros dated 3 November for a period "to 31 October". The editor says "HMRC's period rate for October 2026" and links to October's rates; the owner types October's figure, 1.1500. The draft records that rate as being for November (`EUR|hmrc_period|2026-11`), the issue check passes, and the invoice prints "VAT in sterling at £1 = 1.1500 EUR, HMRC period rate for November 2026." with £17.39 worked out at October's figure. Opening the draft again before issuing clears the rate with "The exchange rate was entered for November 2026. Enter HMRC's rate for October 2026."
  - **A start and no end.** On 3 November, an invoice dated 31 October for a period "from 1 October". The editor asks for November's rate (today's month); the owner types 1.1700; the invoice prints "HMRC period rate for October 2026" with November's figure.
- **How confirmed:** run, `sterling9-probe.json`, `"S1-end-only": {"editorRateDate": "2026-10-01", "storedRateFor": "EUR|hmrc_period|2026-11", "issued": {"rateDate": "2026-11-01", "charged": 1739}, "printed": "VAT in sterling at £1 = 1.1500 EUR, HMRC period rate for November 2026."}` and `"S1-start-only": {"editorRateDate": "2026-11-01", "issued": {"rate": 1170000, "rateDate": "2026-10-01"}}`. The probe works the editor's tax point out with the editor's own expression, copied from `:386-395`.
- **Suggested fix:** work the tax point out in one place in `@invoica/core` and use it in the editor, on save and on issue; or require both dates of a period (or neither) in the schema, so the two rules cannot part.

### R9-M3. Onboarding sent twice makes two businesses, and other devices open the empty one

- **Severity:** medium (a lost answer tried again, or onboarding open in two tabs; nothing in the app can reach the other business or remove one)
- **Where:**
  - `apps/web/src/lib/actions/onboarding.ts:11-27`: `createOrganisationAction` carries no request key, so every call creates a business. The form (`apps/web/src/app/onboarding/onboarding-form.tsx:50-58`) says "could not be reached, so this may not have been saved. Check your connection, then try again." after a lost answer, and the onboarding page checks for an existing business only when it loads (`apps/web/src/app/onboarding/page.tsx:13`).
  - `onboarding.ts:17-22` sets the chosen business in a cookie with no lifetime, which ends with the browser session; `apps/web/src/lib/session.ts:44-45` otherwise opens the first of `app.my_organisations()`, ordered by when the membership was made (`0002_tenancy.sql:39`), which is the business of the first call.
  - No page lists or switches businesses (`switchOrganisationAction`, `apps/web/src/lib/actions/preferences.ts:25-36`, is called from nowhere), and no business can be deleted.
- **What goes wrong:** a new owner presses "Continue to Invoica" and the answer is lost. They try again as the message asks, a second "Lagoon Studio" is made, and they work in it: clients, invoices, payments. When they sign in on their phone, or after the browser is closed, Invoica opens the first "Lagoon Studio", which is empty, and nothing on screen leads to the one they used. To them, their records are gone.
- **How confirmed:** run, `retry9-probe.json`: `"organisationsNamedQuayStudio": 2` for two calls of `createOrganisation`, and `"R-onboarding": {"businesses": ["first call (answer lost)", "second call (in use)"], "landsOnWithoutTheCookie": "first call (answer lost)", "clientsThere": 0}`, which applies the choice in `session.ts:44-45` to the businesses `myOrganisations` returns. Over HTTP (`http9-probe.json`, H1): after the lost answer the form said "Invoica could not be reached, so this may not have been saved. Check your connection, then try again."; the second press opened the dashboard; the business cookie is a session cookie (`"expires": -1`); the business in use had one client, and signed in from a new browser the Clients page read "Add your first client".
- **Suggested fix:** give onboarding a request key, as new drafts have, or refuse a second business for a user in `createOrganisationAction` until there is a way to have more than one; keep the chosen business in a lasting cookie; and offer a switcher whenever a user has more than one.

### R9-M4. On `main`, confirming an address still signs the owner in to someone else's account

- **Severity:** medium on `main` (as R8-M2); low on the branch
- **Where:**
  - `main`: `apps/web/src/lib/auth.ts:54`, `autoSignInAfterVerification: true`. The fix is on the branch, waiting for approval.
  - The branch: `apps/web/src/lib/auth.ts:56` (`false`), `apps/web/src/app/(auth)/confirm-email/page.tsx:17-20` and `apps/web/src/app/(auth)/sign-in/page.tsx:21-22`.
- **What goes wrong:**
  - **On `main` (A3):** someone signs up with the owner's address and a password of their own. The owner opens the confirmation link and is signed in (302 to `/confirm-email` with a session cookie, as the owner's address). The other person then signs in with their password (200).
  - **On the branch (A3, A3b):** opening the link signs nobody in, in every order tried: the other person signing in before the owner confirms (403 "EMAIL_NOT_VERIFIED", and a second link to the owner), the owner signing up as well ("You already have an Invoica account", and no password of theirs is set), and a link opened twice. The owner cannot sign in with their own password (401) until they reset it, and the reset ends the other person's session and password.
  - **On both (A5):** the owner's click confirms the account for the other person, who can then sign in and set it up. When the owner takes the account back with a reset, they find the business the other person made, with that person's bank details on it: "Owusu Design", account "A N Other", sort code 00-11-22. Their invoices would print those details.
- **How confirmed:** run, `auth9-main.json`: `"A3": {"opened": {"status": 302, "location": "/confirm-email", "sessionCookie": true}, "ownerSignedInAs": "a3-owner-…@example.test", "attackerSignIn": 200}`; `auth9-branch.json`: `"A3": {"opened": {"sessionCookie": false}, "attackerSignIn": 200, "ownerWithOwnPassword": 401, "attackerSessionAfterReset": null, "attackerPasswordAfterReset": 401, "ownerAfterReset": 200}`; both: `"A5": {"sameUser": true, "ownerOrganisations": [["Owusu Design", "owner"]], "paymentDetailsTheOwnerSees": {"bank": {"accountName": "A N Other", "sortCode": "00-11-22", "accountNumber": "99887766"}}}`.
- **Suggested fix:** merge the branch once approved. For the rest, ask for the account's password on the confirmation page before confirming (so a click by someone who does not know it confirms nothing), or, when an address is confirmed by a link and nobody has signed in yet, ask the person who confirmed it to choose the password there.

### R9-L1. The app and the database read some time zones differently

- **Severity:** low (none of the 16 zones the forms offer differs today; another zone needs a crafted request)
- **Where:** `0016_reminder_scan.sql:6-24` and `packages/core/src/dates.ts:47-55` check that a zone is a region name both know. Dates are worked out by Node's ICU data in the app (`todayIn`) and by the database's own data in the scan (`0016_reminder_scan.sql:47` and `:55`).
- **What goes wrong:** this machine's PostgreSQL reads the system's time zone data (tzdata 2026c); Node 22.22.0 has ICU with 2025b. Of the 495 names that pass the guard, 11 read differently at some of 384 instants from 2024 to 2027, among them `America/Vancouver`, `America/Edmonton` and `America/Yellowknife` (from 1 November 2026 the database stays an hour ahead), `Africa/Casablanca` and `Africa/El_Aaiun` (from 20 September 2026 the database is an hour behind), `Europe/Chisinau` and `Europe/Tiraspol`, and `CET`, `EET`, `MET` and `WET`. For a business in Casablanca the scan's answer differed from `dueReminder`'s at 47 of its hourly scans in ten weeks, and the invoice page named a reminder the scan did not send 33 times; the twelve other zones agreed at every hour. The Docker image fixes Node's data at its build (`Dockerfile:5`) while the provider's database updates on its own, so a rule change in an offered zone (the EU's clock changes, for example) would open the same gap for every business there. Three more names, `Factory`, `localtime` and `posixrules`, pass the database's guard and are refused by Node, so a business given one by direct SQL cannot open any page.
- **How confirmed:** run, `reminders9-probe.json`: `"M3": {"namesPassingGuard": 495, "nodeRefuses": ["Factory", "localtime", "posixrules"], "readDifferently": {"America/Vancouver": {"instant": "2026-11-01 11:30:00+00", "pg": "2026-11-01 04:30", "node": "2026-11-01 03:30"}, "Africa/Casablanca": {"pg": "2026-09-27 00:30", "node": "2026-09-27 01:30"}, …}}`; `"M1": {"mismatchesByZone": {"Africa/Casablanca": 47}, "pageDisagreesByZone": {"Africa/Casablanca": 33}}`; `guards9-probe.json` `"timeZones": {"Factory": "committed", "localtime": "committed", "posixrules": "committed", "America/Vancouver": "committed"}`. `zdump` and `dpkg -l tzdata` on this machine show the 2026c rules.
- **Suggested fix:** work every business date out in one place: let the scan return each open invoice's due date, issue instant and business time zone, and choose the offset in `queueDueReminders` with `dueReminder` and `todayIn`, as the invoice page does. Accept only the zones the forms offer, and refuse `Factory`, `localtime` and `posixrules` in the guard.

### R9-L2. VAT in sterling: a figure typed again is refused, and two ways a kept rate still issues

- **Severity:** low
- **Where:** `packages/db/src/documents.ts:532-545` (`updateDraft`) and `:631-643` (`issueDocument`).
- **What goes wrong:**
  - **(a) The same figure for a new day or month (S2).** The check at `:534-545` refuses a rate equal to the one kept when what it is for has changed, so a person who looks up the new rate and finds the same figure cannot save it: with market rates, a draft saved on 19 October at 1.1500 and saved again on the 20th with 1.1500 typed for the 20th gets "The exchange rate was entered for 19 October 2026. Enter the market rate for 20 October 2026." The editor has already cleared the field and asked for the rate, so the person typed it. Saving once with no rate and then with the figure is accepted.
  - **(b) A draft saved before migration 0019 (S3).** With `sterling_rate_for` empty, neither check runs (`:536` and `:633`): such a draft changed to yen keeps 1.1500 and issues "VAT in sterling at £1 = 1.1500 JPY" (£1,739.13 for ¥2,000 of VAT), and one issued in November keeps October's figure as "HMRC period rate for November 2026". This affects only drafts that existed when the migration ran.
  - **(c) A save that needs no VAT in sterling (S6).** The check runs only when the draft needs VAT in sterling as saved (`:539-542`), and the save then records the kept rate as being for the new currency: a euro draft at 1.1500 saved in yen with a zero-rated line, then saved with a VAT line, issues at 1.1500 JPY. The editor clears the rate when the currency changes, so this needs a request the editor does not send.
- **How confirmed:** run, `sterling9-probe.json`: `"S2-market": {"sameFigure": "The exchange rate was entered for 19 October 2026. Enter the market rate for 20 October 2026.", "cleared": "did not fail", "again": "did not fail"}`; `"S3": {"currencyChange": "did not fail", "yen": {"sterlingVat": {"rate": 1150000, "charged": 173913}}}`; `"S6": {"rateForAfterFirst": "JPY|hmrc_period|2026-10", "issued": "did not fail", "printed": "VAT in sterling at £1 = 1.1500 JPY, HMRC period rate for October 2026."}`.
- **Suggested fix:** send with the save whether the rate was typed since the draft was opened (or what the editor believed it was for), and refuse only a rate carried over; treat an empty `sterling_rate_for` with a rate as stale; run the check whatever the draft needs at that save.

### R9-L3. Retries and messages in the browser

- **Severity:** low
- **Where:** `apps/web/src/lib/reach.ts:3-20`, `apps/web/src/lib/actions/result.ts:98-105` and the actions in `apps/web/src/lib/actions/*.ts`.
- **What goes wrong:** every call of a server action in `apps/web/src` goes through `reach` or `reachAuth` (checked at all 27 call sites). After a lost answer the message says "Invoica could not be reached, so this may not have been saved. Check your connection, then try again." What trying again does:

  | Action | Request key | Tried again after a lost answer |
  | --- | --- | --- |
  | New draft, payment, credit note, email, "Send a reminder now" | yes | recorded once (the builder's tests) |
  | New client, new item, new tax code | no | a second one with the same name (run) |
  | Duplicate | no | a second draft (run) |
  | Onboarding | no | a second business (R9-M3) |
  | "Issue invoice" on a draft saved before | no | "Only drafts can be edited.", on an invoice that was issued (run) |
  | Void | no | "Cannot void a document that is void." (read) |
  | Delete a draft | no | "This document does not exist." (read) |
  | Edits, archive, settings, pause, theme | not needed | the same result |

  Two more messages say something untrue about what to do:
  - **After a new version is deployed.** A page opened before then calls actions the server no longer knows; Next.js answers with `x-nextjs-action-not-found` and the browser throws `UnrecognizedActionError` (`next/dist/client/components/router-reducer/reducers/server-action-reducer.js:103-105`), which `reach` turns into the connection message. Trying again fails the same way until the page is reloaded. Over HTTP (H3): with the page's action id replaced by one the server does not know, the server answered 409 with `x-nextjs-action-not-found: 1` and the form showed the connection message after each of two clicks.
  - **When the session has ended.** `inWorkspace` calls `requireWorkspace`, whose `redirect('/sign-in')` throws inside each action's `try` (`apps/web/src/lib/session.ts:24-27`, `apps/web/src/lib/workspace.ts:7-10`); `failure` takes it for an unknown error and answers "Something went wrong and nothing was saved. Try again.", every time. This is how a device signed out by a password change elsewhere behaves; it predates this round.
- **How confirmed:** run, `retry9-probe.json`: `"clientsNamedHarbourMill": 2, "itemsNamedLocationDay": 2, "taxCodesLabelledReduced": 2, "draftsFromDuplicate": 2, "saveAndIssueTriedAgain": "Only drafts can be edited."`. Over HTTP: two "Harbour Mill Ltd" rows in the client list after a lost answer and a second press (H2); with the session cookie cleared, "Save client" answered "Something went wrong and nothing was saved. Try again." both times, and the server logged `action failed Error NEXT_REDIRECT` (H4, `http9-server.log`). The rest by reading.
- **Suggested fix:** give the creating actions a request key, as drafts have; when "Save and issue" finds the draft already issued by the same request, answer with its number; tell an unknown action apart in `reach` ("Invoica has been updated. Copy anything you typed, then reload the page."); and let `redirect` errors through (`unstable_rethrow` from `next/navigation`, or `isRedirectError`) before `failure`.

### R9-L4. Three decimals ending in zero are now read as two

- **Severity:** low (the figure is on screen before it is confirmed; a payment can be removed)
- **Where:** `packages/core/src/money.ts:140-142`, used for line prices, discounts and deposits in the editor, item prices, payment amounts and credit amounts (`apps/web/src/components/invoice-editor.tsx:216`, `:257`, `:264`, `item-editor.tsx:38`, `document-actions.tsx:144`, `:436`, `:487`).
- **What goes wrong:** zeros past a currency's places are now dropped, so "1.500" in euros is €1.50, "2.000" is €2.00 and "1.250" is €1.25; at 536abdd each was refused. In Germany, the Netherlands and France, all offered at sign-up, "1.500" is how one thousand five hundred is written. A payment typed so is recorded as €1.50 without a word.
- **How confirmed:** run, `sterling9-probe.json`, `"S5": {"EUR": {"1.500": {"now": 150, "at536abdd": null}, "2.000": {"now": 200, "at536abdd": null}, "1.250": {"now": 125, "at536abdd": null}}}` (536abdd's `parseMoney` from `../round8/pinned-536abdd`). Over HTTP (H5): "1.500" typed in "Record payment" on a £2,000.00 invoice was recorded as £1.50, and the invoice read "Part paid".
- **Suggested fix:** accept extra zeros only up to the currency's places plus one or two where they cannot be a thousands group (for two-place currencies, refuse exactly three digits after the point), or refuse them for currencies with two places and accept them only for those with none.

### R9-L5. Names in sign-in emails and the sign-up name rule

- **Severity:** low
- **Where:** `apps/web/src/lib/auth-emails.ts:9`, `:33` and `:68`; `apps/web/src/lib/sign-up-name.ts:7-10`; Better Auth's `/request-password-reset` sends to unconfirmed accounts (`better-auth/dist/api/routes/password.mjs:59-86`).
- **What goes wrong:**
  - Someone signs up with another person's address and the one-line name "there. Your Invoica trial has ended: settle it at pay-invoica.example today", then asks for a reset link for that address. The owner of the address receives "Hello there. Your Invoica trial has ended: settle it at pay-invoica.example today," followed by a genuine reset link from Invoica's address. On the branch a reset is how the owner takes such an account back (R9-M4), so this is the email they read first; "Your Invoica password was changed" then greets them the same way (read, `auth-emails.ts:64-68`). The confirmation email greets no one, as intended.
  - The name rule refuses `\p{Cf}`, which includes the zero-width joiner and non-joiner that Persian and Sinhala use inside words: "علی‌اکبر" and "ශ්‍රී" are refused with "Use a name of up to 100 characters, on one line."
- **How confirmed:** run, `auth9-main.json` and `auth9-branch.json`, `"A2": {"confirmationOpens": "Hello,", "resetOpens": ["Hello there. Your Invoica trial has ended: settle it at pay-invoica.example today,", …]}`; `misc9-probe.json`, `"signUpName": {"persianWithZwnj": "Use a name …", "sinhalaWithZwj": "Use a name …"}`.
- **Suggested fix:** greet by name only once the address is confirmed (`user.emailVerified`); allow U+200C and U+200D in names.

### R9-L6. Deployment: the settings files and the database's certificate

- **Severity:** low (needs a build on the server and the image shared, or a commit from the server; depends on the provider)
- **Where:** `docs/deploy.md:44-62` puts `invoica.env`, `migrate.env`, `scheduler.env` and `tunnel.env` in `deploy/`; `.gitignore` and `.dockerignore` ignore `.env` and `.env.*` only; `Dockerfile:23` copies the whole context into the build stage and `:28` makes the migration image from it; `docs/deploy.md:49-60` uses `sslmode=require`.
- **What goes wrong:**
  - `git check-ignore` ignores none of the four files, so `git add -A` on the server stages them. Docker's context includes them too, so `docker build --target migrate` on the server, as step 6 says, copies them into `/app/deploy/` of the migration image: the app's and worker's database passwords, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, the owner role's URL and `TUNNEL_TOKEN`, in an image that runs as root. The app image copies only `.next/standalone` and `.next/static` and does not hold them. `docker compose config` with the four files gives each container only its own, as the guide says.
  - In pg 8.23.1 (pg-connection-string 2.14.1) `sslmode=require` means verify-full: the server's certificate must chain to a certificate authority Node trusts. A provider that signs with its own authority needs its root certificate (`sslrootcert`), which the guide and the image do not provide; the app would then fail its health check.
- **How confirmed:** run, `deploy-check.out` (`deploy/invoica.env: NOT ignored by .gitignore` for all four, `add 'deploy/invoica.env'`, and the compose file as Docker reads it); `sslmode-check.out` (`require {"ssl":{}}`, the same as `verify-full`, with the library's warning). The image contents by reading: no Docker daemon runs on this machine.
- **Suggested fix:** add `deploy/*.env` to both ignore files (or keep the files outside the repository, for example in `/etc/invoica/`); copy only what the migration needs into its image; say in the guide which `sslmode` to use and where a provider's root certificate goes.

### R9-L7. Tests that claim more than they check, and smaller points

- **Severity:** low
- **(a) Tests (read).**
  - `packages/db/test/journeys.test.ts:907-937`, "the scan never queues a reminder twice for one offset, whatever the order of days", checks that the reminder keys are distinct. The outbox's `unique (organisation_id, idempotency_key)` (`0001_init.sql:331`) makes that true whatever the scan does; the test does not check which reminders were queued on which day. Its last assertion (no payment) is unrelated.
  - `apps/web/e2e/real-world.spec.ts:99` asserts that no text "£120.00, " exists; the payments list prints the amount in a paragraph of its own (`invoices/[id]/page.tsx:281`), so the assertion holds whatever was recorded. `:178` asserts that "£120.00" is visible after the refund, which the invoice's own total always is; the test does not check that the refund recorded is £120.00.
  - `apps/web/e2e/connection.spec.ts:4-7` says "trying again never records anything twice"; it tries a draft and a payment, and a new client, item, tax code or business is recorded twice (R9-L3, R9-M3).
  - `packages/core/test/properties.test.ts:126-151` never passes `issuedOn`, the argument added this round, and the file has no property of `creditNoteSterlingVat`; its refund property (`:36-62`) uses an invoice equal to the credit and no earlier notes.
- **(b) Dates after today by direct SQL (run, G2).** The database refuses refunds dated before the latest payment, and has no rule on payments or refunds dated after today: a payment dated 2099-01-01 inserted as `invoica_app` commits, and a refund so dated is refused only because its note was not issued.
- **(c) Large objects (run, G2).** `lo_create` still works for the app role, as the Resolution says; temporary tables are refused for the app and worker roles.
- **(d) A business left out of the scan is reported only in the database's log (read, M2).** The warning reaches the worker connection as a notice that nothing reads; the business's reminders stop without a word in the app.
- **(e) `/sign-in?confirmed=1` (read, on the branch).** Anyone can link to it and show "Your email address is confirmed. Sign in to continue."; an `error` parameter only chooses the page that offers a new link. Neither shows what the address holds.
- **(f) End-to-end in CI (read).** CI runs the end-to-end suite against `next dev` (`.github/workflows/ci.yml`, job `e2e`), so in CI the start-up check, the standalone server, production rate limits and Secure cookies are never exercised; the handover reports one run by hand against a production build (57 passed, 23 skipped, 2 failed, then the failing file passed). The handover also says CI has not yet run on GitHub and the container image has not been built anywhere.

---

## Checked and found sound

"Run" means a probe confirmed it; "read" means by reading the code.

- **Refund confirmation (run, G1).** A payment recorded while the dialog was open: refused with "The amount owed changed while this was open: the refund would now be £120.00. Check it and issue again.", no credit note, no refund and the number counter unchanged; the same request key with the new figure then issues CN-0001 with a refund of £120.00. A payment removed meanwhile: refused with £60.00. A refund a penny above or below: refused. A credit above the balance without a refund: refused. A refund on a credit within the balance: refused. The builder's concurrency test (a credit with a refund racing the removal of a payment) passed in both orders.
- **Migrations 0016 to 0018 against direct SQL as `invoica_app` (run, G2).** Moving a draft credit note after its refund: refused. A payment, a removal and a credit note under repeatable read and under serializable: refused; the isolation level cannot be changed after the first statement. A refund dated before the latest payment: refused. Bare offsets, old names (`Asia/Calcutta`), lower-case names and `EST5EDT`: refused. Temporary tables: refused for the app and worker roles.
- **What the app does is still accepted (run, G3).** Onboarding through `app.create_organisation` in all 16 offered time zones; migrating a database from 0015 that holds a business at `+05:30` (0016 to 0019 applied); the seed script as `pnpm db:seed` runs it ("Seeded 3 demo businesses"); the export after a refunded credit note. Nothing in the app uses repeatable read (read).
- **The reminder scan (run, M1, M2, M4).** Thirteen businesses in London, New York, St John's, Santiago, Havana, Auckland, Chatham, Lord Howe, Kolkata, Kathmandu, Kiritimati, Pago Pago and Casablanca, 182 invoices issued at hours around local midnight (a third of them dated four days earlier) with due dates up to eight days later, scanned every hour for 72 days from 30 August 2026 across the clock changes of September to November: 293,336 comparisons with `dueReminder` and the issue day, 6,835 cases left out by the issue-day rule, and no disagreement outside Casablanca (R9-L1). On each day the scan found a reminder due, the invoice page named that reminder for today in 4,921 of 4,954 checks; the 33 others were the Casablanca business. A business with a zone the database does not know is left out with a warning and another business's reminder is still queued; the same zone saved again with the profile is refused with "Choose a time zone from the list.". Four scans at once returned 5, 0, 0 and 0 for five jobs. A due-date reminder sent the next day reads "Invoice INV-0001 is 1 day overdue". Turning reminders on after the trial has ended is refused; a lapsed plan with reminders already on queues nothing. The drain route runs the jobs and answers 500 when the scan fails (run over HTTP, below).
- **Credit notes against the invoice's sterling (run, S4).** 17,344 random invoices in yen, euros, dollars and Kuwaiti dinars, with charged VAT, reverse-charge VAT or both, credited in up to twelve pieces (88,670 notes): no note below zero, no invoice credited more sterling than it charged, and every invoice whose VAT was all credited had its sterling all credited, charged and reverse charge apart. Through the database: four euro invoices with a standard-rated and a reverse-charge line at four rates, two of them with no `sterling_rate_for`, each credited in seven amounts and the rest: the notes' sterling summed exactly to the invoice's (for example £17.39 and £12.18 at 1.1500).
- **Stale rates (run, S2; the builder's tests).** A rate kept through a change of currency, method or month is refused on saving and on issue, with a message naming both; a draft saved in October with no dates and issued in November is asked for November's rate.
- **Sign-in (run, A1, A3, A3b, A4).** The name rule answers 400 with the same body for a new and an existing address for names of 101 characters, two lines, a right-to-left override and U+0085, sends nothing, and the answer takes as long (medians 1.4 and 1.2 ms); the hook runs before Better Auth looks the address up, and `/sign-up/email` is the only sign-up route enabled (read). A new confirmation link with an 800 ms provider takes 503 ms for an unknown address and 503 ms for an unconfirmed account (R8-L3 closed). On the branch, a forged link goes to `/confirm-email?error=INVALID_TOKEN`, and a used one to `/confirm-email` with no session.
- **Connection handling (read).** All 27 calls of server actions in `apps/web/src` go through `reach`, and the seven calls of the sign-in client through `reachAuth`; the page and what was typed stay; the credit dialog reloads its figures after a refusal and keeps the reason.
- **The production build (run, over HTTP).** Started without `CRON_SECRET` and with a bare `EMAIL_FROM`, the server stopped with "Invoica cannot start. Fix these settings:" naming both and repeating neither value (`start-check.out`). Served: `/api/health` answered 200 `{"status":"ok"}` with `Cache-Control: no-store`; the drain route answered 401 without the secret and 200 with it; with the worker's right to run the scan revoked in that database, it answered 500 with `"reminders": null` after running the jobs, and 200 again once the right was restored (`drain-scan-fails.out`).
- **Production settings (run, X1, X2; read).** The settings `docs/deploy.md` lists, with the compose file's `FILE_STORAGE_DIR` and the image's `NODE_ENV`, pass the start-up check; a production build at localhost may use http and the development mailbox. The health check answers false at once when the database refuses connections (16 ms). The start-up check is skipped during `next build` and never repeats a value (read and the builder's tests). The compose file parses and gives the scheduler only `CRON_SECRET` and the tunnel only `TUNNEL_TOKEN` (run, `deploy-check.out`).
- **The sender name (run, X3).** "Mensah, Owusu & Co" is quoted, quotes are escaped, and line breaks and angle brackets are removed.
- **Copy (run, read).** The copy check passed; the new messages read in British English with no em dash or banned construction.

## Not checked

- The branch over HTTP: its two pages were read, and its Better Auth configuration was run through the handler.
- The 12 commits made on `main` after `38774cf` while this review ran (`add7ca5` to `d4f7c38`). By their subjects, several touch R9-M3 and R9-L3 (`b6c67eb`, `062cf1b`, `abf0885`, `c27bdc3`, `31ff0ad` for repeated requests, `add7ca5` for an action after signing out); none of them was read or run here.
- The end-to-end suite, `pnpm check` as a whole (format and lint), and the PDF package's tests.
- Building or running the container images: no Docker daemon runs on this machine. Resend, Cloudflare and a managed database provider's certificates.
- Whether HMRC's rules make the period's end or the issue date the tax point when a period has only one date (R9-M2 is about the two rules disagreeing).
- Load at scale: the per-business scan over many businesses.

## Files produced by this review

All in `../review/round9/`:

- `review-9.md` (this report);
- `pinned-core.out`, `pinned-db.out`, `pinned-documents.out`, `pinned-schemas.out`, `pinned-web.out` (pinned suites), `typecheck-*.out` (types), `copy-check.out`;
- `guards9-probe.test.ts` with `guards9-probe.out` and `guards9-probe.json`;
- `reminders9-probe.test.ts` with `reminders9-probe.out` and `reminders9-probe.json`;
- `sterling9-probe.test.ts` with `sterling9-probe.out` and `sterling9-probe.json`;
- `retry9-probe.test.ts` with `retry9-probe.out` and `retry9-probe.json`;
- `auth9-shared.ts`, `auth9-main.test.ts` with `auth9-main.out` and `auth9-main.json`, `auth9-branch.test.ts` with `auth9-branch.out` and `auth9-branch.json`;
- `misc9-probe.test.ts` with `misc9-probe.out` and `misc9-probe.json`;
- `deploy-check.out`, `sslmode-check.out`, and `scratch/deploy-check/` (the copies of `.gitignore`, `.dockerignore` and the compose file, with placeholder settings, that they used);
- `http9-probe.mjs` with `http9-probe.out` and `http9-probe.json`, `http9-server.log`, `start-check.out`, `drain-scan-fails.out` and `build.out`; `scratch/make-http-db.mts`, `scratch/serve.sh` and `scratch/build-when-free.sh` (the database, the server and the guarded build), and `scratch/http/` (the server's mailbox and files);
- `pinned/` (an export of `38774cf`, with its build in `apps/web/.next` and a hard-linked copy of the repository's package store in `node_modules/.pnpm`) and `branch/` (an export of `487d471`), each with `node_modules` links to its own packages, and `node_modules/` (links to `pinned/`).

## Resolution (builder, 20 October 2026)

Each fix began with a test that failed before the change, except where the table says the test was added as cover. The specs gained the rules and criteria named below.

| Finding | Fix |
| --- | --- |
| R9-M1 | The balance mode carries the balance the person confirmed (`creditNoteInput`, mode `balance`). After working the plan out, the server refuses a different balance with the new figure ("The amount owed changed while this was open: everything still owed is now £X. Check it and issue again."), and nothing is recorded. |
| R9-M2 | The tax point is worked out in one place, `taxPointOf` in `@invoica/core` (with `supplyDateOf`), and the editor, saving and issuing all use it. A service period takes both its dates or neither, in the schema and again on issue for a draft kept with one ("Enter both dates of the period, or neither."). An invoice dated in November for October is asked for, keeps and prints October's rate (sterling criterion 10; core, schema, database and end-to-end tests). Whether HMRC would take the period's end as the tax point is the rule the spec already had; it is not reopened here. |
| R9-M3 | Onboarding sent again, or twice at once, makes one business (`createFirstOrganisation` holds a lock for the user and returns the business already made), so the cookie and the business opened on another device are the same one. A switcher is left until a user can have more than one business. |
| R9-M4 | Still waiting for approval on the branch `fix/confirm-then-sign-in`, which this round rebased onto `main`. Asking for the password on the confirmation page is a further change to sign-in, so it is set out in the handover for a decision and not built. |
| R9-L1 | Migration 0022: a time zone is a place in one of the database's regions, or UTC; "Factory", "localtime", "posixrules", "CET" and the like are refused, in core and in the database (all 484 names the database guard accepts here are names the app reads). The scan offers the invoices that may have a reminder due by the database's date with a day's margin either side, and the app chooses the reminder with `todayIn` and `dueReminder`, as the invoice page does. Three businesses in Vancouver, Casablanca and London scanned every hour for five days queue exactly what the app's own date says (reminders rule 12). |
| R9-L2 | The editor sends what it worked the rate out for (`sterlingRateFor` in the draft input), so the same figure typed again for a new month or day is saved; a carried-over rate keeps its record, and one worked out by a page for another day is refused. A rate with no record is asked for again on saving and on issue ("Enter the exchange rate again: HMRC's rate for October 2026."). A save that needs no VAT in sterling keeps the rate with what it was entered for, so a later save that needs it asks again. Sterling criterion 11. |
| R9-L3 | New clients, items, tax codes and copies carry request keys, and void and delete asked again are done already. A draft saved or issued again once it is issued says so with its number ("This invoice has already been issued as INV-0007, so it can no longer be changed."). An action the server no longer knows after a new version answers "Invoica has been updated. Copy anything you typed, then reload the page." and keeps the page. An action after the session ended says the person was signed out. |
| R9-L4 | `parseMoney` refuses more places than the currency has, zeros included, so "1.500" in euros is refused again. When the client or currency of a draft changes, prices, amount discounts and deposits already typed are written for the new currency where the figure is the same ("100.00" to "100" in yen), and anything else is left for the person to correct. |
| R9-L5 | The reset, existing-account and password-changed emails greet by name only once the address is confirmed. Names may hold the zero-width non-joiner and joiner. Sign-in rule 7. |
| R9-L6 | Git and Docker ignore every `*.env` file. The migration image holds only the dependencies, the migrations and the script that applies them, and runs as `node`; CI builds it, migrates an empty database set up as the guide sets one up, and runs it again. The guide uses `sslmode=verify-full`, says pg 8 reads `require` the same way, and says where a provider's root certificate goes. |
| R9-L7 | (a) The scan journey now checks which reminder went on which day against `dueReminder`; the real-world tests check the payment and refund recorded; core properties cover the issue date of reminders and credits on an invoice with earlier notes (the property of `creditNoteSterlingVat` is in `sterling.test.ts`). (b) Migration 0023: the database refuses a payment or refund dated more than a day after its own today (refunds rule 10). (c) Large objects stay as review 8 left them. (d) A business left out of the scan is still reported only in the database's log; with migration 0022 that needs a time zone the database stops knowing. (e) On the branch, `/sign-in?confirmed=1` shows a sentence and nothing of the account; it is noted for the branch's approval. (f) CI runs the end-to-end suite against the production server as well (`e2e-production`). |
