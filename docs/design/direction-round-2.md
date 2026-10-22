# Design direction: round 2

Status: on the design canvas "Invoica design direction", page "Round 2", for Kobby's review, 22 October 2026, evening. Round 1 stays on its own page for comparison (`direction-round-1.md`). Nothing here is in the app yet.

## What he decided after round 1

- The colour direction is right: his green #37C66B and mint #6CE4A2, grown into lime and teal, on Mist, White and Night. Dark mode carries the glassy feel he wanted.
- The cubes had no meaning. He agreed to use the three ideas together: the route, glass sheets and the cedilla.
- Fonts: Sora and Onest.
- The wording is open to change wherever it reads more naturally.

## The system

**Type.** Sora for the wordmark, headings and money (800 for headings and figures, 700 for section titles). Onest for everything read and typed, with tabular figures. Headings use balanced wrapping, so no line ends on one word.

**The wordmark.** "invoiça." in Sora ExtraBold, as in the old app. The cedilla's hook carries the blend; the full stop is Green (Mint on dark grounds). The app icon is "ç." on Night.

**The route.** The fine lines of the reference, given a job: the path every invoice travels, Draft, Issued, Sent, Paid, with overdue as a coral detour that still leads to Paid. It is information wherever it appears:

- the dashboard's hero shows where the money is as a route (drafts, with clients and not due, overdue, paid in the last 30 days), vertical on phones;
- every invoice row in a list carries a four-stop track in place of a status pill, with its words beside it;
- an invoice's page opens with its own route: what happened and when, and what comes next (the reminder, the due date);
- the editor shows the first stop, Draft, beside the save state.

Stops: done is a Night dot; the current stop is a ring; a future stop is hollow; overdue is a coral square on a dotted line; paid is Lime with a tick.

**Glass sheets.** Layered tinted sheets in the blend, for dark grounds: the dark dashboard's hero, the sign-in panel, the website's phone section.

**The cedilla.** The hook in the wordmark, the icon, and one large brand moment (the website's closing card).

## Screens on the canvas

Dashboard (light, dark, phone), the invoice list, an issued invoice, writing an invoice, sign in, and the website at desktop and phone width. The invoice itself keeps the business's own colour everywhere.

## The website

- **Hero.** One large sheet, tilted, with the route across it and three real screens standing along it: the editor at Draft, the invoice at Issued and Sent, the dark dashboard at Paid. Real screens, no device frames.
- **The body follows one invoice.** Five stops, each with a small route showing progress: write it, issue it, send it, remind them, get paid. Each stop shows the real piece of the app at a readable size.
- Then the seven layouts, the phone (in a simple glass outline on a dark band), the details that matter (currencies, credit notes and refunds, client history, saved items, export, exact totals), and a closing card.
- The page works at phone width: the section pictures scale as one piece and the grid stacks.

Kept from the old site: its order (a promise, proofs, a feature strip, phones, the free plan) and its brand line about invoices looking like your business. Dropped: time tracking (not in v2), the dollar price, the empty phone picture.

Headline: "Every invoice, all the way to paid."

## Next

His reaction on the canvas, then the build: tokens and fonts in `globals.css`, the wordmark and icon, the shell, then each screen with its tests, the accessibility checks in both themes, and the landing page.
