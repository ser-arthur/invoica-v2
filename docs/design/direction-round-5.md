# Design direction: round 5

Status: on the design canvas "Invoica design direction", page "Round 5", for Kobby's review, 22 October 2026, close to midnight. Rounds 1 to 4 stay on their own pages. Nothing here is in the app yet.

## The logo, decided in round 4

- The name is the logo: "invoica" in Sora ExtraBold, no cedilla and no full stop.
- The first i is a slip: a wider stem with its top right corner turned, the fold in green, under a round green dot. The second i is a plain stem with a dark dot, so the colour sits in one place.
- That first i, alone on Night, is the app icon and the browser tab.
- Below 34 pixels the fold is one flat green; above, it carries a light gradient.
- Drawn as exact vector by `docs/design/direction-4/i_document.py` (concept `slip`, `second='ink'`).

Rejected along the way, and kept on the Round 4 page: the guilloché coils (no meaning to him), the seal, the monogram, the folded v (his preference moved to the i), and three other ways of drawing the i.

## What round 5 adds

**The sheet is the artefact.** A page with its corner turned: the slip in the logo, the corner of the owed card and of the invoice's "Still to pay" card, the big tilted sheet on the website, faint line-drawn sheets behind dark panels, and the invoice that holds the details on the website. The coils are gone everywhere.

**The crease.** One diagonal fold across a big headline. Words before it are Night (white on dark); past it they turn green, so "paid." always lands past the fold. Used twice: the website's hero and the sign-in panel. Drawn as two thin lines, lime and a hairline, with the headline set twice and the second copy clipped to the far side of the line.

**Folded slabs.** Bars drawn as sheets folded along their right edge: a front face and a sloped face. At the foot of the website's hero they chart Linden & Rowe Studio's money in, May to October, shading from lime to teal. On the dashboard the same shape draws the money-in chart, past months in grey and the current month in green.

**The page as an invoice.** The website's grid of six feature cards is gone. The same six details are line items on an invoice numbered INV-0001, each at £0.00 during early access, with a total. The sign-up is the invoice's tear-off slip, below a dotted cut line: the form on one side, the remittance details on the other (pay to Invoica, reference early access, amount £0.00).

**Editorial touches.** Two short notes in the right-hand columns above the hero; the headline left, a statement and one button right; invoice numbers running up the left edge of the hero in small rotated type. No eyebrow pill, no centred hero with two equal buttons.

## Screens on the canvas

The website at desktop and phone width; the dashboard light, dark and on a phone; the invoice list, an invoice, the editor and sign in, all with the new logo.

## Next

His reaction, then the build: tokens and fonts in `globals.css`, the logo and icon as SVG components, the sheet, crease and slab as shared components, then each screen with its tests and the accessibility checks in both themes, and the landing page.

## His notes of 23 October, and the website as built

- The faint file icons on the owed card meant nothing beside a card that already has its corner turned. Gone everywhere. The sheet stays only where it is a real page: the logo, the owed card's corner, the tilted sheet under the app and the invoice that holds the details.
- The steps were bland. Each now has a large numeral, shaded from leaf green to teal down the page; status pills beside them were tried and dropped, since each heading already says what happens.
- The crease: the two lines closer together, the main line a lime to teal gradient. Past it the words were tried in silver and dropped on his word; they now turn green in one sweep from leaf green to teal, the colours of the slabs.
- White cards on white panels: each step's panel is tinted, from lime at the first step to teal at the fourth, and the owed card is dark. The phones show the app light and dark side by side.
- The copy tells one story: a business management tool that makes a new business look established from its first invoice, then follows every invoice until it is paid.
- Built on the branch `feat/website` (`docs/specs/website.md`). The logo is decision 0012.

