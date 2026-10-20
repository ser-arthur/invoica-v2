# Issuing an invoice

How a draft becomes an issued invoice, and what holds when the world around it changes while the editor is open.

## Rules

1. Issuing saves the draft as the editor shows it and issues it in one transaction: either both happen or neither does.
2. The invoice takes the next number in its series at issue, inside that transaction, so numbers have no gaps (`number_counter`).
3. The snapshot is taken at issue from the records as they are then: the business, the client, the tax codes and the settings. Later edits to any of them never change an issued invoice.
4. The request carries the total the person confirmed. The server works the total out again from the records as they are; when another tab or device changed a tax rate or a setting meanwhile, the total differs and nothing is saved or issued. The editor says "The total changed while this was open: it is now £110.00, with the tax rates and settings as they are now. Check it and issue again.", fetches the current tax codes and settings, and shows the new total to confirm.
5. A draft saved or issued again once it is issued (a lost answer tried again, or a page opened before it was issued elsewhere) is refused with its number: "This invoice has already been issued as INV-0007, so it can no longer be changed."
6. A new invoice issued again with the same request key returns the invoice the first request issued.

## Acceptance criteria

1. Rules 1 to 3: `packages/db/test/documents.test.ts`, `apps/web/e2e/connected-changes.spec.ts` ("a client and the business changed after issuing").
2. Rule 4: a total other than the one confirmed is refused with the new figure and the draft stays a draft (`packages/db/test/documents.test.ts`); a tax rate changed in another tab shows the new total to confirm, and the invoice is issued with it (`apps/web/e2e/connected-changes.spec.ts`).
3. Rules 5 and 6: `packages/db/test/request-keys.test.ts`, `apps/web/e2e/connection.spec.ts`.
