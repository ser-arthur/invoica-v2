# The new invoice templates

What the template rounds approved on 25 October 2026 (`docs/design/round-6-templates.md`, `docs/design/round-7-templates.md`
and the canvas page "Invoice templates, round 3") mean in the product. The prototypes are in
`docs/design/round-6/prototypes`; they already use the real `DocumentView` and the shared helpers.

## The range

Twelve new templates join the three kept ones. In the picker, in this order:

| Id | Name | For | Type | Notes |
| --- | --- | --- | --- | --- |
| `sticker` | Sticker | Cafés, bakers, makers and classes | Fraunces and Figtree | |
| `riso` | Riso | Illustrators, printers, zines and labels | Syne and Space Mono | |
| `marquee` | Marquee | Events, DJs, venues and photographers | Bricolage Grotesque and Manrope | Uses the second colour |
| `atelier` | Atelier | Florists, stylists, interiors and weddings | Instrument Serif and Instrument Sans | Amount due on a panel of the brand colour |
| `bloom` | Bloom | Florists and cake makers | Bodoni Moda and Jost | |
| `mark` | Mark | Studios, agencies and developers | Geist and Geist Mono | |
| `billboard` | Billboard | Studios and agencies who want to be loud | Funnel Display and Inter Tight | Logo on its ground; the name sized to fill the width |
| `grid` | Grid | Architects, designers and photographers | Mona Sans | |
| `trade` | Trade | Builders, roofers, electricians and cleaners | Archivo | Logo on its ground |
| `statement` | Statement | Bookkeepers, contractors and engineers | Hanken Grotesk and IBM Plex Mono | |
| `practice` | Practice | Accountants, solicitors, surveyors and clinics | Libre Caslon and Source Sans 3 | Logo on its ground |
| `heritage` | Heritage | Distillers, barbers, tailors and wine merchants | Cormorant and EB Garamond | Round 3, plain |

