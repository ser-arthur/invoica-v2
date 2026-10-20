# Changes not saved

Leaving a page with changes that are not saved asks first. The invoice editor did this already; the settings (business details and reminders), a client's form and a saved item's form now do too. The settings page is long and its save button sits at the foot of the screen, so a change typed and then left behind was easy to lose without knowing.

## What the owner sees

- Following a link to another page of the app opens "Leave this page?" ("Leave this invoice?" in the editor): "It has changes that are not saved. Leaving now loses them." with "Leave without saving" and "Keep editing".
- Closing or reloading the tab asks the browser's own question.

## Rules

1. A form counts as changed from the first change typed or chosen in it until it is saved (`useLeaveGuard` in `apps/web/src/components/leave-guard.tsx`). The reminder settings count as changed while they differ from what was last saved.
2. "Keep editing" leaves everything as it was; "Leave without saving" goes where the link pointed and saves nothing.
3. A link to the same page, a link that opens a new tab, a download and a link held with a modifier key never ask.
4. Once saved, the page is left without asking.
5. The client form inside the invoice editor (adding a client while writing an invoice) leaves the asking to the editor.

## Acceptance criteria

1. The invoice editor: `apps/web/e2e/connected-changes.spec.ts`, "leaving an invoice with changes not saved asks first, from any link".
2. The settings, the reminder settings and a client's form: `apps/web/e2e/connected-changes.spec.ts`, "leaving the settings or a client with changes not saved asks first".
