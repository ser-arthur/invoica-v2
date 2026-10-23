# Handover

Read `docs/BLUEPRINT.md` first, then this file. Update both at the end of every session.

## Current state (20 October 2026, about 19:00)

This is the **v2 repository**: a re-architecture from scratch (decision 0001). The old Flask app lives in the old repository (`ser-arthur/invoica`) as a reference and receives no changes.

**Working end to end, locally:** sign up with email confirmation (the link asks for the account's password), password reset, onboarding, settings (business, logo, tax, rounding choices allowed for the country, numbering, brand colour, template with live previews, bank and mobile money, tax codes with the country's standard codes on a button, reminders, the rate method for VAT in sterling), clients, saved items, the invoice editor with live totals and preview, issuing with a gapless number and a frozen snapshot, the kept PDF in seven templates, sending by email through the outbox (Resend in production, a development mailbox locally), payments, credit notes of every kind with refunds when they go above the balance, VAT in sterling on UK VAT invoices in other currencies, reminders on a schedule and on demand, voiding, duplicating, quick actions, client pages, a dashboard that names who to chase first, data export, the trial and free plan behind `INVOICA_PLANS=enforced` (off: everyone has everything, which is the free version), a health check and a container image.

**Checks (last full run, 20 October 2026, about 19:00, on `11f8bb3`):**

