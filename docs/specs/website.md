# The website

The public home page at `/`, for people who have not signed in. It presents Invoica as the business side of a small business, in the order a new business meets it: look established from the first invoice, see what Invoica does for the business, follow one invoice until it is paid, then everything else, with the sign-up at the end. The design is round 5 on the design canvas (`docs/design/direction-round-5.md`), with the owner's notes of 23 October.

## What a visitor sees

1. **Header.** The logo (decision 0012), links to why Invoica, how it works, templates and the pricing page, "Sign in" and "Create free account", above a hairline that runs the width of the screen. It stays at the top while the page scrolls under it, on a frosted ground. On narrow screens the links fold into a menu.
2. **Hero.** The headline "Every invoice, all the way to paid." crossed by one crease drawn across the headline, a lime to teal line with a hairline square beside it, the two ending together and fading out at both ends. Past the crease the words fade to slate grey, light where the fade begins and deepening a little across the line, every part of it at least 3:1 on the ground. Beside the headline, two facts with green labels (for new businesses; free for 30 days). Below it, a one-sentence statement and the main button. Then folded slabs charting an example studio's money in by month. On load, once, the headline's two sides come in from opposite directions as two pieces cut along the crease and meet, the crease draws across as they do, and the slabs grow.
3. **The app.** A large tilted sheet with three screens of the app standing on it, its corner turned.
4. **Why Invoica.** What Invoica does for a business, in the old site's manner: a green label, a leading heading and a short paragraph for each of your identity, financial clarity and client management.
5. **How it works.** Five steps: write, issue, send, remind, get paid. Each has a large numeral shaded from lime green to teal down the page, and a picture on a panel tinted the same way, so the white cards on it stand clear. A line runs down the margin through all five, the invoice's route, filling from lime to teal as the page scrolls past. The last step shows the dashboard's owed card, drawn as it is in the app.
6. **Templates.** Three real invoices in different templates, rendered by the documents package, and "Try it with your business": a name, a colour and a layout, and the invoice in front redraws itself with them, rendered by the same code as real invoices. Nothing typed there is sent anywhere.
7. **On your phone.** A band of lime across the whole page, its edges parallel to the fold, with the dashboard on two phones, light and dark, drawn as modern phones with a status bar and set down slightly fanned. As the band scrolls in they come from either side, turned, and settle together; with a mouse, the phone under the pointer is picked up and comes to the front.
8. **What you get.** The rest of the product as line items on an invoice, each at £0.00 for the first 30 days (decision 0005), stamped "Free for 30 days, no card needed" the way a paid invoice is stamped, with links to the pricing page (`docs/specs/pricing-page.md`), and a tear-off slip below a dotted line holding the sign-up.
9. **Footer.** Night across the whole page: one line, "Create free account", link columns for the product, the company, help and legal pages, and the logo set large: dark letters with a thin holographic edge where their tops catch the light (option E on the canvas's "Footer logo" page), the edge tapering away down the curves of the n, o, c and a instead of stopping at a line, fading into the foot of the page part way down. As it comes into view it rises out of the fade and the edge lights up from the i to the a, a glint at the light's front; with a mouse, the glint then follows the pointer along the edge, like foil turned under a light. The large logo is the footer's only logo.

## Rules

1. Signed in, `/` goes to the dashboard. If the sign-in lookup fails (the database out of reach), the visitor is treated as signed out and the page still shows (`apps/web/src/lib/session.test.ts`).
2. Every "Create your free account" and "Create free account" leads to `/sign-up`; "Sign in" leads to `/sign-in`.
3. The slip's email goes to the sign-up form, filled in. A value that is not a plausible email address (empty, longer than 254 characters, containing spaces, or without one `@` and a dot after it) is ignored and the field is left empty.
4. The page never scrolls sideways, down to 360 pixels wide.
5. The crease crosses the headline and nothing else in the hero: the statement, the buttons and the facts stay clear of it by at least 8 pixels at every width. Its geometry is given relative to the headline (`components/site/fold.ts`), so the words split the same way at every width; the hairline is moved along the line by the amount that keeps it square to it (`components/site/fold.test.ts`).
6. Drawings that carry no information (the fold, the turned corners, the sheet behind the screens, the phone frames, the large logo in the footer) are hidden from assistive technology. The money-in chart has a text alternative naming each month and amount. The headline is read once.
7. Example data on the page is invented for the example and labelled as an example where it could be taken for a customer's.
8. Footer links to pages not built yet go to their planned addresses: `/about`, `/contact`, `/help`, `/help/getting-started`, `/privacy`, `/terms` and `/cookies`. Until each page exists, its link opens the not-found page with that page's own notice (`docs/specs/not-found-page.md`).
9. Motion is one load sequence in the hero, cards that lean towards the pointer on screens with a mouse, and movement tied to scrolling (pieces drifting at two speeds, the route filling, the stamp pressing on, the template fan opening on touch screens, the phones settling together, the footer logo rising and its light running along it). None of it hides content: everything is in place whether or not the motion runs. All of it stops for visitors who ask for less motion. Movement tied to scrolling follows the page's own scroll: containers around it clip with `overflow: clip`, never `hidden`, which would make them scroll containers and freeze it (`apps/web/e2e/motion.spec.ts`).
10. The page passes the automated accessibility checks.

## Acceptance criteria

1. Signed out, `/` shows one level-one heading, "Every invoice, all the way to paid." (`apps/web/e2e/website.spec.ts`).
2. Every "Create your free account" and "Create free account" link leads to `/sign-up`, and "Sign in" to `/sign-in` (same file).
3. An email typed into the slip arrives filled in on the sign-up form; `/sign-up?email=not an email` leaves the field empty (same file; the rule itself in `apps/web/src/lib/prefill-email.test.ts`).
4. At 390 and 360 pixels wide the page is no wider than the screen (same file).
5. The money-in chart is announced with every month and amount (same file).
6. Signed in, `/` opens the dashboard (same file).
7. At 1920, 1440, 1180, 1024, 961, 800, 390 and 360 pixels wide the crease crosses the headline and clears the statement, both buttons and the facts by more than 8 pixels (same file).
8. The footer links to each planned page, to the pricing page, to sign in and to sign-up (same file).
9. Scrolled well down the page, the header is still at the top of the screen (same file).
10. The itemised invoice says the first 30 days are free and links to the pricing page, as does the header, through its menu on phones (same file).
11. Typing a name and choosing a colour and a layout in the template demo redraws the invoice in front with them (`apps/web/e2e/website.spec.ts`).
12. `/` has no automated accessibility violations (`apps/web/e2e/accessibility.spec.ts`).

## Sign in and sign up

The pages under `app/(auth)` share the site's look: on wide screens a Night panel on the left, five twelfths of the page, lit faintly green from the top left and teal from the bottom right, each fading to nothing under a fine grain (`--grain`, black and white noise at 1% that moves each pixel by about one shade, which breaks up the steps browsers otherwise draw) so no edge or band shows; the owed card in the steps, the Pro card and the pictures of the app have the same (the design canvas, "Sign-in glow", C softer), with the crease (its line silver here, so it stands apart from the green words past it), the headline set to fill the panel's width, and three facts about an account, and the form on the right in the site's light palette, whatever theme the visitor chose; on phones the form alone under the logo. Moving between these pages, or from a form to "Check your email", the form arriving fades in as one, rising a few pixels and settling slowly, while the panel stays still; the form sits at the same height on every one of these pages, so its heading stays in place. Nothing waits on it, and it stops for reduced motion. Their wording and behaviour are unchanged (`docs/specs/sign-in-by-email.md`).
