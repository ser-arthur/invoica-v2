# Round 6: invoice templates, the line down How it works, and the app below the hero

24 October 2026, overnight. A proposal for the owner to approve. Nothing in the product has changed: the templates
below were built as prototypes (`docs/design/round-6/prototypes`, not imported by the product), rendered to PDF with the real view (`buildView`) and the real
renderer settings, and put on the design canvas.

Canvas pages: **Invoice templates**, **How it works: the line**, **The app below the hero**.

## 1. The seven templates we have

Rendered side by side (sample invoice and the UK VAT fixture), the seven read as one template set in seven fonts:

- Every one is a white A4 page in the same green and near black, with the same table, totals and payment block. They
  differ by typeface and one device each (a band, a side stripe, a centred letterhead, a mono).
- The type is narrow in range: Sora, Onest and Bricolage Grotesque are close cousins, and three templates use
  Newsreader. Nothing reads as soft, loud, wide, condensed, crafted or traditional, so a bakery, a roofer and a
  solicitor all get the same voice.
- The logo replaces the business name as an image about 16 mm tall in every template. No template is designed around a
  logo, the previews never show one, and a business without a logo gets its name in the body font.
- On a one-page invoice the lower half of the page is mostly empty.

Found on the way, for separate decisions:

1. **Fonts in the PDF.** Every font file is variable, and Chromium embeds a variable font in a PDF as Type 3 glyph
   programs (checked with `pdffonts` on today's Signature PDF). A static instance of the same font embeds as CID
   TrueType: one line of Onest came to 7.9 KB against 24.4 KB. Type 3 text can look softer in some viewers and on some
   printers, and the files are larger. Proposal: static font files for the PDF path, taken from the static instances
   Google Fonts publishes (making our own instances changes the font, so each licence is checked for a Reserved Font
   Name first). PDFs already issued are untouched.
2. **Company registration line.** A Scottish company number (SC) prints "registered in England and Wales"
   (`companyLine` in `view.ts`). Legal wording, so this needs your yes: Scotland for SC, Northern Ireland for NI.
3. **A glow left on the site.** The screenshot of the invoice page used in the slab (`sheet-invoice.webp`) still has
   the old glow on the "Still to pay" card. It should be re-rendered flat like the others.

## 2. What others do

- **Stripe**: an icon, a logo, a brand colour and an accent colour, applied across invoices, receipts and the
  customer portal. No choice of layout.
- **Mercury**: invoices with your logo and colour scheme, on paid plans.
- **Xero**: branding themes with a logo, typefaces, margins and headings; anything more means uploading Word
  templates.
- **QuickBooks**: a few preset styles, a logo and colours.
- **Invoice Ninja**: designs named Clean, Bold, Elegant, Hipster and Business, with a header font, a body font and two
  colours.

The pattern: everyone offers "your logo and your colour" on one neutral layout. Nobody offers a voice. That is the
opening, and it is the website's promise: look established from the first line, in a way that fits the kind of
business you are.

Studio invoices shared by designers (for example Widakk Design Studio's engraved invoice, with its seal, stamp and red
number) treat the invoice as part of an identity: the logo as a seal or stamp, the number as a feature, type carrying
the character. Several of the new templates borrow that thinking.

Two findings on what gets invoices paid, both from the companies' own data and neither independently checked: Xero
reported in 2016 that invoices with a way to pay online were paid almost 80% faster, and FreshBooks found in 2012 that
polite wording such as "thank you for your business" raised the share of invoices paid by more than 5%. So every
template gives the payment link a clear place (Mark shows it as a button that works in the PDF; the plan makes the
link clickable in all of them), and the samples end on a thank you.

Kept from print practice: A4, margins of 12 to 18 mm, a running label and page numbers in the page margin (decision
0006), one page for an ordinary invoice, and the tear-off stub, which survives here as the ticket in Marquee.

Sources:
[Stripe branding](https://docs.stripe.com/get-started/account/branding),
[Stripe Invoicing](https://stripe.com/gb/invoicing),
[Mercury invoicing](https://mercury.com/invoicing),
[Xero branding themes](https://ezycollect.io/academy/blog/how-to-customise-xero-invoice-templates),
[QuickBooks templates](https://cleverence.com/articles/quickbooks-documentation/how-do-i-edit-the-invoice-template-quickbooks-intuit-5273),
[Invoice Ninja designs](https://invoice-ninja.readthedocs.io/en/latest/invoice_design.html),
[Widakk Design Studio invoice](https://www.behance.net/gallery/242759657/Widakk-Design-Studio-2026-Invoice),
[Xero on paying online](https://www.cpapracticeadvisor.com/2016/12/05/xero-adds-apple-pay-stripe-integration/23988/),
[FreshBooks on wording](https://www.inc.com/jessica-stillman/3-invoice-changes-to-get-paid-faster.html).

## 3. The range: ten new, three kept

Ordered from playful to grounded. Each was rendered with an invented business, its own invented logo and its own
colour; every name, number and address is made up.

| Template  | For                                             | Type                               | The logo                                  | The one strong idea                                         |
| --------- | ----------------------------------------------- | ---------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| Sticker   | Cafés, bakers, makers and classes               | Fraunces (soft) and Figtree        | A round die-cut sticker on a tinted card  | The amount on a rounded label, set at a slight tilt         |
| Riso      | Illustrators, printers, zines and labels        | Syne and Space Mono                | Printed in two inks, overprinting         | Halftone dots running into the amount, two inks overlapping |
| Marquee   | Events, DJs, venues and photographers           | Unbounded and Manrope              | In the poster band                        | The job billed like a gig poster, a ticket stub to pay      |
| Atelier   | Florists, stylists, interiors and weddings      | Instrument Serif and Sans          | A mark above a centred letterhead         | Wide margins, the serif's italic, a quiet tint behind the amount |
| Mark      | Studios, agencies and developers                | Geist and Geist Mono               | Large, and again as a tint off the corner | A pay button that works in the PDF                          |
| Grid      | Architects, designers and photographers         | Mona Sans in two widths            | At the origin of a six-column grid        | The number set wide across the page, the amount in one solid cell |
| Trade     | Builders, roofers, electricians and cleaners    | Archivo, condensed                 | A badge in the band                       | A job sheet: phone number large, bank details big enough to type |
| Statement | Bookkeepers, contractors and engineers          | IBM Plex Sans and Mono             | Beside the name                           | The answers first in boxed cells, numbered rows             |
| Practice  | Accountants, solicitors, surveyors and clinics  | Source Serif and Source Sans       | A lockup in a margin column               | Set out like a letter, how to pay in one sentence           |
| Heritage  | Distillers, barbers, tailors and wine merchants | Cormorant and EB Garamond          | Inside a seal ringed with the name        | A double-ruled frame on every page, lines like a price list |

Kept as they are: **Signature** (the default and the free plan's), **Letter** and **Ticket**. Proposed to leave the
picker: **Studio**, **Poster**, **Counsel** and **Ledger**, which the new ones replace. They stay in the code under
their ids, so an invoice issued with one still shows on screen as it was.

How they were checked:

- Each renders the sample invoice on one page, and the long fixture flows over two or three pages with the table headings
  repeated (Heritage's frame repeats on every page).
- Each works without a logo. The name is set in the template's own display face; Mark and Grid draw a monogram from
  the first letter, and Sticker, Riso, Trade and Heritage put the initial where the mark would be. See "With a logo,
  and without one".
- Each takes any brand colour: tints are mixed from it, and text on it is chosen for contrast by the rule we already
  have (`readableOn`). See "Each one in the business's own colour" (Sticker, Grid and Trade in three colours each).
- All of them use the existing `DocumentView`: no new data, and the VAT, reverse charge, sterling and Ghana wording
  stays where it is, in `view.ts`.
- All fonts are under the SIL Open Font License.

What the canvas shows on the templates page: the ten pages full size, the picker in Settings with all thirteen
(filters by kind of business and by feel), one invoice in eight voices, every template with and without a logo, and
three templates in three colours.

## 4. Logos

- Templates that lead with the logo: Sticker, Mark, Trade, Heritage and Atelier. The rest give it a quieter place.
- Accept SVG as well as PNG, so marks print sharp at any size.
- Treat square marks and wide wordmarks differently: a square mark goes in the badge, sticker, seal or tile; a wide
  logo takes the name's place in a lockup. The upload can tell which from the image's proportions.
- Dark grounds (Marquee's band, Trade's badge) need a light version of the logo, or the logo set on a small white
  tile. Proposal: the tile, so nobody has to upload twice.
- Logos stay a paid-plan feature, as decided.

## 5. Type voices, for later

"One invoice, eight voices" shows the same invoice opening in Friendly, Art school, Loud, Editorial, Modern,
Condensed, Technical and Heritage type. It shows how much the type alone changes the feel. My view: ship each template
with its own fixed pairing first. A voice switch inside each template multiplies the cases to test by eight, and the
templates are designed around their type. Revisit if users ask.

## 6. The line down How it works

Today: a 3 px line in the margin filling lime to teal as the page scrolls. Five alternatives, each mocked as a loop of
the section scrolling past:

- **A. Punched.** The margin becomes the edge of continuous stationery, holes punched as you read, a larger hole in
  the step's colour at each step.
- **B. The invoice travels.** The invoice itself rides down the line: a blank sheet, then numbered, then an envelope,
  then an envelope with a reminder, then stamped paid. The line fills behind it in the step's colour.
- **C. A ledger.** The margin keeps the record of one invoice, written in as you reach each step with the times the
  invoice page shows ("20 Oct, 09:40, Issued INV-0044"), ending on a double rule under "Paid £2,280.00".
- **D. The crease.** The margin is folded back along a crease, and a corner turns over in the step's colour at each
  step.
- **E. A till roll.** A strip of receipt paper prints each step as you pass it and ends with "Thank you".

My recommendation: **B**. It tells the story the section is about, uses the sheet from the logo, and its five states
are statuses the app already shows. With reduced motion, each step shows its state beside the numeral and nothing
moves. Second choice: **C**, for its use of real times; it needs a margin of about 170 px, so on screens under about
1400 px wide it would fall back to B. On phones the travelling sheet sits beside each numeral.

Built with scroll-driven animation (`animation-timeline: view()`), with `overflow: clip` on the section (an
`overflow: hidden` ancestor stops view timelines, as we learned in bundle 29).

## 7. The app below the hero

Today: three screens standing on a white plane tilted 55 degrees and turned 20. At that angle and size nothing on the
screens can be read, the words under them are larger than the screens, much of the plane is empty, and it is the one
heavily 3D object on an otherwise flat site.

Other product sites mostly show the product large and flat (Linear, Mercury, Ramp), as one screen at a time behind
tabs that advance on their own (a common pattern, sold ready-made in the Framer marketplace), or as a story told by
scrolling (Stripe). Tilted slabs of screens were common a few years ago and now read as dated.

Five options, each looping on the canvas:

- **A. Flat and close up, on one route.** Three readable pieces (the live preview, the email in their inbox with the
  invoice's route, the owed card) above a flat route line, a status pill riding it: Draft, Sent, Paid.
- **B. Three words, one invoice.** "Write. Send. Get paid." set large on the left, lighting in turn, while one invoice
  changes on the right: the draft, then issued and in their inbox, then stamped paid with the owed card beside it.
- **C. Tabs that play.** One screen at a time, large enough to read, in a plain window. Three tabs, Write, Send and
  Get paid, advance every four seconds with a bar filling under each; a click picks one.
- **D. The slab, kept but gentler.** The same idea straight on, tilted about 24 degrees, screens larger, the words
  flat below it.
- **E. A deck of sheets.** The three screens stacked; the front one is dealt away to reveal the next.

My recommendation: **C** for the clearest look at the product, with **B** as the more distinctive alternative if you
want the section to carry the brand's story. On phones C becomes the three tabs over one screen, swiped or tapped.

## 8. Build plan, once you have chosen

1. A spec, `docs/specs/templates-round-6.md`, with acceptance criteria; each criterion becomes a test first.
2. Fonts: static OFL instances for the PDF path, latin and latin-ext, licences checked; a test that every PDF embeds
   its fonts as TrueType.
3. Templates: port the prototypes from `docs/design/round-6/prototypes` into `packages/documents/src/templates` (they are already written against
   `DocumentView`), add them to `TEMPLATE_LIST` with who each is for and its feel, keep the retired ids rendering.
4. Tests: approved images for each new template (UK VAT page 1 and the long fixture's page 2), and checks for a credit
   note, no logo, a very long business name, Ghana's three taxes, reverse charge, VAT in sterling and one page for the
   sample.
5. The payment link as a real link in every template (today it prints as text), with Mark's button style available
   to the others.
6. The picker in Settings: filters by kind of business and feel, previews with the business's own details as today.
7. The website's templates section showing the new range.
8. The line and the slab, as chosen.

## 9. Your decisions

1. Which of the ten go in the first release: all ten, or a first six?
2. Retire Studio, Poster, Counsel and Ledger from the picker?
3. The line: B, C or another?
4. The app below the hero: C, B or another?
5. May I change the registration wording for Scottish and Northern Irish companies?
6. Static fonts for PDFs from now on?