Kept: **Signature** (the default, and the free plan's), **Letter** and **Ticket**. **Studio**, **Poster**, **Counsel** and
**Ledger** leave the picker (decision for the owner, below); every document already issued with one still renders
exactly as before, so they stay in `TEMPLATES`.

The picker shows each template with the business's own name, logo, colour and details, as today, with filters by kind
of business and by feel (playful, in between, grounded). It lists Signature first, then the twelve in the order above,
then Letter and Ticket. A setting or a draft still on a retired template keeps it, and the picker and the editor say so.

Logos come in every shape. A logo at least 1.4 times as wide as it is tall is set as a wordmark where a template would
frame it in a circle: Sticker's sticker becomes a pill across the top of the card, Heritage sets it under the arch in
place of the medallion, and Riso sets it beside the number with the name below. The templates read the shape from the
image itself (PNG, JPEG or WebP, the types the upload takes).

## The second colour

Some templates use a second colour. A business sets one brand colour; by default the second is made from it: the
opposite hue, deep or pale, whichever stands out more against the brand colour. A business can choose its own second
colour instead in Settings, beside the brand colour ("Second colour: automatic, or choose one").

The second colour is for large type and for grounds (Marquee's title and its ticket). Small text on the brand colour
stays black or white by the rule we have (`readableOn`), so it keeps a contrast of at least 4.5.

- Stored on the organisation as `accent_colour`, a hex colour or null for automatic.
- Recorded in the snapshot at issue as `seller.accentColour`, already worked out, so an issued invoice keeps the colour
  it was issued with whatever the rule or the setting does later. Snapshots without it (issued before this change)
  have it worked out from their brand colour when shown.
- On the free plan the brand colour is Invoica's (spec `plans.md`), and the second colour is worked out from that.
- Used by Marquee in this release.

## The logo's ground

Where a template puts the logo on a colour (Marquee, Billboard, Trade, Practice), the business chooses what sits behind it:
nothing, white, cream or black. White by default. Set in Settings beside the logo upload, with a preview of the logo on
each.

- Stored on the organisation as `logo_ground`, one of `none`, `white`, `cream`, `black`.
- Recorded in the snapshot at issue as `seller.logoGround`. Snapshots without it are shown with white.
- Templates that set the logo on white paper ignore it.

## Data

One new migration adds the two columns to `organisation` (nullable `accent_colour` with the same hex check as
`brand_colour`; `logo_ground` not null, default `white`, checked against the four values). Nothing is removed or
rewritten. No new tables, so row-level security and the grants are unchanged.

## Fonts

Each new family is added to `packages/documents/fonts` with its licence file (all SIL Open Font License, checked one by
one), latin and latin-ext, and to `FACES` in `fonts.ts`. They stay variable fonts in this change, as the existing seven
templates use today; static fonts for PDFs are a separate change (round 6, finding 1).

The files are the Fontsource builds (version 5.3), used as they are. One licence declares a Reserved Font Name: Mona
Sans reserves "Mona", which matters only to someone who modifies the font and publishes it; we do neither. If static
fonts are cut from it later, the cut files cannot be called Mona.

## Acceptance criteria

Each is a test. Templates in `packages/documents/test` and `packages/pdf/test`; colours in `packages/core/test`; data
in `packages/db/test`; settings and the picker in `apps/web` and `e2e`.

1. Every template in the picker renders the sample invoice on one page.
2. Every new template has approved images: the UK VAT fixture's first page and the long fixture's second page
   (`packages/pdf/test/visual.test.ts`).
3. Every new template renders, with the expected wording and no text outside the page: a credit note, an invoice with
   no logo, a very long business name, Ghana's three taxes, the reverse charge, VAT in sterling, and a payment link.
4. A document issued with Studio, Poster, Counsel or Ledger still renders, unchanged against its approved images.
5. The second colour, worked out from a brand colour, has a contrast of at least 3 against it (the level for large
   text), for every colour in a fixed set and for random colours (property test); small text on the brand colour keeps
   at least 4.5.
6. A business's own second colour is used in place of the worked-out one; clearing it goes back to automatic.
7. An invoice issued with a second colour and a logo ground keeps both when the settings change afterwards.
8. A snapshot without `accentColour` or `logoGround` renders with the worked-out colour and a white ground.
9. Settings refuse a second colour that is not a hex colour and a logo ground outside the four values.
10. On the free plan with plans enforced, documents still use Signature and Invoica's colour (spec `plans.md`
    unchanged), and the second colour is worked out from Invoica's colour.
11. The picker lists the sixteen in order, filters by kind of business and by feel, and choosing one saves it; the
    editor's template choice lists the same sixteen, with Signature's four styles.
12. Pages are accessible: the picker's choices are labelled, and the new settings are reachable and named for screen
    readers (`e2e/accessibility.spec.ts`).

13. Every template fits the three short fixtures on one page with a wide logo and with a square one
    (`packages/pdf/test/pdf.test.ts`).
14. Signature shows the amount due before the parties and the lines, in each of its styles
    (`packages/documents/test/kept-templates.test.ts`); the light style on a slip of the brand colour, its corner turned.
15. Ticket ends with a stub after a perforation holding the amount due, the bank details and the reference; the band
    with the amount due sits inside the paper's margins, on a grey page (the same test, and approved images).
16. Letter keeps its layout, with the invoice and its number and the name under "With thanks" set larger (approved
    images).

## Signature, Letter and Ticket

The design pass (`docs/design/round-8-kept-templates.md`, canvas page "Signature, Letter and Ticket") as the owner
chose it: Signature as the second pass; Letter as it was, with the invoice and its number and the signed name larger;
Ticket as the second pass, with the amount due band inside the paper's margins and the grey page kept. Letter keeps
speaking in the first person.

They change in place, under the same ids. No invoice has been issued with them outside development yet. A document
issued before the change keeps its snapshot and its kept PDF; only its view on screen takes the new look.

## Signature's styles, Powered by Invoica, and Monochrome

The owner's choices of 26 October 2026, 16:38, from the Signature session (`docs/design/round-10-signature.md`,
canvas page "Signature, new directions"):

- Signature comes in four styles, chosen in its settings: **Night head** (`signature`, the default), **Light**
  (`signature-light`), **Route** (`signature-route`) and **Route on Night** (`signature-route-dark`). The picker and the
  editor list Signature once, with its styles under it. There is no fully dark crease.
- Night head: the top of the page is the sign-in panel's sheet, Night with its corner turned in the business's
  colour. The number is set large and crossed by the crease, the part past it in mint; the band past the crease is a
  shade lighter, and that edge is the crease itself, carried across the band, whatever the number. The amount due
  stands at the right of the band. Below the band the page is light.
- Light: the number large and crossed by the crease, the part past it grey; the amount due on the slip.
- Route and Route on Night: the page's top corner turned in the business's colour; the route from issued to due along
  Invoica's line with the days between; the amount due the largest thing on the page. On Night the business's colour
  is lifted until it reads.
- Every style of Signature ends with "Powered by" and Invoica's wordmark, on every plan. Other templates carry nothing
  of Invoica. The free plan uses Signature, so its documents always carry the mark, and the "Made with Invoica" line
  goes. The free plan may choose among Signature's styles; anything else still becomes Signature (Night head).
