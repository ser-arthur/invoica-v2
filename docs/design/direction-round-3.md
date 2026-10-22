# Design direction: round 3

Status: on the design canvas "Invoica design direction", page "Round 3", for Kobby's review, 22 October 2026, late evening. Rounds 1 and 2 stay on their own pages for comparison (`direction-round-1.md`, `direction-round-2.md`). Nothing here is in the app yet.

## What he said about round 2

- He likes the big, clean type and the whitespace, and the dark owed card.
- The diagonal hairlines are bland. He asked for a pattern with some meaning.
- The overdue detour on the dashboard was hard to read at first glance. The idea of a journey made sense; the drawing of it did not.
- The ç graphics did not make sense, and glass should only appear where it carries information.
- Invoica has no logo yet, and he is open to one.
- Wrapping and columns need managing as a whole, on desktop and on phones.

## What we looked at

- Banknote and cheque line work (guilloché): Mother Design's identity for USDC builds its core graphics from guilloché tied to the logo, and Elisa Exchange uses guilloché made in Excentro for the same reason. It is the visual language of money that can be trusted, which suits an invoicing product.
- Wise's rebrand, which turned one detail of the mark into a graphic used everywhere.
- The status words people already know from accounting tools, such as QuickBooks' "Overdue" and "Not due yet".

## The system

**The pattern.** Guilloché: fine woven rings and bands in the blend, generated from sine waves by `docs/design/direction-3/guilloche.py`. The rosette appears where money is shown or settled: the owed card, an invoice's "Still to pay" card, the sign-in panel, the website's phone band and closing card. The band runs along the edges of a sheet, as on a cheque. One pattern per screen, faded with a mask, and never behind text that must be read at small sizes.

**The mark.** Three options, on light and dark grounds, at app sizes and beside the wordmark:

- A. The seal (recommended): the "i." inside a ring woven like the pattern, as on a banknote seal or a stamp marked paid. It ties the logo to the pattern, which is what makes the USDC and Wise identities hold together.
- B. The monogram: the "i." alone in the green.
- C. The page: a sheet with its corner turned, the fold in the blend.

The wordmark stays "invoiça." in Sora ExtraBold with a green full stop. The ç is a letter in the name and nothing more: no ç graphics, icons or large brand moments.

**Money at a glance.** The dashboard's owed card leads with the total, then one bar split into "Not due yet" and "Overdue", each width set by its amount, with the figures beneath. A row below gives paid in the last 30 days, drafts not sent, and invoiced this month. The lime button names the next action: "Chase the two overdue".

**Status.** Lists use plain labels: Paid, Sent, Overdue, Draft, Part paid, each with its own tint. A single invoice shows its steps on its own page as a four-step tracker (Draft, Issued, Sent, Paid), with dates under the steps already taken and the due date under the one still to come.

**Glass.** Only on dark grounds and only when it holds data: the dark dashboard's panels and the three event cards on the sign-in panel (a payment received, an invoice sent, a reminder sent).

## Screens on the canvas

Foundation, dashboard (light, dark, phone), the invoice list, an issued invoice, writing an invoice, sign in, and the website at desktop and phone width.

## The website

- **Hero.** The headline, then one large tilted sheet with the band along its edges and three real screens standing along a simple line: Write, Send, Get paid.
- **Five numbered steps.** Write, Issue, Send, Remind, Get paid. The numbers are there because the content is a sequence. Each step pairs a short text column with a picture of the real part of the app; Issue uses the same four-step tracker as the invoice page.
- **Get paid** shows the owed card full width on desktop and the phone version of the card on phones.
- Then the seven layouts as a fan of three invoices, the phone on a dark band over the rosette, the details, and a closing card with the seal over the rosette.

Layout rules, applied across the page:

- One 12-column grid at 1280 pixels wide with 48-pixel margins (20 on phones). Text takes five columns, pictures seven; pictures and fans stay inside the content edge.
- Headings break by phrase ("Write it once. / See it as they will."), so no line ends on a stray word at any width.
- Every picture area has a fixed height and its contents are centred in it, so the text column sits on the picture's middle.
- On phones the grid stacks, section spacing drops from 56 to 36 pixels, the header keeps the full button on one line, and the details list puts each marker beside its heading.

## Next

His choice of mark, then the build: tokens and fonts in `globals.css`, the mark and wordmark, the pattern as SVG assets, the shell, then each screen with its tests, the accessibility checks in both themes, and the landing page.
