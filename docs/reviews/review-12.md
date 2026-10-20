# Invoica: independent review of the afternoon of 20 October (review 12)

Reviewer: a separate agent, acting as an independent reviewer. It did not write this code and changed no file in the repository.

Date: 20 October 2026.

## Scope

Every commit after `4c5a66a` up to `14bd444`:

- records changed elsewhere (`packages/db/src/versions.ts`, `apps/web/src/lib/follow-untouched.ts` and the settings, client, item and tax code forms; `docs/specs/changes-elsewhere.md`);
- a password reset confirming the address;
- the leave guard (`apps/web/src/components/leave-guard.tsx`; `docs/specs/unsaved-changes.md`);
- items keeping an archived tax code;
- reminder placeholders;
- a draft deleted elsewhere saved as a new draft;
- a copy of an invoice taking its tax codes as they are now;
- typing kept on this device (`apps/web/src/lib/kept-typing.ts`; `docs/specs/kept-on-this-device.md`).

The reviewer ran the web unit tests (81 of 81 passed), the database tests for records changed elsewhere, clients and request keys (24 of 24 passed) and the copy check (passed), and wrote scratch scripts under the session's scratch folder (`review12/`). It did not build or serve the app, and ran no browser test.

## Findings

| Id | Severity | Finding |
| --- | --- | --- |
| R12-H1 | High | The client and item forms said, after a refusal, that they showed the change made elsewhere in every field not typed in. They were uncontrolled, and React 19 updates such a field from a new default value only in some cases (a server-rendered text input), never a select, a textarea or a checkbox, and never in a form mounted in the browser. The item editor always mounts in the browser, so no field followed; the client form opened with its Edit link followed none. "Save mine anyway" then put back the older values, for example an item's old price. Confirmed with jsdom and React 19.3.1. |
| R12-M1 | Medium | A kept new invoice did not keep the request key of its first save. Issued just before the page closed, its answer lost, then brought back and issued again, it made a second invoice for the same work. |
| R12-M2 | Medium | `followUntouched` treated a field cleared on the page ('') as typed in when the server stored nothing (null), and a detail missing when the page opened (a new business's empty bank details) as one typed value, so changes elsewhere to those fields were not followed and "Save mine anyway" could clear them. |
| R12-L1 | Low to medium | An archived tax code could be changed, and made the default, from a page opened before it was archived; the business's new lines then started with no tax code. |
| R12-L2 | Low | The export links on the settings page asked "Leave this page?" with changes not saved; leaving downloaded the file, the page stayed, and the guard stayed off for the rest of the page's life. |
| R12-L3 | Low | Typing while a save was on its way was marked as saved when the save answered (settings and the invoice editor). Other ways to leave without a prompt: the browser's back button, signing out, opening another item on the items page, the tax code editor. |
| R12-L4 | Low | Kept typing: typing while an earlier copy was offered was not kept; copies for drafts deleted or issued elsewhere were never removed; the time offered had no year; a copy in an older shape could be brought back into a newer editor. |
| R12-L5 | Low | Two comments described history ("applied as before", "works as before"). |

Checked and found sound: the version a page shows always equals the version a save computes for the same stored data; every save path from the app passes its version; row locks have no cycle with issuing, number checks, items or reminder and logo writes; the settings form's adjustment while rendering cannot loop; several guards on one page open one dialog; kept copies are keyed per person and business and are shown only after the page has started; a deleted draft's save and issue both answer `draft_deleted`; a password reset cannot confirm an address without the mailbox.

## Resolution (builder, 20 October 2026)

| Id | Resolution |
| --- | --- |
| R12-H1 | The client and item forms hold what they show in state and follow changes with `followUntouched`, as the settings form does, for every field (selects, notes, checkboxes and extra details included), however they were opened. End to end: the client form opened from its Edit link follows the email, the currency and the notes changed in another tab; the item editor opened before shows the new price after the refusal and keeps it. Both tests failed on the build before the change. The client form also keeps a client's phone number, which it has no field for and used to clear. |
| R12-M1 | A kept new invoice keeps the request key of its first save and brings it back with the copy. End to end: an issue whose answer is lost, then the page closed, brought back and issued again, gives the same INV-0001 (this test issued INV-0002 before the change). |
| R12-M2 | An empty field and one stored as nothing count as the same, and missing details are followed field by field (unit tests). |
| R12-L1 | An archived tax code is refused: "This tax code was archived in another tab or on another device, so it can no longer be changed." (database test), and the list is fetched again. |
| R12-L2 | The export links download their file, so they never ask. |
| R12-L3 | A save answered after more typing leaves that typing marked as not saved, and kept, in the settings and on a draft that stays open. The other ways to leave without a prompt are left as they are: the browser's back button cannot be asked about reliably, signing out is a choice to leave, and the items page and the tax code editor hold a few fields each. |
| R12-L4 | Typing is kept while an earlier copy is offered, and "Discard it" keeps what was typed since; copies older than thirty days are removed when the editor opens; the time offered has its year; a copy without the current shape is not offered. |
| R12-L5 | The comments describe what the code does now. |
