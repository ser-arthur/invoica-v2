# The website: templates showcase, hero motion and the phone header

The owner's notes of 25 October 2026 (18:14 and 18:22) on the website after the new range of invoice templates.

## The templates section

The section says there are fifteen templates, but showed three, and only the one in front changed. It becomes a shelf.

- **Six, as designed.** A shelf of six templates, each made out for its own invented business as it was designed:
  Signature (Larkspur Analytics), Billboard (Overcast), Atelier in rose (Wilder & Rose), Marquee (Night Shift Sound),
  Trade (Kestrel Roofing) and Riso (Odd Hours Press). Each is named, with who it is for. One is in front; choosing
  another (pointer, tap or keyboard) brings it to the front.
- **Yours.** Typing a business name or choosing a colour redraws all six with the visitor's name and colour, keeping
  each template's own sample work. "Back to the examples" puts the six back as designed.
- **All fifteen.** "See all fifteen" opens the whole range, each named with who it is for.
- **Colours.** Eight chosen colours, one of them pale (a yellow), so the contrast rule and Marquee's second colour show.
  No colour picker on the website; the app has the full one.
- The section's heading keeps "Fifteen layouts. Your logo, your colour."

## The hero

One sequence when the page loads, played once:

1. The header settles in.
2. The three lines of the headline rise into place, each whole: no letter is cut or missing at any moment.
3. The crease draws from its foot at the bottom left up to the top right; the words past it turn grey as the line
   reaches them, never before.
4. The two facts, the sentence and the buttons settle in.
5. The slabs rise, left to right.

The whole sequence is under two seconds. With reduced motion asked for, the page is shown settled, with nothing moving.

## On phones

- The header holds the logo and the menu only; "Create free account" moves into the menu. The hero's own button stays.
- Type steps down on phones: body text 16 px, the hero's sentence 19 px, labels 13 px.

## Sample details in public

Every invented business shown in public (the showcase, the demo, the picker's previews) has details that look real but
can belong to no one: VAT numbers that fail the HMRC check digits (both the 97 and the 9755 schemes), bank account
numbers that fail the Vocalink modulus check for their sort code, company numbers far above any Companies House has issued (29 million or more; SC990000 or more in Scotland),
phone numbers from the ranges Ofcom keeps for drama, and domains that are not registered to the business named.

## Acceptance criteria

Each is a test. End-to-end in `apps/web/e2e`; sample details in `packages/documents/test`.

1. The templates section shows a shelf of six named templates in the order above, each a rendered invoice with its
   own business; choosing one brings it to the front, by pointer and by keyboard.
2. Typing a business name redraws all six with it; choosing a colour redraws all six in it; "Back to the examples"
   restores the six businesses.
3. "See all fifteen" shows the fifteen, named, in the picker's order.
4. There are eight colours to choose, each named for screen readers.
5. Loading the home page, no letter of the headline is hidden or cut: the near and far copies stay aligned at every
   moment of the sequence (sampled frame by frame), and the crease is drawn from its bottom left end.
6. The header takes part in the load sequence; with reduced motion nothing on the page animates on load.
7. At 390 pixels wide the header shows the logo and the menu, and the menu holds "Create free account" and "Sign in".
8. At 390 pixels wide body text is 16 px and the hero's sentence 19 px.
9. Every VAT number in the public samples fails both HMRC checks; every company number is 29,000,000 or more (or SC990000
   or more); the bank details were checked against the Vocalink tables (recorded in
   `docs/design/round-8-kept-templates.md`).
10. The existing website, motion and accessibility tests pass at both widths.
