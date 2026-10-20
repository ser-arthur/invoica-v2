# Refunds

Status: built 19 October 2026 (session 2, answer 12: a refund record, no client credit balance; migration 0013). Closes review 2, R2-L5.

## The problem

Today a credit note can never be more than the balance still owed. Once an invoice is paid in full, nothing can be credited, even when the work was returned or the price was wrong and the business has paid the money back.

## What changes

A credit note on an invoice that has been paid may go above the balance still owed, by up to what the client has paid. The part above the balance is money the business gives back, so the credit note is issued together with a **refund**: the amount returned, the date, how it was paid back and an optional reference.

- **Balance owed** becomes: total, less payments, plus refunds, less credit notes. It is never below zero.
- **Received** (on the dashboard and the client page) is payments less refunds, each counted on its own date.
- **States:** "Paid", "Credited" and "Settled" keep their meanings with payments counted net of refunds. An invoice paid in full and then credited in full with the money refunded is "Credited".

## What the owner sees

- In the credit note dialog, when the credit is above the balance owed (whole invoice, lines, an amount), a section appears: "This credit note is £X more than is owed. Record the refund you have made to the client", with the amount fixed at that excess, a date (today by default), a method and a reference. The note cannot be issued without it.
- On the invoice page, under payments, each refund is listed as "Refund, 19 Oct 2026" with its method and reference, as a minus figure, linked to its credit note. The activity record says "Refund of £X recorded with CN-0007".
- "Everything still owed" is unchanged: it credits the balance, which needs no refund.
- The CSV export of payments includes refunds as rows of type "refund"; the JSON export includes the refunds table.

## Rules

1. A refund belongs to one credit note and to the invoice it credits, in the same currency. It is recorded while the credit note is a draft, in the same transaction that issues it, and is never changed or removed afterwards (the credit note cannot be voided either).
2. On issue, a credit note's refunds equal exactly the part of its total above the balance owed before it: no refund when it fits within the balance.
3. Refunds on an invoice never add up to more than its payments that have not been removed. A payment cannot be removed if the refunds would then be more than the payments left.
4. Recording a payment checks the balance with refunds counted: total less (payments less refunds) less credit notes.
5. The database enforces 1 to 4 (a new migration), as it does the existing credit and payment rules; the app checks them first so the person gets a clear message.
6. A repeated request (the dialog's key) returns the first result, as credit notes do today.
7. The request carries the refund the person confirmed. The server works the refund out again from the balance at that moment; when the two differ (a payment was recorded or removed while the dialog was open), the request is refused with the new figure, nothing is recorded, and the dialog shows the new refund to confirm.
8. A draft credit note with a refund cannot move to another invoice (migration 0017).
9. Payments, refunds and documents are written only in read committed transactions, where the guards' locks and sums hold; the database refuses them under repeatable read or serializable (migration 0017).

## Printed documents

The credit note PDF does not mention the refund: wording on a statutory document needs approval, and the credit note is correct without it. Proposed wording, for approval: "Refunded £X on 19 October 2026 by bank transfer."

## Acceptance criteria

Each becomes a test before it is built.

1. A £120.00 invoice paid in full can be credited in full with a £120.00 refund; its balance is £0.00 and its state is "Credited". Without the refund, issuing is refused.
2. Paid £100.00 of £120.00: a whole credit (£120.00) needs a refund of exactly £100.00; a refund of £99.99 or £100.01 is refused.
3. A credit within the balance owed refuses a refund.
4. After a refund, a payment that would take the balance below zero is refused, and one within the balance is accepted.
5. A payment cannot be removed if the refunds would be more than the payments left; removing it when the refunds fit is accepted.
6. A refund in another currency, for another invoice's credit note, or for an issued credit note is refused by the database; refunds cannot be updated or deleted.
7. The dashboard's received figures and the client's "Paid to date" are net of refunds, on the refund's date.
8. The invoice page lists the refund under payments and in the activity record; the CSV export lists it as a refund.
9. A refund confirmed at £60.00 is refused once the other £60.00 has been recorded meanwhile ("the refund would now be £120.00"), and one confirmed at £120.00 is refused once a £60.00 payment has been removed; nothing is recorded either time.
