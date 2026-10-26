# Round 10: Signature with Invoica's character, and Monochrome

26 October 2026. The owner asked for a session of mockups for Signature, Invoica's own template (the default, and
the one the free plan uses), so that it carries Invoica's character: "Powered by Invoica" with the logo, a light mode
and a dark mode, the dark one especially creative. He also asked for the first app's Monochrome invoice as a neutral,
professional layout. This is a proposal on the canvas page **Signature, new directions**. Nothing in the product has
changed.

The prototypes are in `docs/design/round-10`: `t/crease.ts` (direction A, light and dark), `t/band.ts` (A with a
Night head), `t/route.ts` (direction B, light and dark) and `t/monochrome.ts`. `mark.ts` draws Invoica's wordmark from
`apps/web/src/components/logo-shapes.ts` for the foot, and `colour.ts` lifts a business's colour until it reads on
Night. `run.ts` renders each for Larkspur Analytics (the shelf's Signature, with its logo, in green) and Linden & Rowe
Studio (the website's story, no logo, in navy), beside today's Signature. The canvas boards come from
`docs/design/round-6/canvas/round10.py`.

No new fonts: Sora and Onest, and JetBrains Mono for Monochrome's figures.

**Answered and built, 26 October, 16:38.** Signature as A: the Night head the default, light the other choice, no fully
dark crease; B, the route, in light and on Night, as two more of Signature's styles in its settings. The band's lighter
side starts on the crease's own line. "Powered by Invoica" on every Signature, on every plan. Monochrome as the
sixteenth template, shown with its logo. Built under `docs/specs/invoice-templates.md`; `built.ts` renders them from the
product.

## 1. The directions

| Direction | What it is |
| --- | --- |
| A, the crease, light | The invoice's number set large and crossed by the crease, the part past it in grey, as the website's headline is. The amount due on the slip with its corner turned, in the business's colour. Then the facts in a row, the parties, the lines, how to pay beside the totals, and "Powered by" with Invoica's wordmark at the foot. The nearest to today's Signature. |
| A, with a Night head | A light page whose top is the sign-in panel's sheet: Night, one shade lighter past the crease, its top corner turned in the business's colour. The number crosses the crease in white and mint; the amount due stands at the right in white over a lime due date. Everything below is the light page. |
| A, dark | The whole page in Night, the far side of the fold a shade lighter, the number's far half in mint. The slip keeps the business's colour; a colour too dark to read on Night (navy, say) turns the slip white with its corner in that colour. |
| B, the route, light and dark | The page's top corner turned in the business's colour, the way the logo turns the corner of its i. Across the top, the invoice's route from issued to due along Invoica's lime to teal line, with the days between; the amount due is the largest thing on the page. |
| Monochrome | The first app's layout in greys: the business's name large at the left, the kind of document larger and lighter at the right over its number and dates in mono, a grey band over the lines, the figures in mono, the total under a heavier rule, payment and terms side by side, "Thank you for your business." at the foot. No colour at all; the logo is set in grey. |

## 2. Recommendation

Signature becomes A in three modes: light, with a Night head, and dark. The Night head as the default. It is the
most Invoica of the three (the same sheet, crease and turned corner a visitor sees on signing in), and it still
prints light: only the top fifth is dark. Light stays for anyone who wants the quietest page; dark is the creative
one, for invoices that are sent and read on a screen.

B is the strongest at putting the figure first, but its route repeats the dates the page already gives and its corner
competes with A's. The route belongs better in the app, on an invoice's own page, where it can show where the invoice
has got to (sent, viewed, reminded, paid).

Monochrome as a new template for businesses that want no colour at all, with the other templates in the gallery.

## 3. Things to decide

1. **Which direction**, and whether dark is offered as a choice in Signature's settings.
2. **Powered by Invoica.** The free plan already prints "Made with Invoica" under every document (`mark` in
   `packages/core/src/plans.ts`). The proposal swaps that line for "Powered by" and the wordmark, in the foot, on the
   free plan only, as now. Whether paid plans may switch it on is open.
3. **A dark invoice on paper.** A full Night page uses a lot of toner, and some printers and office viewers render it
   heavier than it looks on screen. A dark invoice could carry a light copy for printing, or the business could be
   steered to the Night head when they print.
4. **Monochrome's logo**: set in grey, as shown, or in its own colours as the only colour on the page.

## 4. Limits of the mockups

Each is a one-page mockup with its footer pinned to the page's foot. Built, they follow the templates' rules
(`docs/specs/invoice-templates.md`): the running footer on every page, the long and UK VAT fixtures, no logo, a logo
on its ground, and the contrast checks on every colour against its ground.
