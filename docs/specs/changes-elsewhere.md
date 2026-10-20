# Records changed elsewhere

The business's settings, a client, a saved item or a tax code edited on a page opened before another tab or device changed it. Until now the later save replaced every field the form holds, so a change made elsewhere was undone without anyone knowing: bank details changed on a phone came back as they were when a laptop tab opened earlier saved the business name, and every invoice after that printed the old account. Drafts already work this way (`docs/specs/issuing.md`, rule 7).

## What the owner sees

A save from a page that is out of date, which would change what is stored, is refused and nothing is saved. The form says:

- Settings: "These settings were changed in another tab or on another device after this page opened. The page now shows those changes, except in the fields you changed here. Check them, then save yours anyway."
- A client: "This client was changed in another tab or on another device after this page opened. The form now shows those changes, except in the fields you changed here. Check them, then save yours anyway."
- A saved item: "This item was changed in another tab or on another device after this page opened. The form now shows those changes, except in the fields you changed here. Check them, then save yours anyway."
- A tax code: "This tax code was changed in another tab or on another device after this page opened. Save yours anyway to replace the changes, or close this and open it again to see them."

Straight after the refusal, the page fetches the record again. On the settings, a client's form and a saved item's form, each field not changed here then shows the change made elsewhere, and what was typed stays (nested details, such as the bank account, field by field). A "Save mine anyway" button beside the message saves what the form now shows: the fields typed here replace the other change, and the others keep it. A tax code's form keeps what it showed, and "Save mine anyway" replaces the other change.

## Rules

1. Each form carries the version of what it shows: a digest of the fields it edits, as stored when the page was made (`profileVersion`, `clientVersion`, `itemVersion`, `taxCodeVersion` in `packages/db/src/versions.ts`). A client's version includes its extra fields.
2. A save is refused when the stored version differs from the form's and the save would change what is stored. It changes nothing.
3. A save that would change nothing that is stored (the same change made elsewhere, or a repeat after a lost answer) is accepted.
4. Changes elsewhere to what the form does not edit never refuse it: reminder settings and the logo for the settings form, archiving for a client.
5. Each save answers with the new version, which the form keeps, so saving twice from one page is never refused.
6. After a refusal the page fetches the record's version again, and "Save mine anyway" saves against that version, so a change made after the refusal is caught too.
7. Making another tax code the default changes this one (it is no longer the default), so a page that still shows this one as the default is refused.
8. After a refusal, the settings, a client's form and a saved item's form show the record as it is now in each field not changed on the page (`followUntouched`, `apps/web/src/lib/follow-untouched.ts`), selects, notes, checkboxes and extra details included, however the form was opened. An empty field and one stored as nothing count as the same, and details missing when the page opened (a business with no bank details yet) are followed field by field.
9. A tax code archived in another tab or on another device cannot be changed or made the default from a page opened before: "This tax code was archived in another tab or on another device, so it can no longer be changed."

## Acceptance criteria

1. Rules 1 to 5, 7 and 9 for each of the four: `packages/db/test/changes-elsewhere.test.ts`.
2. Settings changed in another tab: the save from the earlier tab is refused with the message, the other tab's change is kept, and "Save mine anyway" then saves (`apps/web/e2e/connected-changes.spec.ts`, "settings changed in another tab").
3. A client changed in another tab, its form opened from the client's page: the same, with the currency and the notes followed (`apps/web/e2e/connected-changes.spec.ts`, "a client changed in another tab"); a saved item whose price changed in another tab: the editor opened before shows the new price after the refusal and keeps it ("a saved item changed in another tab").
4. Saving settings twice from one page, with reminder settings saved in between, is never refused (`apps/web/e2e/connected-changes.spec.ts`, "settings changed in another tab").
5. Rule 8: `apps/web/src/lib/follow-untouched.test.ts`; in both end-to-end tests above, the field changed elsewhere and not typed in shows the new value after the refusal, and both changes are kept after "Save mine anyway".
