# Reminders (proposal, phase 4)

Status: proposed, not built. Reminders are the first part of "getting paid on time", the promise after v1 (decision 0003), and a Pro and Studio feature (decision 0005). Building them needs two answers from Kobby, listed at the end.

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
4. If the scan missed a day (the server was down), it sends the latest missed reminder once, never a backlog.
5. "Send a reminder now" sends one at once, whatever the schedule, and does not change the schedule.
6. The amount in the email is the balance when the email is sent.

## Acceptance criteria

Each becomes a test before it is built.

1. With reminders on, an invoice due on 10 October gets reminders on 7, 10, 17 and 24 October and 9 November, and none after it is paid.
2. Two scans on the same day send one reminder.
3. A paused invoice, a client with reminders off, a client without an email, and an organisation on the free plan get none.
4. A scan after three missed days sends only the latest reminder that was due.
5. The email shows the balance at sending, the invoice number and the due date, and attaches the kept PDF.
6. Each reminder appears in the invoice's activity.

## Questions for Kobby

1. **Finding due reminders across businesses.** The scan runs on a schedule, outside any signed-in session, and must find due invoices in every organisation. Today every query runs as one organisation under row-level security. The proposal is one narrow database function, owned by the database owner, that returns only the invoice ids and organisation ids with a reminder due today, so the scan can then work inside each organisation as usual. It changes tenancy rules, so it needs approval (CLAUDE.md, "Ask first").
2. **Wording.** Approve the default wording of the three kinds of reminder (before due, on the day, late), or supply it.
3. **Payment links.** A link in the reminder to pay by card needs a payment provider (Stripe, say). Adding a dependency that handles money is ask-first; this proposal leaves payment links out until that is decided.
