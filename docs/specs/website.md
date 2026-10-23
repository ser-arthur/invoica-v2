# The website

The public home page at `/`, for people who have not signed in. It tells the story of the product in the order a new business meets it: look established from the first invoice, follow every invoice until it is paid, and keep clients and figures in one place. The design is round 5 on the design canvas (`docs/design/direction-round-5.md`), with the owner's notes of 23 October.

## What a visitor sees

1. **Header.** The logo (the slip i, `docs/design/direction-round-5.md`), links to how it works, templates and pricing, "Sign in" and "Create free account".
2. **Hero.** The headline "Every invoice, all the way to paid." crossed by one diagonal crease, drawn as a lime to teal line; past the crease the words turn green, in one sweep from leaf green to teal. A short statement and one main button beside it, two short notes above, invoice numbers running up the left edge on wide screens, and folded slabs charting an example studio's money in by month.
3. **The app.** A large tilted sheet with three screens of the app standing on it, its corner turned.
4. **How one invoice gets paid.** Five steps: write, issue, send, remind, get paid. Each has a large numeral shaded from lime green to teal down the page, and a picture on a panel tinted the same way, so the white cards on it stand clear. The last step shows the dashboard's owed card, drawn as it is in the app.
5. **Templates.** Three real invoices in different templates, rendered by the documents package.
6. **Phones.** The dashboard on a phone, light and dark.
7. **The details, itemised.** The rest of the product as line items on an invoice, each at £0.00 for the first 30 days (decision 0005), with a total, and a tear-off slip below a dotted line holding the sign-up.
8. **Footer.** The logo, one line on who it is for, sign in and create free account. Privacy, terms and contact join it when those pages exist.

## Rules

1. Signed in, `/` goes to the dashboard.
2. Every "Create your free account" and "Create free account" leads to `/sign-up`; "Sign in" leads to `/sign-in`.
3. The slip's email goes to the sign-up form, filled in. A value that is not a plausible email address (empty, longer than 254 characters, containing spaces, or without one `@` and a dot after it) is ignored and the field is left empty.
4. The page never scrolls sideways, down to 360 pixels wide.
5. Drawings that carry no information (the crease, the turned corners, the ledger margin, the sheet behind the screens) are hidden from assistive technology. The money-in chart has a text alternative naming each month and amount. The headline is read once.
6. Example data on the page is invented for the example and labelled as an example where it could be taken for a customer's.
7. The page passes the automated accessibility checks.

## Acceptance criteria

1. Signed out, `/` shows one level-one heading, "Every invoice, all the way to paid." (`apps/web/e2e/website.spec.ts`).
2. Every "Create your free account" and "Create free account" link leads to `/sign-up`, and "Sign in" to `/sign-in` (same file).
3. An email typed into the slip arrives filled in on the sign-up form; `/sign-up?email=not an email` leaves the field empty (same file; the rule itself in `apps/web/src/lib/prefill-email.test.ts`).
4. At 390 and 360 pixels wide the page is no wider than the screen (same file).
5. The money-in chart is announced with every month and amount (same file).
6. Signed in, `/` opens the dashboard (same file).
7. `/` has no automated accessibility violations (`apps/web/e2e/accessibility.spec.ts`).
