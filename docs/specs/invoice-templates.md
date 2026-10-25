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
of business and by feel (playful, in between, grounded).

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

Where a template puts the logo on a colour (Billboard, Trade, Practice), the business chooses what sits behind it:
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
11. The picker lists the fifteen in order, filters by kind of business and by feel, and choosing one saves it; the
    editor's template choice lists the same fifteen.
12. Pages are accessible: the picker's choices are labelled, and the new settings are reachable and named for screen
    readers (`e2e/accessibility.spec.ts`).

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

## For the owner

1. Retire Studio, Poster, Counsel and Ledger from the picker (issued documents keep them)?
2. This plan, as written?
