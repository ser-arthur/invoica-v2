# The not-found page

What a visitor sees at an address with no page: a mistyped link, an old link, or a page that is planned but not written yet. It is the website's own page, in the site's look (`docs/specs/website.md`), so a wrong address still feels like Invoica. Inside the app, an invoice or client that does not exist keeps the app's own "Nothing here" page.

## What a visitor sees

1. **The site's header and footer,** as on the home page.
2. **An address with no page.** "There is no page at this address.", a line saying the link may be mistyped or out of date, and ways on: the home page (or the dashboard, when signed in), the plans and prices, and signing in.
3. **A planned page not written yet** (the footer's Privacy and Terms; About, Contact, Help centre, Getting started and Cookies left the footer on 29 October, `website-footer.md`). Its own heading, for example "The About page is being written.", a line on what the page will hold, and the same ways on.
4. **A drawing:** an envelope addressed in grey lines, with Invoica's stamp in the corner and a rubber stamp across it, "Return to sender, address not known" for an address with no page and "Coming soon, being written" for a planned page.

## Rules

1. Both are answered with status 404, so nothing at those addresses is listed by search engines.
2. The planned pages are listed once, in `components/site/planned-pages.ts`, with each one's heading and line. The footer links to every one of them. When a page is built it is taken off that list; a unit test fails while a planned page and a built page share an address.
3. The address typed is never shown on the page, so a link cannot put words of its own on Invoica's site.
4. Signed in, the main way on is "Go to your dashboard"; signed out, "Go to the home page".
5. The page never scrolls sideways down to 360 pixels wide, the drawing is hidden from assistive technology, and the page passes the automated accessibility checks.

## Acceptance criteria

Each is a test in `apps/web/e2e/not-found.spec.ts`, except where named.

1. `/no-such-page`, `/pricing/extra` and `/not/here/at-all` answer 404 with the heading "There is no page at this address.", the site's header and footer, and a link to the home page that opens it.
2. Each planned page answers 404 with its own heading and line.
3. The footer's About link opens the About page's notice.
4. Signed in, the page's main link is "Go to your dashboard" and opens the dashboard.
5. A link with words in its address does not show those words.
6. At 390 and 360 pixels wide the page is no wider than the screen, for an address with no page and for a planned page.
7. Every planned page is linked from the footer, and none shares an address with a built page (`apps/web/src/components/site/planned-pages.test.ts`).
8. `/no-such-page` and `/about` have no automated accessibility violations (`apps/web/e2e/accessibility.spec.ts`).