- **Monochrome** (`monochrome`) joins the range as the sixteenth, last in the picker, shown with a logo: the first app's
  layout in greys, the logo set in grey, figures in JetBrains Mono, no brand colour. The website's count follows.
- A document issued before this change on `signature` shows the Night head on screen; its kept PDF is unchanged.

17. Signature's four styles render the sample invoice, the three short fixtures with a wide and a square logo, and the
    hard documents, each on one page where they did before, with approved images.
18. In the Night head, the lighter part of the band starts on the line of the crease, for a short number and a long
    one.
19. Every Signature style shows "Powered by" and Invoica's wordmark on every plan; no other template does on a paid
    plan; "Made with Invoica" no longer appears.
20. On the free plan with plans enforced, a document keeps the Signature style chosen; any other template becomes
    Signature.
21. Route shows the days from issue to due, worked out from the business dates, and leaves the route out when there
    is no due date (a credit note).
22. Monochrome renders every fixture in greys only: no colour outside the logo, and the logo set in grey.
23. The picker shows Signature's four styles as choices under it, and choosing one saves it; the editor lists them.

## Signature's Night accents in the business's colour

The owner's question of 27 October, 16:34, and his answer of 29 October, 14:48 (`docs/design/round-11-signature-colour.md`,
proposed): when a business's colour changed, only Signature's turned corner and how to pay's tint followed it, so an
orange business had an orange corner beside a green number. Now the Night head's accents come from the business's
colour, lifted for Night in OKLCH so they keep its hue and read:

- The labels ("VAT invoice", "Amount due") and the number past the crease: the colour at lightness 0.80, keeping its
  hue and at least 0.11 of chroma (`liftForNight` in `@invoica/core`).
- The due date: the colour at lightness 0.87, at least 0.10 of chroma.
- The crease line: from the due date's colour, through the accent, to the colour at lightness 0.68 (at least 0.13).
- Route on Night, Signature's other Night style, the same way: the route's first stop in the due date's colour, and
  its line from that colour through the accent to the deep one. The route's last stop already takes the business's
  colour.
- A colour near grey (chroma under 0.03) gives silver accents, not a hue the business never chose.
- In Invoica's own colour (`#17795a`, the default and the free plan's), Signature is as it was: mint, lime and the
  lime, green and teal line.
- Unchanged: the turned corner, how to pay's tint, the rule over the amount due, "Powered by" and Invoica's wordmark,
  and the Light and Route styles on white. A document issued before this shows the new accents on screen; its kept PDF
  is unchanged.

24. In the Night head the labels and the number past the crease are the accent, the due date the lighter colour and
    the crease line runs from the lighter colour through the accent to the deep one; the head holds none of Invoica's
    mint or lime, for a business in orange and one in navy.
25. Route on Night's first stop and line follow the same colours.
26. Every accent keeps the business's hue within 3 degrees, the accent and the due date read at 4.5:1 or more on Night
    and the deep colour at 3:1, for every colour on a grid across the whole range.
27. A colour near grey gives silver accents; Invoica's own colour gives today's mint, lime and line exactly.
28. The turned corner and how to pay's tint still take the business's colour, and the Light and Route styles on white
    are unchanged.

## Order of work

1. This spec, approved.
2. Fonts and their licences.
3. The colour rule in `@invoica/core` (tests first), then the migration, the schema, the snapshot fields and the
   settings (tests first).
4. The templates, one commit each, ported from the prototypes with the final round 3 choices, each with its approved
   images.
5. The picker and the editor's list; the four retired templates leave both.
6. The full check, the production build and the end-to-end suite; then the handover, the blueprint and a bundle.

Not in this change: static fonts for PDFs, the payment link as a real link, the website's templates section, the line
down How it works and the app below the hero.

## Answered by the owner, 25 October 2026

1. Studio, Poster, Counsel and Ledger leave the picker; issued documents keep them.
2. The plan as written, with one addition: after the twelve, a design pass on Signature, Letter and Ticket to bring
   them up to the new range, shown on the canvas for approval before it is built. The picker's sample details (the
   client, the bank) are made real-looking at the same time, with account, company and VAT numbers that fail their
   check digits so none can be real.
3. 25 October, 17:05, on the design pass: Signature as the second pass, shown in a business's own colour (indigo on
   the canvas); Letter as it was, with the signed name, the invoice and its number larger; Ticket as the second pass
   with the band inside the paper's margins and the grey page kept; Letter speaks in the first person.
