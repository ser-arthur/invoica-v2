# Round 13: Why Invoica's three points

29 October 2026, 00:49. The owner asked for other, more creative ways to show the three points in Why Invoica (your
identity, financial clarity, client management). Today each point is a short coloured rule, lime, green or teal, over
its label, heading and paragraph. Mockups only; the product is unchanged, and so are the words.

`round-13/why-points.cjs` rearranges the live section on the development server and screenshots it at 1440 and 390
pixels. `round-13/boards.cjs` puts each option's two renders on a board (`round-13/why-*.png`). The website has one
palette in either app theme, so there is no Dark board.

| Option | What it is |
| --- | --- |
| A, a small working piece over each point | In place of each rule: one invoice in three businesses' colours, what is owed split into paid, due and late, and three clients with their balances. |
| B, one invoice, each point drawn to its part | A Signature invoice in the middle, fading out below its lines. A fine line runs from each label to its part: the business's name in the head, the amount due, "Billed to". On a phone the invoice comes first, with a dot on each part matching the dot by each label. |
| C, filed | The rule runs the whole width once, lime to teal, and each label sits on a tab in its colour, like dividers in a file. On a phone each point has its own rule and the tabs step across, left, middle, right. |
| D, each point on its own sheet | Three white sheets with a turned corner in each point's colour, laid down a little loose. |

Motion, if built: A deals the invoices out, fills the bar and brings the rows in; B draws the lines out to the invoice
one after another; C draws the rule from left to right and raises each tab as the line reaches it; D brings the sheets
down loose and squares them up.

## Recommended

C. The page shows each of the three in depth around this section: the dashboard just above it, invoices in How it
works and the templates, and the clients section. Why Invoica works best as the short statement between those pictures,
and C gives it a character of its own, filed and in order as its heading says, without adding a fourth picture of the
same things. It is also the smallest change and reads well on a phone.

B is the one to choose if the section should carry a picture of its own. It makes "one place" literal. Built, it would
use an invoice other than INV-0044, which How it works shows at its third step.

A repeats the dashboard's figures a few hundred pixels below the dashboard. D's white sheets read as cards, and their
loose angles sit apart from the precision of the rest of the site.

## Second pass, 01:51: C made properly, and A in C

The owner leaned between A and C. B looked intuitive at first, but one "Billed to" stands for one client, which is not
how keeping every client in order appears; A shows what actually happens. He liked the folder tabs but felt they could
be made better. `round-13/why-tabs.cjs` renders four ways (`round-13/why-tabs-*.png`, by `boards.cjs ... tabs`):

| Option | What it is |
| --- | --- |
| C1, the same line, with proper tabs | The tabs have soft shoulders, as a folder's do, and rise out of the line in its own colour where each stands. |
| C2, each point on its own divider | A divider in a pale tint of the point's colour (`#e8f5c4`, `#d5f0dd`, `#cfe9e6`), its tab part of the same sheet; the tabs step left, middle and right. |
| C3, a file of dividers | The three stand one in front of the other across the full width, their tabs stepping across in thirds, the heading on the left and the words on the right. |
| C4, the file with A's piece on each divider | As C3, with A's piece on the right of each divider; on a phone the piece sits above the heading. |

Recommended: C4. It is both of the owner's leanings at once: the file says "in order" and each divider shows what is
in it. Seen with How it works below it, the tints sit in the same family as that section's stage panels without
competing. Built, the money piece would show figures of its own, since the same studio's dashboard just above already
shows £6,420.00 owed with the same bar.

## Third pass, 01:59: the colour on the tabs only

The owner agreed C4, and asked to try first keeping each point's colour only where its name is written, the tab, with
the rest of each divider white and given depth on the top and sides so it stands out from the ground. If it does not
work, C4 as it is. `why-tabs.cjs` renders three (`round-13/why-colour-*.png`, by `boards.cjs ... colour`):

| Option | What it is |
| --- | --- |
| W1, white with depth | White dividers, the tabs in lime `#cff26a`, green `#6cd47a` and teal `#2fb3a6`, a fine edge and a soft shadow on the top and sides, heavier where a divider stands in front of the one before. |
| W2, white with the colour along the top edge | As W1, each tab's colour carried along its divider's top edge as a 3 pixel line, with lighter shadows. |
| W3, Night | The dividers in Night `#0f2427`, the tabs in their colours, the words and pieces in white. |

Recommended: W2. In W1 the three white dividers run together into one white block, more so on a phone; the shadow has
to do all the separating, and a shadow strong enough to do it looks heavy. The line along each top edge does it
cleanly, makes each tab and its divider one sheet, and brings back the coloured rules the section has today. W3 is
striking, but it follows the dashboard's Night straight after, and dark on dark divides no better than white on white.

## Fourth pass, 02:38: W1 and W3, stepped

The owner asked to take W1 and W3 further, each divider wider than the one before so that one looks to stand behind the
other. `why-tabs.cjs white-step` and `night-step` (`round-13/why-step-*.png`, by `boards.cjs ... step`): the first
divider 44 pixels narrower each side than the last and the second 22 (12 and 6 on a phone); the ones further back a
shade greyer in white (`#f6f8f7`, `#fbfcfb`, `#fff`) and a shade darker in Night (`#0a1c1f`, `#0c2023`, `#0f2427`).

The steps answer W1's weakness: each divider's corners and sides now show past the one behind it, so the three no longer
run together, without a heavier shadow. Recommended: white. After the dashboard's Night, a light file keeps the page's
rhythm, and the tabs' lime, green and teal are at their clearest on white.
