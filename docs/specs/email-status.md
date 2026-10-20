# Emails that have not gone

An invoice is emailed, and reminded about, through the outbox: the request queues the email and a background job sends it, trying again with a growing delay when the provider is busy (eight tries over about two hours) and giving up at once when the provider refuses the address. Until now the invoice page said nothing when an email had not gone, so an owner could believe a client had their invoice when they did not.

## What the owner sees

On the invoice page, above the invoice:

- While an email waits for its first try: "Sending to accounts@client.example."
- While it is being tried again: "Sending to accounts@client.example is taking longer than usual. Invoica keeps trying for about two hours."
- When it could not be sent: "The email to accounts@client.example could not be sent. Check the address, then send it again." The invoice stays "Issued" (it is marked as sent only once an email goes).
- The same for reminders: "Sending a reminder.", "A reminder is taking longer than usual to send. Invoica keeps trying for about two hours." and "A reminder could not be sent. Check the client's email address."

## Rules

1. Every email or reminder for the invoice that is waiting or being tried again is shown.
2. Of those that could not be sent, only the latest of each kind is shown, and only while it is the latest of its kind: an email sent or queued after it clears it.
3. Only the invoice's own business sees them (the outbox's row-level security).
4. The development mailbox refuses an address at the reserved domain `.invalid` for good, as a provider refuses an address that cannot exist, so this path can be tried locally.

## Acceptance criteria

1. Rules 1 to 3: `packages/db/test/deliveries.test.ts`.
2. Rule 4: `apps/web/src/lib/email-adapters.test.ts`.
3. An invoice emailed to an address that cannot exist says so on its page, stays "Issued", and the message goes once the invoice is emailed to a good address (`apps/web/e2e/invoice-flow.spec.ts`).
