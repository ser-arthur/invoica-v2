# Round 7: the invoice templates, second pass

25 October 2026. Kobby's notes on the round 6 templates (`round-6-templates.md`), and what changed. These are still
prototypes in `docs/design/round-6/prototypes`; nothing in the product has changed.

Canvas page: **Invoice templates, round 2**. New directions sit side by side; each rework sits beside its first
version.

## 1. The notes and what was done

| Template | Note | What changed |
| --- | --- | --- |
| Sticker (Crumb & Kettle) | Keep | Real-looking details only |
| Riso (Odd Hours Press) | Like the idea, the logo could be better | A sun and moon printed in two inks, overprinting where they meet |
| Marquee (Night Shift Sound) | Keep the ticket; try other type for the event; colours not right; the contact area loose; make the details real | Three pairings: Big Shoulders on ultramarine, Anton on hot pink, Bricolage in sentence case on tangerine. The contacts now sit in one ruled row under the title. The ticket's amount takes the brand colour only where it reads on the near black (WCAG contrast 3 or more), else white |
| Atelier (Wilder & Rose) | Don't like it; explore florists, stylists, interiors and weddings again, with options | Replaced by three: **Bloom** (florists and cake makers: Bodoni Moda caps, wild roses in fine line on a blush band, the balance on a soft pill), **Arch** (wedding planners, stylists and venues: warm paper, the name in an arched window in the brand colour, Cormorant Garamond, the balance under a smaller arch, contacts at the foot like stationery), **Feature** (interior designers: the job as a magazine headline in Instrument Serif with a standfirst, the amount due on a band of the brand colour) |
| Mark (Parallax Labs) | Fine; explore another for studios, agencies and developers | Kept. Added **Billboard**: the studio's name fills the width of a block of its own colour, black on the colour where that reads better, Funnel Display and Inter Tight, the amount due large on black |
| Grid (Hollis Lane) | Remove the ruler marks; close the gap between logo and name; maroon for the red; a more premium amount due and page | No ruler. Logo and name in one lockup. Maroon. The amount due in a framed cell (a fine ivory rule inside the colour) with the number beside the label, lighter weights, warmer greys, finer rules |
| Trade (Kestrel Roofing) | The type (the amount due) didn't sell it; rule weights inconsistent; more premium | Archivo wide (125 per cent) in place of condensed. One rule weight throughout (0.75 pt), with the brand colour only as the 2 mm line under a charcoal band and the amount due panel. Customer, job and dates in three columns |
| Statement (Penrose Bookkeeping) | Try again, better | Rebuilt: a summary across the top (amount due, due date, where to pay with sort code and account labelled), then the lines like a bank statement, the description left and the amount right with its working under it (4 staff × £12.00). Hanken Grotesk, Plex Mono for bank numbers only |
| Practice (Ashdown Kerr) | Bespoke but doesn't catch the eye; the colours or bland | A navy letterhead with a gold hairline, the A&K mark and the name in Libre Caslon in ivory, warm paper, the amount due in a gold double-ruled frame, how to pay as a sentence beside it |
| Heritage (Thistle & Oak) | Iterate, better colours | Parchment page, a gold double frame with a diamond at each corner (repeats on every page), the name arched over a medallion like a bottle label, the number and the closing line in oxblood, bank details as labelled pairs |

All fifteen render the sample on one page, the long fixture over three pages (Heritage two) with the totals and the
amount due kept together, the UK VAT fixture, and a page without a logo.

## 2. Sample details that look real

No `.example` addresses, "Example Bank" or zeros anywhere in the samples. Each invented business has a real-looking
domain, a phone number from the ranges Ofcom keeps for drama (they never connect), a real UK bank's name and a sort code
in that bank's range with an invented account number, and invented company and VAT numbers.

Before any sample goes somewhere public (the website, the picker's previews), the account, company and VAT numbers should
be made ones that fail their check digits, so none can be someone's real account or company.

## 3. Logos

Each business uploads its own; these are drawn for the invented businesses so the templates can be judged with a
real-looking mark (board "The drawn logos"). Arch, Practice, Trade and Billboard put the logo on a dark or coloured
ground, and the prototypes use a light version drawn for the purpose. That makes round 6's logo question (a white tile
behind the logo, or a second, light upload) more pressing.

## 4. Ways of building worth keeping when porting

- Billboard sizes the name to fill the width from the font's advance widths (`funnel800.json`, taken from the font
  file), with no measuring in a browser.
- A page ground set on `@page` reaches the paper edge in Chromium's PDF (Arch, Practice, Heritage).
- Heritage's frame, inner rule and corners are backgrounds on the frame, so they repeat on every page.
- Text colour on a brand colour is chosen by contrast in Marquee and Billboard, as `readableOn` does in the product.

## 5. Fonts added

Bodoni Moda, Jost, Cormorant Garamond, DM Sans, Schibsted Grotesk, Funnel Display, Inter Tight, Big Shoulders Display,
Anton, Hanken Grotesk, Libre Caslon Text and Libre Caslon Display, with Instrument Serif and Bricolage Grotesque reused.
All are published under the SIL Open Font License; each licence is checked when the fonts are added (step 2 of the
round 6 build plan).

## 6. Your decisions

1. Florists and weddings: Bloom, Arch, Feature, or more than one (they suit different trades)?
2. Marquee: which pairing, A, B or C?
3. Studios: add Billboard beside Mark?
4. Grid, Trade, Statement, Practice and Heritage: approved, or more notes?
5. Logos on dark grounds: a white tile, or ask for a light version?
6. Still open from round 6: static fonts for PDFs. The registration wording was approved on 25 October and fixed on
   `fix/registration-wording` (Scotland for an SC number, Northern Ireland for an NI number); the samples on the canvas
   were rendered before it, so Practice and Heritage still read England and Wales there.
