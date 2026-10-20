# Issuing an invoice

How a draft becomes an issued invoice, and what holds when the world around it changes while the editor is open.

## Rules

1. Issuing saves the draft as the editor shows it and issues it in one transaction: either both happen or neither does.
2. The invoice takes the next number in its series at issue, inside that transaction, so numbers have no gaps (`number_counter`).
3. The snapshot is taken at issue from the records as they are then: the business, the client, the tax codes and the settings. Later edits to any of them never change an issued invoice.
4. The request carries the total the person confirmed. The server works the total out again from the records as they are; when another tab or device changed a tax rate or a setting meanwhile, the total differs and nothing is saved or issued. The editor says "The total changed while this was open: it is now £110.00, with the tax rates and settings as they are now. Check it and issue again.", fetches the current tax codes and settings, and shows the new total to confirm.
5. A draft saved or issued again once it is issued (a lost answer tried again, or a page opened before it was issued elsewhere) is refused with its number: "This invoice has already been issued as INV-0007, so it can no longer be changed."
6. A new invoice issued again with the same request key returns the invoice the first request issued.
7. A draft saved or issued from a page opened before another tab or device changed it is refused: "This draft has changed since this page last saved it: in another tab, on another device, or by a save from here whose answer did not arrive. Save yours anyway to replace it, or reload the page to see it." The editor keeps what was typed, fetches the draft's version again, and offers "Save mine anyway", which saves against that version (so a change made after the refusal is caught too), or "Issue mine anyway", which asks for confirmation again with the total as it is now. Each save carries the version the page has (`draftVersion`), and the editor takes the new version after each of its own saves. The repeat of a new invoice's first save (its answer lost) is refused the same way once the draft has been changed since it was made.
8. A draft deleted in another tab or on another device, then saved or issued from a page still open on it, is refused: "This draft was deleted in another tab or on another device. Save what you typed as a new draft to keep it." The editor keeps what was typed and offers "Save as a new draft", which saves it as a new draft with a request key of its own (so a repeat after a lost answer makes one draft) and opens it.
9. A copy of an invoice ("Duplicate") is a new draft priced as one made now: each line takes its tax code as it is now, so a rate changed since the source was issued is the one the copy shows, lists and is issued with; the business's rounding is the one set now. An archived code stays on the copied line, marked archived in the editor.

## Acceptance criteria

1. Rules 1 to 3: `packages/db/test/documents.test.ts`, `apps/web/e2e/connected-changes.spec.ts` ("a client and the business changed after issuing").
2. Rule 4: a total other than the one confirmed is refused with the new figure and the draft stays a draft (`packages/db/test/documents.test.ts`); a tax rate changed in another tab shows the new total to confirm, and the invoice is issued with it (`apps/web/e2e/connected-changes.spec.ts`).
3. Rules 5 and 6: `packages/db/test/request-keys.test.ts`, `apps/web/e2e/connection.spec.ts`.
4. Rule 7: `packages/db/test/documents.test.ts`, `apps/web/e2e/connected-changes.spec.ts` ("a draft changed in another tab is not replaced without asking").
5. Rule 8: `packages/db/test/changes-elsewhere.test.ts` ("a draft deleted elsewhere"), `apps/web/e2e/connected-changes.spec.ts` ("a draft deleted in another tab").
6. Rule 9: `packages/db/test/changes-elsewhere.test.ts` ("a copy of an invoice made after a tax rate changed").
