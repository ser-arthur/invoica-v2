# Typing kept on this device

An invoice typed in the editor and not yet saved is kept on the device it is typed on until it is saved. Phones close a page in the background to free memory (switching to the banking app to check a payment is enough), and a browser or laptop can stop without warning; the page then opens again empty, and what was typed was lost. Closing the tab still asks first (`docs/specs/unsaved-changes.md`); this covers the times nothing can ask.

## What the owner sees

Opening the editor again, on the same device, for the same new invoice or draft, shows above the editor: "This device kept an invoice you were typing at 14:32 on 20 October, which was not saved." with "Bring it back" and "Discard it". Bringing it back puts every field as it was typed; nothing is saved until the owner saves. Discarding removes the kept copy.

## Rules

1. While the editor has changes not saved, what it holds is kept in the browser's own storage on this device, under the person, the business and the invoice (a new invoice has one place of its own), a moment after each change, also while an earlier copy is being offered.
2. Saving or issuing removes the kept copy, and so does leaving without saving through "Leave without saving", "Discard it", and signing out (which removes every copy kept on this device, so a shared computer keeps nothing after sign-out).
3. A kept copy of a draft remembers the draft's version it was typed against. Brought back and saved, it is checked against that version, so a change made to the draft elsewhere since is not replaced without asking (`docs/specs/issuing.md`, rule 7).
4. A kept copy that matches the page as opened is not offered, nor is one kept by an earlier version of the app in another shape. Copies older than thirty days (such as one for a draft deleted or issued elsewhere since) are removed when the editor opens.
5. Tabs on one device share the copy kept for an invoice: the latest typing in any of them is the one kept, and a save from any of them removes it.
6. Nothing is kept or offered when the browser's storage cannot be used (a private window that refuses it, or storage switched off); the editor works as before.
7. A kept new invoice keeps the request key of its first save. Saved or issued just before the page closed, its answer lost, and then brought back and saved or issued again, it is the same invoice (`docs/specs/issuing.md`, rule 6).
8. "Discard it" removes the offered copy, unless something has been typed since, which stays kept.
9. Typing while a save of a draft is on its way stays marked as not saved, and kept.

## Acceptance criteria

1. A new invoice typed, then the page closed and opened again, offers it back; brought back, every field is as typed, and it saves (`apps/web/e2e/kept-on-this-device.spec.ts`).
2. A draft edited, then opened again, offers the edit back; "Discard it" shows the draft as saved, and nothing is offered after that (same file).
3. Saved, nothing is offered when the page opens again; signed out and in again, nothing is offered (same file).
4. A kept edit of a draft changed on another device since, brought back and saved, is refused with the changed-draft message (same file).
5. A new invoice issued just before the page closed, its answer lost, is not issued twice when brought back (same file).
