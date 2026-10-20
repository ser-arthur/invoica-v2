# Reminders

Status: built 19 October 2026 (migration 0015). The narrow database function and the default wording were approved on 19 October. Reminders are the first part of "getting paid on time" (decision 0003), and a Pro and Studio feature (decision 0005): with plans enforced, the free plan has none.

## What the owner sees

- In settings, "Remind clients about unpaid invoices", off by default. When on, the owner picks when: three days before the due date, on the due date, and 7, 14 and 30 days after it. Each can be switched off.
- On each client, "Send reminders to this client", on by default, for clients who prefer a phone call.
- On each invoice, the next reminder and its date ("Reminder on 24 October"), with "Pause reminders for this invoice" and "Send a reminder now".
- In the invoice's activity, every reminder sent, with its date.

## What the client receives

An email from the business (the same sender as invoices), with the invoice's kept PDF attached and the amount still owed now, after payments and credit notes. The wording depends on the timing: before the due date it is a gentle note; after it, it says how many days late the invoice is. The owner can edit the wording in settings; the business name, invoice number, amount owed and due date are filled in.

## Rules

1. A reminder is due for an invoice when it is issued or sent, its balance is above zero, its client has an email address and reminders, the organisation has reminders on and its plan includes them, reminders for the invoice are not paused, and today, in the organisation's time zone, is the due date plus one of the chosen offsets.
2. Each offset sends at most one reminder per invoice, even if the scan runs twice or two scans overlap (a unique key per invoice and offset in the outbox).
3. A reminder never goes for an invoice that is paid, credited, settled or void by the time it is sent: the email job checks again before sending, as invoice emails do for void documents.
4. If the scan missed a day (the server was down), it sends the latest missed reminder once, never a backlog. A reminder is still sent up to six days after its date; older ones are skipped, so turning reminders on does not send a batch for old invoices.
5. "Send a reminder now" sends one at once, whatever the schedule, and does not change the schedule.
6. The amount in the email is the balance when the email is sent.
7. The wording follows the day the email is sent, not the offset that queued it: a due-date reminder caught up two days later uses the late wording, "2 days overdue".
8. No reminder goes for a day before the invoice was issued, in the organisation's time zone. An invoice issued with two days to pay gets no "three days before" reminder, and one issued after its due date waits for the next reminder after it was issued.
9. Reminders can be turned on only on a plan that includes them; they can be turned off on any plan.
10. A business's time zone is a place in one of the time zone database's regions, or UTC ("Europe/London", "Etc/GMT-14"), that the database knows; bare offsets such as "+05:30" are refused, because PostgreSQL reads them the other way round, and so are names outside a region ("CET", "Factory", "localtime"), which the app reads differently or not at all. The scan works one business at a time: a business whose date cannot be worked out is left out with a warning, a reminder that fails to queue waits for the next scan, and the jobs run even when the scan fails (the drain then answers 500).
11. The invoice page names the reminder the scan sends today when one is due and not yet sent ("Next reminder today"), and otherwise the next one to come.
12. The business date that decides which reminder is due is worked out in the app, for the scan as for the invoice page (`todayIn` and `dueReminder` in `@invoica/core`). The database's time zone data and the app's are updated separately and can read an hour apart (one business in Casablanca or Vancouver), so the database only offers the invoices that may have a reminder due by its own reading of the date three hours either side of now (`app.reminder_candidates`, migrations 0024 and 0026), and the app chooses.
13. The owner's wording may use only the placeholders Invoica fills in. Anything else in braces ("{amout}", "{Client}", "{ amount }") is refused when the settings are saved: "Invoica cannot fill in {amout}. Use {client}, {number}, {amount}, {due_date}, {days_late} or {business}.", shown under the field, so a typo never reaches a client.

## How it runs

- The host's scheduler calls `/api/jobs/drain` every few minutes with `CRON_SECRET`. It first asks `app.reminder_candidates` (as the worker role) which invoices may have a reminder due, then queues each one inside its organisation as the organisation's owner, where the plan is checked, and then runs the jobs.
- `app.reminder_candidates` is the only place the app reads across organisations, and `app.due_reminders`, kept as it was for app images from before migration 0022 (decision 0011), the only other. Each returns the organisation, the invoice, the offset and the owner's user id, nothing else, and only `invoica_worker` may call them. While it runs it sets `app.reminder_scan`; the policies that let it read are for the migration role, which owns the function, so setting the flag gives the app role nothing.
- The job checks the invoice again before sending and sends nothing if it is paid, credited, settled or void by then.

## Acceptance criteria

1. With reminders on, an invoice due on 10 October gets reminders on 7, 10, 17 and 24 October and 9 November, and none after it is paid (`packages/core/test/reminders.test.ts`, `packages/db/test/reminders.test.ts`).
2. Two scans on the same day send one reminder (`packages/db/test/reminders.test.ts`).
3. A paused invoice, a client with reminders off, a client without an email, and an organisation on the free plan get none (same file).
4. A scan after missed days sends only the latest reminder that was due (both files).
5. The email shows the balance at sending, the invoice number and the due date, and attaches the kept PDF (`apps/web/e2e/reminders.spec.ts`).
6. Each reminder appears in the invoice's activity (same file).
7. Rules 7 to 12: `packages/core/test/reminders.test.ts`, `packages/core/test/dates.test.ts`, `packages/db/test/reminders.test.ts` and `apps/web/src/app/api/jobs/drain/route.test.ts`. For rule 12, three businesses in zones whose data differ are scanned every hour for five days, and the scan queues exactly what the app's own date says is due.
8. Rule 13: `packages/core/test/reminders.test.ts`, `packages/schemas/test/schemas.test.ts` and `apps/web/e2e/reminders.spec.ts` ("reminder wording with a placeholder Invoica cannot fill in").

## Default wording

Placeholders: {client}, {number}, {amount} (owed when sent), {due_date}, {days_late} ("7 days", "1 day") and {business}. The owner can replace any of the three in Settings.

- **Before the due date.** Subject: "Reminder: invoice {number} is due on {due_date}". "Hello {client}, A reminder that invoice {number} for {amount} is due on {due_date}. The invoice is attached. If you have already paid, thank you, and please ignore this email. {business}"
- **On the day.** Subject: "Invoice {number} is due today". "Hello {client}, Invoice {number} for {amount} is due today. The invoice is attached. If you have already paid, thank you, and please ignore this email. {business}"
- **Late.** Subject: "Invoice {number} is {days_late} overdue". "Hello {client}, Invoice {number} was due on {due_date}, and {amount} is still owed, {days_late} later. The invoice is attached. Please let us know when to expect payment, or reply if something on the invoice needs looking at. {business}"

Payment links in reminders wait for a payment provider (phase 4).
