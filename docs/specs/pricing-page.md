# The pricing page

The public page at `/pricing`, linked from the header, the footer and the home page's itemised invoice. It sets out the plans in decision 0005 for a business deciding whether to start. The design follows the home page (`docs/specs/website.md`).

This page is built for launch: it describes the plans as they will be when the site goes live. The site goes live only with billing (phase 2x) and the plans enforced (Kobby, 23 October); until then plans are not enforced (`INVOICA_PLANS` unset) and every account has everything.

Which offers show here is decision 0013: the trial leads, local prices are public, and the founding offer is not on the public site.

## What a visitor sees

1. **The header and footer** of the home page.
2. **The trial, first.** "Every account starts with 30 days of Pro, free" with no card needed, and what happens after: the account moves to Free unless it upgrades, and nothing made during the trial is lost.
3. **Three plans,** side by side on wide screens and one under another on phones. Free, £0. Pro, £7 a month or £70 a year. Studio, £15 a month or £150 a year. A switch between monthly and yearly prices; yearly shows that two months are free. Pro is set apart as the plan the trial gives.
4. **What each plan includes,** from decision 0005. Features not built yet say so: payment links (Pro and Studio), several businesses and up to five people (Studio).
5. **What every plan includes:** credit notes, numbering without gaps, PDFs kept as issued, sending by email, payments, data export. Producing a correct invoice is never paywalled; invoices are never counted.
6. **Questions:** what happens after 30 days, whether a card is needed, what counts as an active client, whether invoices are limited, whether Invoica takes a fee, and lower prices in cedis and naira for Ghana and Nigeria. The founding offer is not mentioned (decision 0013).
7. **A closing call to start,** leading to `/sign-up`.

## Rules

1. The prices and limits are decision 0005's, written once in `components/site/plans.ts` and read by the page.
2. Every "Start" call leads to `/sign-up`.
3. The monthly and yearly switch works without the page's script: it is a pair of radio buttons, and the prices shown follow the one chosen.
4. Signed in or not, the page shows; it does not redirect. Signed in, the header leads to the dashboard (`apps/web/e2e/not-found.spec.ts`, criterion 4).
5. The page never scrolls sideways down to 360 pixels wide, and passes the automated accessibility checks.

## Acceptance criteria

Each is a test in `apps/web/e2e/pricing.spec.ts`, except 6 (`apps/web/e2e/accessibility.spec.ts`).

1. `/pricing` has one level-one heading and the three plans, Free, Pro and Studio, each a level-two heading, with £0, £7 and £15 a month.
2. Choosing "Yearly" shows £70 and £150 a year; choosing "Monthly" shows the monthly prices again.
3. The trial is stated before the plans: 30 days of Pro, free, no card.
4. Every link that starts an account leads to `/sign-up`.
5. Payment links, several businesses and people are marked as coming soon.
6. `/pricing` has no automated accessibility violations.
7. At 390 and 360 pixels wide the page is no wider than the screen.
8. The founding offer is not on the page, and the question on Ghana and Nigeria says plans cost less there and are paid in cedis or naira (decision 0013).