| Suite | Count | Result |
| --- | --- | --- |
| Core (money, tax, totals, the credit ledger, refunds, VAT in sterling with its credit note ledger and tax point, reminders, dates and time zones, plans, property tests) | 249 | pass |
| Database (tenancy with exact policy and grant snapshots, immutability, numbering, payments, refunds, credit notes, review guards, reminders with an hourly scan across time zones, a stubbed scan and the scan an older image calls, emails not sent, request keys and corrected repeats, draft versions, settings, clients, items and tax codes changed elsewhere, the business's currency and saved items, the worker role, journeys against a reference model, operations at the same moment, edge cases) | 234 | pass |
| Schemas | 6 | pass |
| Document view and rendering | 28 | pass |
| PDF | 64 | pass |
| Web unit (settings check, connection handling, action results, sender names and reply addresses, sign-up names, sign-in emails, confirmation links and tokens, forms following changes made elsewhere, the development mailbox, drain route, CSV, ids, paging, secrets) | 83 | pass |
| End to end, desktop and phone, against the production build run from a copy elsewhere with production settings, including a business's first weeks in one go (`e2e/full-journey.spec.ts`) | 174 | 113 passed, 61 skipped by design (one width only), 0 failed |
| Format, copy rules, lint, typecheck, production build | | pass |

664 unit and database tests run, 664 passed, 0 failed, 0 skipped.

**23 October, about 04:00, on `feat/website`:** 668 unit and database tests run, 668 passed, 0 failed, 0 skipped (core 249, schemas 6, documents 28, PDF 64, database 234, web unit 87); format, copy rules, lint, typecheck and the production build pass. The website spec passed against the development server at both widths. The accessibility spec found one thing on the home page (the ledger numbers' contrast), now fixed, and its desktop tests pass against the production build; the full end-to-end suite against the production build, run from a copy elsewhere with production settings, then ran 184 tests: 121 passed, 63 skipped by design (one width only), 0 failed. The journeys suite runs 40 random journeys by default; `JOURNEY_RUNS=1000` ran clean this morning and `JOURNEY_RUNS=600` again this evening.

**Running the end-to-end suite.** Against the development server: `pnpm dev`, then `E2E_BASE_URL=http://localhost:3000 pnpm test:e2e`. Against a production build: `pnpm build`, start `apps/web/.next/standalone/apps/web/server.js` with `NODE_ENV=production`, `BETTER_AUTH_URL=http://localhost:3100`, `EMAIL_PROVIDER=file`, `MAILBOX_DIR`, `FILE_STORAGE_DIR`, `CRON_SECRET` and `INVOICA_CLIENT_IP_HEADER=x-forwarded-for` (the suite gives each sign-up its own address in that header, so the sign-up limit holds), then run the suite with `E2E_BASE_URL=http://localhost:3100`, the same `MAILBOX_DIR` and the same `CRON_SECRET` (its value, without quotes: the drain tests send it). If the development server reloads a page over and over after a change to `next.config.ts`, stop it, delete `apps/web/.next/dev` and start it again. Editing files while the suite runs against the development server makes tests fail at random; run it against a production build to keep working meanwhile.

**Production readiness.** `docs/deploy.md` is the runbook for decision 0010: the domain and Cloudflare tunnel, the database roles, Resend, the server, a settings file per container, the first start, upgrades and backups. A production server checks its settings when it starts and stops with a list of what to fix. `/api/health` answers whether the database is reachable. The container image cannot be built here (Docker Hub is blocked); CI builds both images on every commit and runs the migration image against an empty database (job `image`), and runs the end-to-end suite against the production server as well as the development server (jobs `e2e-production` and `e2e`). CI on GitHub has not run yet (no access).

**Waiting for approval:** nothing built is waiting. The owner approved the three open items at 13:50 on 20 October; they are on `main` (below). Open questions are in the blueprint.

**Reviews:** reviews 1 to 12 (`docs/reviews/`), each with a Resolution section mapping findings to fixes and tests.

**Local databases:** `invoica` (manual testing), `invoica_demo` (seeded; the end-to-end tests against the development server also write into it) and `invoica_prodcheck` (for the production build's runs), all at migration 0026. Migrations that have run are never edited: changes go in a new one.

## Delivery method

The v2 repository is delivered as a **git bundle in a numbered zip** (`invoica-repo-NN.zip`) until GitHub is linked. Each zip holds `invoica.bundle` (the full history), `VERIFY.md` and `verify.sh`.

**The history was rewritten on 19 October 2026** (author, shorter messages), before any push. A clone made from bundle 08 or earlier cannot pull later bundles: make a new clone.

To set up the first time:

```
unzip invoica-repo-19.zip -d ~/Downloads/invoica-repo-19
git clone ~/Downloads/invoica-repo-19/invoica.bundle invoica
cd invoica
sh ~/Downloads/invoica-repo-19/verify.sh
```

To take a later bundle into an existing clone: `git pull ~/Downloads/invoica-repo-NN/invoica.bundle main`.

The switch to pull requests (foundation section 7) waits on GitHub: the owner connects GitHub in Settings, Connectors, and creates an empty private repository. The history is then pushed as a branch `start`, which the owner renames to `main` (the assistant never pushes to `main`). From then on every change arrives as a pull request.

## What changed last

23 October 2026, about 13:55 to 14:30, `feat/website`:
- Sign in and sign up: the Night panel is half the page and the headline fills its width at any width (container query units in `app/(auth)/auth.module.css`); the facts grow a little with it.
- Footer logo: the foil edge is drawn faint, and lit; the lit edge wipes in from the i to the a as the footer comes into view, a glint at its front; with a mouse the glint then follows the pointer (`components/site/footer-light.tsx`) and drifts back when it leaves.
- Found while building it: scroll-linked motion inside a container with `overflow: hidden` followed that container's scroll, which never moves, so the tilted sheet's turn, the step pictures' drift and the footer's rise had been frozen. Those containers now clip with `overflow: clip`; `e2e/motion.spec.ts` checks every scroll-linked animation on the public pages follows the page's scroll (it failed before the change).
- Commit authorship: every commit carried the wrong name and email, so GitHub credited another account and Vercel blocked a deploy. The whole history now carries the owner's own identity, Kobby S. Arthur <kobbyarthur95@gmail.com> (code, messages and dates unchanged; commit ids changed, and the ids quoted in these docs were updated to match), and the repository is set to commit as him.
- Checks: 677 unit and database tests pass; format, copy rules, lint, types and the build pass; the full end-to-end suite against the production build ran 220 tests: 152 passed, 68 skipped by design, 0 failed. The new motion check failed against the old styles first.

23 October 2026, about 13:00 to 13:50, `feat/website`:
- Footer logo: option E from the canvas's "Footer logo" page (`docs/design/direction-6/footer-marks.py` draws all six): dark letters with a thin holographic edge where their tops catch the light, never inside the o, c, v or a; a sheen runs along the edge as the footer comes into view and comes to rest over the o; the letters fade into the foot of the page part way down, a little higher than on the canvas, at the owner's word (`components/site/footer-mark.tsx`).
- Hero and sign-in crease: the hairline beside the line is now square to it (`hairlineShift` in `fold.ts`, with a unit test), so the two end together; before, it was moved sideways and each line ran past the other at one end. Both now fade out at their ends.
- Checks: 677 unit and database tests pass (web unit 96); format, copy rules, lint, types and the build pass; the site, not-found, pricing and accessibility end-to-end specs against the production build ran 58: 52 passed, 6 skipped by design, 0 failed.

23 October 2026, about 12:30, `feat/website` (the owner's notes on bundle 19, and his answers on launch):
- Decision 0013: the founding offer is off the pricing page (made in the app at the end of the trial, with billing); the question on Ghana and Nigeria stays, in the present tense. Built for launch: the site goes live only with billing.
- Not-found page (`app/not-found.tsx`, `docs/specs/not-found-page.md`): any address with no page answers 404 in the site's look, with an envelope stamped "Return to sender, address not known"; each planned page (`components/site/planned-pages.ts`, linked from the footer through `links.ts`) answers 404 with its own notice, stamped "Coming soon". The proxy passes the address to the page in `x-invoica-path`; the address is never shown. A unit test fails if a planned page and a built page share an address.
- Public pages (home, pricing, not-found) use `isSignedIn()`, which treats a failed lookup as signed out, so the site shows even when the database cannot be reached. Signed in, the site header leads to the dashboard.
- Hero: on load the two sides of the headline come in from opposite directions, each cut along the crease, and meet as the crease draws; the closing comma's tip is no longer cut off by its finish (lines padded on the right too); the grey past the crease is lighter (#838A94 to #6F7682; the lightest stop stays at 3:1 on Mist).
- Phones: at rest slightly fanned; as the band scrolls in they come from either side, turned, and settle together, then part a little as it leaves (one timeline on the pair); with a mouse, the phone under the pointer comes to the front.
- Footer: the large logo is a solid block with depth, lit from above (`components/site/footer-mark.tsx`, from the logo's own shapes), and rises on its container's timeline so it is fully risen at the end of the page.
- Checks: 675 unit and database tests run, 675 passed, 0 failed, 0 skipped (core 249, schemas 6, documents 28, PDF 64, database 234, web unit 94); format, copy rules, lint, types and the production build pass. The new end-to-end checks failed against bundle 19 first; the site, pricing, not-found and public accessibility checks pass at both widths. The full suite against the production build, run from a copy elsewhere with production settings, ran 218 tests: 151 passed, 67 skipped by design (one width only), 0 failed (finished just after bundle 20 was made).
- The site runs with no database reachable (checked with a production build pointed at a closed port): home, pricing, sign-in, sign-up and the not-found pages all show; only actions that need the database fail.
- Not changed: the old app at `invoica-io.vercel.app` (repository `ser-arthur/invoica`). The owner asked to push v2 to main to show it there; held, because that address serves the live old app. Options sent: a separate Vercel project for v2 (recommended), replacing the old app only if nobody uses it, or a temporary link from his Mac.

23 October 2026, about 07:30, `feat/website`, worked through while the owner slept (his notes on bundle 18):
- Hero: the shorter crease is back (`components/site/crease.tsx`, geometry in `fold.ts`, checked at eight widths); past it the words fade to slate grey (#838A94 to #5A6170, the lightest stop 3:1 on Mist). The heading is clipped to the near side so no dark edge shows around the grey letters.
- Step numerals no longer lose their tops: anything with a gradient clipped to its text is padded past its line box.
- Header: stays at the top on a frosted ground; on narrow screens its links fold into a menu (a disclosure, no script needed).
- Footer: its top logo is gone; the large logo at the foot is the only one.
- What you get: the itemised invoice is stamped "Free for 30 days, no card needed" and links to the new pricing page.
- `/pricing` (`components/site/pricing.tsx`, `plans.ts`, `docs/specs/pricing-page.md`): the trial first, Free, Pro and Studio from decision 0005 with a monthly and yearly switch that works without script, what every plan includes, questions, and payment links, several businesses and people marked coming soon. It describes the plans at launch; today plans are not enforced and billing is not built.
- Sign in and sign up (`app/(auth)/layout.tsx`): a Night panel with the crease and three facts beside the form on wide screens; the app's tokens are set to the site's light palette inside these pages. Wording and behaviour unchanged.
- Motion (`site.module.css`, "Motion"; `components/site/tilt.tsx`): the hero once on load; cards lean towards a mouse pointer; pieces drift with the scroll; a route line through the steps fills lime to teal; the template fan opens on hover or, on touch screens, as it scrolls in; the stamps press on; the footer logo rises. Nothing is ever hidden by it, it stops for reduced motion, and the end-to-end tests run with reduced motion so they measure the page at rest.
- Templates: "Try it with your business" redraws the invoice in front with the visitor's name, colour and layout, in the browser, with the documents package (`components/site/template-demo.tsx`).
- Checks: 668 unit and database tests pass; format, copy rules, lint, types and the build pass; the full end-to-end suite against the production build ran 206 tests: 141 passed, 65 skipped by design, 0 failed. The site's own checks (and the public pages' accessibility check) run with reduced motion, so they measure the page at rest; the app's checks run as before. Every new check failed against bundle 18 first.

23 October 2026, about 05:30, `feat/website`, after the owner looked at bundle 17 locally:
- Hero: the fold runs from the top right corner of the screen, under the header's hairline, down past the left edge, always through the same point of the headline (`components/site/fold.ts`, read by the styles and by `e2e/website.spec.ts`, which checks at eight widths that it crosses the headline and clears everything else). Words past it are grey. One-sentence statement; the notes became two facts with green labels.
- New "Why Invoica" section (`components/site/pillars.tsx`): your identity, financial clarity, client management. The steps open with "How it works" in the same manner.
- Phones on a full-width lime band with slanted edges, drawn as modern phones (metal edge, bezel, camera cut-out, side keys) over new captures with a status bar and home indicator; the greeting on those screens is lighter than the logo, which the app's own dashboard should follow when it is rebuilt.
- Footer on Night: link columns with the planned pages (`/about`, `/contact`, `/help`, `/help/getting-started`, `/privacy`, `/terms`, `/cookies`, which open the not-found page until they exist), and the logo set large at the foot.
- The page is now one component per section under `components/site/`.
- Checks: 668 unit and database tests pass; format, copy rules, lint, types and the build pass; the full end-to-end suite against the production build ran 188 tests: 124 passed, 64 skipped by design (one width only), 0 failed. The last change (the hero stacking below 1180 pixels) came after that run; the fold test passed on it at all eight widths.

23 October 2026, early morning, branch `feat/website` (from `chore/design-direction-1`): the website, built from round 5 and the owner's notes on it (`docs/specs/website.md`).
- The logo is in the app (decision 0012): `components/logo.tsx` with path data from `docs/design/direction-5/logo-svg.py`; `Wordmark` draws it, so the app bar, sign-in, onboarding and the not-found page all carry it. New `icon.svg`, `favicon.ico` and `apple-icon.png`, the slip i on Night.
- The home page is rebuilt (`app/page.tsx`, `components/site/`): the crease headline (a lime to teal line; past it the words turn green), folded slabs charting an example studio's money in, the app on a tilted sheet with its corner turned, five numbered steps on tinted panels, the owed card drawn as in the app, three real invoices in different layouts, light and dark phones, and the details as line items on an invoice whose tear-off slip is the sign-up. The copy tells one story: look established from the first invoice, then follow every invoice until it is paid.
- The slip's email arrives filled in on the sign-up form (`lib/prefill-email.ts`); anything that is not one plausible address is ignored.
- Pictures of the app on the page are WebP captures of the round 5 canvas, under `components/site/images/`, made by `docs/design/direction-5/site-shots.js` and `site-images.py` from the canvas's files.
- Pricing on the page follows decision 0005: 30 days of everything with no card, then up to three clients free.
- Local setup today: Postgres had lost its databases. Recreated with a local superuser `root` (peer and password login) as the admin connection, since `postgres` has no password here; `.env.local` points at `localhost:5432/invoica`.

22 October 2026, late evening: design direction, round 3, on the canvas's "Round 3" page (`docs/design/direction-round-3.md`): the guilloché pattern, three options for a mark (the seal recommended), the money bar on the dashboard, status labels and the invoice tracker, glass only with data, and the website on one grid at both widths. Later that evening he chose the name alone as the logo, dropped the coils and picked the turned page as the artefact; a study of the sheet is on the "Round 4" page. He then asked for the fold inside the wordmark: after he found the first drawing weak, the folded v was redrawn from his reference as exact vector (board "The folded v"). He then asked to explore the i as the document: four versions on the board "The i as a document" (the page in flight recommended), He chose D, the slip, on the first i only with the second dot dark. Round 5 (`docs/design/direction-round-5.md`, page "Round 5") redraws the website and every app screen with it: the crease, folded slabs that chart money in, the details as an invoice with a tear-off slip, and the sheet in place of the coils. Earlier that evening: round 2, on the "Round 2" page (`docs/design/direction-round-2.md`), after the owner approved the colours and asked for meaning in place of the cubes. Earlier that day: design direction, round 1, on the design canvas for the owner's review (`docs/design/direction-round-1.md`; the artwork's generator is `docs/design/direction-1/iso.py`). No code changed; the app moves to it screen by screen once he says yes.

Evening of 20 October 2026, after bundle 15:
- A draft deleted in another tab can be saved again as a new draft from the editor still open on it (`docs/specs/issuing.md`, rule 8).
- A copy of an invoice takes its tax codes as they are now (rule 9).
- An invoice typed and not saved is kept on this device and offered back after a phone closes the page or the browser stops (`docs/specs/kept-on-this-device.md`); signing out removes it.
- Payment and refund dates follow the day when a page stays open past midnight.
- A saved item fills an empty line.
- The note after issuing goes once the invoice is sent or paid.
- `e2e/full-journey.spec.ts` runs a business's first weeks in one go at both widths (sign-up, settings, clients, a saved item, drafts, issuing, email, payments to paid, a credit note, a reminder, the export) and checks the figures agree on the invoice, the list, the client's page, the dashboard and the export; with `JOURNEY_SHOTS` set it keeps a screenshot of each step.
- Review 12 (`docs/reviews/review-12.md`) found that the client and item forms did not show changes made elsewhere as they said (high), that a kept new invoice could be issued twice, and smaller points; all fixed with tests.

Late afternoon of 20 October 2026, after bundle 14: a save from a page opened earlier no longer undoes a change made elsewhere (`docs/specs/changes-elsewhere.md`). Settings, clients, saved items and tax codes carry the version they showed; a save that would undo a change made since is refused ("These settings were changed in another tab or on another device after this page opened. ..."), the page fetches the record again, every field not typed in shows the change, and "Save mine anyway" saves what the form then shows. Found by testing two tabs: bank details changed on a phone came back as they were when a laptop tab opened earlier saved the business name. The settings form's messages now sit beside its save button, at the foot of the screen. On the owner's yes, a password reset also confirms the address, so the owner of an address someone else signed up with resets the password and signs in. Leaving the settings, the reminder settings, a client's form or a saved item's form with changes not saved now asks first, as the invoice editor does (`docs/specs/unsaved-changes.md`). A saved item whose tax code was archived keeps it when edited; the items page named it "Default tax" and saving the item quietly moved it to the default rate. Reminder wording with a placeholder Invoica cannot fill in ("{amout}") is refused and named under the field (`docs/specs/reminders.md`, rule 13); it was sent to clients as written.

Afternoon of 20 October 2026, after the owner's yes: the branch `fix/confirm-then-sign-in` is merged; a confirmation link opens a page that names the address and asks for the account's password, and only the right password confirms the address and signs in (`docs/specs/sign-in-by-email.md`, rule 1). Better Auth's confirm-on-open route is off, and links in its form open the same page. The endpoint is limited like sign-in and refused from another site. A test walks the owner of an address through taking back an account someone else made with it. Every form's button waits for the page's script, so a form sent before it has started never puts a password in the address. Decision 0011 is built (migration 0026): `app.due_reminders` is back to what an image from before 0022 expects, the app calls `app.reminder_candidates`, and the scheduler needs no stopping during an upgrade. The Ghana end-to-end test now confirms with the password; it had been left on the old flow. A separate review of these changes found nothing high or medium; its three low points are fixed with tests: once an address is confirmed its link signs nobody in, whatever password comes with it (so the link is never a second way to try passwords), the page sends no referrer, and the token rules (expired, another secret, a change of address) have unit tests. Found while testing: an invoice or reminder sent after the business changed its name or email went out under the old name with replies to the old mailbox; both now come from the business as it is now, with replies to its email now (`docs/specs/email-status.md`, rule 5), and the attached PDF stays as issued.

Review 11 (`docs/reviews/review-11.md`), late morning of 20 October 2026: 7 low findings on the draft versions, the editor's refreshes, late repeats and archived items, all fixed with tests. "Save mine anyway" saves against the version fetched after the refusal; "Issue mine anyway" asks for confirmation again; the editor reloads its data only after the refusals that need it; an older repeat never replaces a later change; an archived item never blocks a change of currency.

Last, by 10:10 on 20 October 2026: a draft changed in another tab or on another device is not replaced without asking ("Save mine anyway", `docs/specs/issuing.md` rule 7); saved items keep their figures when the business's currency changes, and the change is refused while a price cannot be written in the new currency; a payment above the balance names what is still owed ("The payment is more than the £60.00 still owed."); the email-not-sent notices pass the accessibility checks in light and dark; 1,000 random journeys ran clean against the reference model.

Review 10 (`docs/reviews/review-10.md`), on the morning of 20 October 2026: 1 medium (the branch still waiting) and 8 low findings. Fixed with tests: a refused save fetches today and the settings again, so a page opened before midnight or a settings change can save its rate; a saved item keeps its figure on an invoice in another currency; a draft's due date follows the terms until set by hand; sign-in emails greet no one by name; a client, item or tax code corrected after a lost answer is saved as corrected (migration 0025); "everything still owed" paid meanwhile says nothing is owed; the guide says which migrations a previous image cannot run the scan against; a test checks the reminder the app chooses on any machine. Long names and addresses wrap on phones.

Earlier on the morning of 20 October 2026, after bundle 10: issuing checks the total the person confirmed, so a tax rate or setting changed in another tab shows the new total to confirm (`docs/specs/issuing.md`); refusals of a state change say what to do ("This invoice is void, so it cannot be marked as sent."); the invoice page and the dashboard say when an email or reminder has not gone, is being tried again or could not be sent (`docs/specs/email-status.md`; the development mailbox refuses `.invalid` addresses so this can be tried); the reminder scan offers an invoice only within three hours of its reminder day (migration 0024); end-to-end tests for voiding and for a client's page following its invoices.

Morning of 20 October 2026: review 9 and its fixes (migrations 0022 and 0023). A balance credit note checks the balance confirmed; the tax point is worked out in one place and a period takes both dates; the editor sends what each exchange rate was entered for; retried actions name the invoice number, and a page from before a new version says to reload; extra decimal places are refused again and amounts are retyped on a currency change; sign-in emails greet only confirmed accounts by name; server settings files are kept out of git and images, and the guide covers database certificates; reminders are chosen with the app's own business date; the database refuses money dated well after today; CI runs the end-to-end suite against the production server.

Night of 19 to 20 October 2026: testing as the business will use it (journeys against a model, operations at the same moment, edge cases, a dropped connection, two tabs and stale dialogs), with the faults it found fixed; production readiness (health check, start-up settings check, container image, deploy runbook); review 8 and its fixes (migrations 0016 to 0019). The owner chose a free version before billing.

Session 2, 19 October 2026, afternoon: phases 2q to 2w (Resend, email verification and password reset, the worker role, credit note wording and tax defaults, refunds, VAT in sterling, reminders).

## Next steps

1. When the owner has the domain and approves decision 0010: follow `docs/deploy.md`.
2. GitHub: on 23 October the owner chose to put v2 in its own private repository, `ser-arthur/invoica-v2`, cloned from bundle 20 into `~/Downloads/_DEV/invoica-v2` with `feat/website` as its `main`, and to show the site from its own Vercel project (root `apps/web`, no database: the site shows, account actions fail). The old repository and `invoica-io.vercel.app` stay untouched. CI (`.github/workflows/ci.yml`) runs there for the first time on that push. When this session is linked to GitHub: pull requests with CI (which also builds the container image and runs the end-to-end suite against the production server).
3. Billing (2x) once the free version has been used and a provider is chosen; then plan limits in the database and the deferred number counter check (2y).
4. Templates round 2 review (phase 3).
5. The website on `feat/website`: the owner's review (bundle 20), then a pull request once GitHub is linked; the owner's choice of where to show v2 before launch (a separate Vercel project recommended; the old app's address is not touched without his say). Then the app screens in the round 5 look: tokens and fonts in `globals.css`, the sheet and slab as shared pieces, each screen with its tests and the accessibility checks in both themes. The home page shows the app as drawn on the round 5 canvas, so it runs ahead of the app until those screens are built.

## Open questions

The list is kept in `docs/BLUEPRINT.md`, "Open questions" (7 items).

## Decisions

| Record | Title | Status |
| --- | --- | --- |
| 0001 | Rewrite strategy | Accepted |
| 0002 | Stack | Accepted |
| 0003 | Audience and v1 scope | Proposed |
| 0004 | Launch market and tax | Accepted |
| 0005 | Positioning and pricing | Accepted |
| 0006 | PDF engine | Proposed, built |
| 0007 | Tax rounding | Proposed, built |
| 0008 | Email provider | Accepted: Resend |
| 0009 | Credit notes worked out slot by slot | Proposed, built |
| 0010 | Hosting | Proposed |
| 0011 | The reminder scan when an older image runs | Accepted |
| 0012 | The logo | Accepted |
| 0013 | Where the launch offers show | Accepted |
