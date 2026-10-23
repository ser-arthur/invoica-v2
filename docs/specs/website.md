# The website

The public home page at `/`, for people who have not signed in. It presents Invoica as the business side of a small business, in the order a new business meets it: look established from the first invoice, see what Invoica does for the business, follow one invoice until it is paid, then everything else, with the sign-up at the end. The design is round 5 on the design canvas (`docs/design/direction-round-5.md`), with the owner's notes of 23 October.

## What a visitor sees

1. **Header.** The logo (decision 0012), links to why Invoica, how it works, templates and pricing, "Sign in" and "Create free account", above a hairline that runs the width of the screen.
2. **Hero.** The headline "Every invoice, all the way to paid." crossed by one fold: a lime to teal line from the top right corner of the screen, just under the header's hairline, down past the left edge. Past the fold the words are grey, mostly flat. Beside the headline, two facts with green labels (for new businesses; free for 30 days). Below it, a one-sentence statement and the main button. Then folded slabs charting an example studio's money in by month.
3. **The app.** A large tilted sheet with three screens of the app standing on it, its corner turned.
4. **Why Invoica.** What Invoica does for a business, in the old site's manner: a green label, a leading heading and a short paragraph for each of your identity, financial clarity and client management.
5. **How it works.** Five steps: write, issue, send, remind, get paid. Each has a large numeral shaded from lime green to teal down the page, and a picture on a panel tinted the same way, so the white cards on it stand clear. The last step shows the dashboard's owed card, drawn as it is in the app.
6. **Templates.** Three real invoices in different templates, rendered by the documents package.
7. **On your phone.** A band of lime across the whole page, its edges parallel to the fold, with the dashboard on two phones, light and dark, drawn as modern phones with a status bar.
8. **Pricing.** The rest of the product as line items on an invoice, each at £0.00 for the first 30 days (decision 0005), with a total, and a tear-off slip below a dotted line holding the sign-up.
9. **Footer.** Night across the whole page: the logo, one line, "Create free account", link columns for the product, the company, help and legal pages, and the logo again set large and cut off at the foot of the page.

## Rules

1. Signed in, `/` goes to the dashboard.
2. Every "Create your free account" and "Create free account" leads to `/sign-up`; "Sign in" leads to `/sign-in`.
3. The slip's email goes to the sign-up form, filled in. A value that is not a plausible email address (empty, longer than 254 characters, containing spaces, or without one `@` and a dot after it) is ignored and the field is left empty.
4. The page never scrolls sideways, down to 360 pixels wide.
5. The fold crosses the headline and nothing else in the hero: the statement, the buttons and the facts stay clear of it by at least 8 pixels at every width. It always passes through one point of the headline (`components/site/fold.ts`), so the words split the same way at every width.
6. Drawings that carry no information (the fold, the turned corners, the sheet behind the screens, the phone frames, the large logo in the footer) are hidden from assistive technology. The money-in chart has a text alternative naming each month and amount. The headline is read once.
7. Example data on the page is invented for the example and labelled as an example where it could be taken for a customer's.
8. Footer links to pages not built yet go to their planned addresses: `/about`, `/contact`, `/help`, `/help/getting-started`, `/privacy`, `/terms` and `/cookies`. Until each page exists, its link opens the not-found page.
9. The page passes the automated accessibility checks.

## Acceptance criteria

1. Signed out, `/` shows one level-one heading, "Every invoice, all the way to paid." (`apps/web/e2e/website.spec.ts`).
2. Every "Create your free account" and "Create free account" link leads to `/sign-up`, and "Sign in" to `/sign-in` (same file).
3. An email typed into the slip arrives filled in on the sign-up form; `/sign-up?email=not an email` leaves the field empty (same file; the rule itself in `apps/web/src/lib/prefill-email.test.ts`).
4. At 390 and 360 pixels wide the page is no wider than the screen (same file).
5. The money-in chart is announced with every month and amount (same file).
6. Signed in, `/` opens the dashboard (same file).
7. At 1920, 1440, 1180, 1024, 961, 800, 390 and 360 pixels wide the fold crosses the headline and clears the statement, both buttons and the facts by more than 8 pixels (same file).
8. The footer links to each planned page, to sign in and to sign-up (same file).
9. `/` has no automated accessibility violations (`apps/web/e2e/accessibility.spec.ts`).
