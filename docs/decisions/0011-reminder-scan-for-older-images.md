# 0011. The reminder scan when an older image runs

- **Status:** Proposed, 20 October 2026 (review 10, R10-L6). It changes the worker role's grants, a tenancy rule, so it waits for the owner's yes. Until then `docs/deploy.md` says to stop the scheduler while migrating and while an older image runs.

## Context

The worker role reads across businesses only through `app.due_reminders`, which returns ids and an offset. Before migration 0022 the database chose the reminder due by its own reading of the date, and the app queued it as offered. From 0022 (and 0024) the database offers the invoices that may have a reminder due, three hours either side of now, and the app chooses with its own date (`todayIn`, `dueReminder`), as the invoice page does, because the database's time zone data and the app's are updated separately and can read an hour apart.

An app image from before 0022 still queues what it is offered. Against a database at 0022 or later it would send some reminders up to a few hours early, and one could go for the day before the invoice was issued. That happens between running the migration image and restarting the app, and for as long as an older image runs after going back.

## Proposal

- A new migration restores `app.due_reminders` to the contract an older app expects (the database's own date, the offset due).
- The same migration adds `app.reminder_candidates(p_now)`, with the same four columns and the three-hour window, `security definer`, granted to the worker role only.
- The app calls `app.reminder_candidates`; the tenancy test's grant snapshot gains it.

## Consequences

- Any image, older or newer, can run the scheduler against any database from then on, and the scheduler needs no stopping during an upgrade.
- The worker role can call one more function. It sees nothing it does not see today: the same ids and offsets, across businesses, inside a function it cannot change.
- Without this, the guide's steps stay: stop the scheduler before the migration image runs, start it once the new app is up, and keep it stopped while an image from before 0022 runs.
