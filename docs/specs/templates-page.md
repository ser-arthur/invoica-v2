# The Templates page

The owner's notes of 29 October 2026, 03:05 and 03:26. The home page was beginning to hold too much: under the shelf of
six, "See all sixteen" opened the whole range on the page itself (on phones the sixteen joined the shelf's row). Asked
whether visitors need to see every template at all, the owner agreed the recommendation (`docs/BLUEPRINT.md`, open
question 13): keep the six picks on the home page and give the whole range a page of its own, `/templates`.

## Why both

The home page's heading says "Sixteen layouts". A visitor checking whether there is one for their kind of work is the
one the whole range convinces, so it stays one click away. On the home page it would compete with the sign-up and give
the weaker layouts the same billing as the six picks.

## The page

- **Head.** The website's header and footer. A green label "Templates", the heading "Sixteen layouts. Your logo, your
  colour." and a short paragraph.
- **Try it.** The home page's controls, the same in every way: a business name and the eight colours, which redraw all
  sixteen at once, and "Back to the examples". On a wide screen the controls stay in sight under the header while the
  page scrolls, so a colour can be tried against any template.
- **The sixteen.** Every template in the picker's order, each made out by its own invented business as on the home
  page's range (`RANGE` and `SHOWCASE` in `packages/documents/src/showcase.ts`), each named, with who it is for. Three
  across beside the controls on a wide screen, three under them on a narrow one, two on a phone. Each rises into place
  as it arrives, as the rest of the site's pieces do.
- **Foot.** A line and "Create free account", leading to sign up.
- No "Use this one" yet: opening sign up with a template already chosen needs a change to setting up an account, for a
  later round.

## The links to it

- The header's "Templates", on wide screens and in the phone menu, and the footer's, lead to `/templates`, as Pricing
  leads to its page. On `/templates` the header's link is current (`aria-current="page"`); on the home page it is
  current while the six are in view, as before.
- On the home page, "See all sixteen" under the six is a link to `/templates`. The sixteen no longer open on the home
  page, and on phones the shelf's row holds the six only.

## Acceptance criteria

End-to-end in `apps/web/e2e`.

1. `/templates` shows sixteen templates in the picker's order, each a rendered invoice named with who it is for, each
   made out by a business of its own, none of them the example studio.
2. Typing a business name redraws all sixteen with it; choosing a colour redraws all sixteen in it; "Back to the
   examples" restores the sixteen businesses.
3. The header's "Templates" (in the menu on a phone) and the footer's lead to `/templates`; there, the header's link
   is current with `aria-current="page"` and is the only current link.
4. The home page shows the six, and its "See all sixteen" is a link to `/templates`; the home page holds no more than
   six rendered invoices in its templates section, at both widths.
5. On a wide screen the controls stay in view under the header with the sixteenth template on screen.
6. The page ends with "Create free account", leading to sign up.
7. The page passes the automated accessibility checks, its scroll-linked motion follows the page's scroll, no words
   run past the edge of a phone (375, 360 and 320 pixels) and its title is "Templates".
