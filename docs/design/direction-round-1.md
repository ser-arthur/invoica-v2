# Design direction: round 1

Status: on the design canvas "Invoica design direction, round 1" for Kobby's review, 22 October 2026. Nothing here is in the app yet; once he says yes it becomes tokens in `apps/web/src/app/globals.css` and components, screen by screen.

## What prompted it

Kobby, 20 October: the light app reads as bland; the green is not his green; the app is green everywhere because the brand is green; the logo sits in the wrong place; the old dark app was glassy and nicer to look at. He likes PayPal's black and white with imagery and artefacts. On 22 October he shared a reference he liked (lime to teal colour blends, geometric blocks, fine diagonal lines, bold black type on light grey) and asked for the colour scheme to be built around something like it, for the app and the marketing site.

## His green

The old app (`static/css/input.css` in the Flask app) used **#37C66B** as its brand colour, with the logo in a gradient from #37C66B to **#6CE4A2**, on a deep teal black (#09191C). The new app has been using #0D7550, a much darker forest green. The reference's lime and teal sit either side of his green and mint, so the new palette grows out of his own colours.

## The system

| Token | Hex | Use |
| --- | --- | --- |
| Night | #09191C | Type, primary buttons, dark panels (the old app's ground) |
| Slate | #56676A | Second text (5:1 on Mist, 5.9:1 on White) |
| Line | #D6DDDB | Hairlines |
| Mist | #ECEFED | The ground |
| White | #FFFFFF | Surfaces |
| Lime | #CFF26A | The primary button on dark grounds; the start of every blend |
| Green | #37C66B | His brand green; blends and the cube |
| Mint | #6CE4A2 | His second green; blends, "not due yet" |
| Teal | #138C86 | Blends; large text only on light grounds (3.5:1) |
| Deep | #0C3D40 | The dark end of blends |

Status colours: Paid #0E6B3A on #DCF5E6; Overdue #A8281E on #FBE5E2; Sent Night on #E3E9E7; Draft outlined; Part paid #45560A on #EEF8C9.

On an app screen, about seven tenths is Mist and White, about a fifth is Night, and colour is the remainder: the owed panel, the newest bar on a chart, the new-invoice button on phones.

**Type:** Archivo, one family. Expanded (width 125) and extra bold for headlines and figures; normal width for everything read and typed. Figures are tabular; pence are set smaller and quieter.

**The wordmark:** "invoiça" in expanded Archivo with the full stop drawn as a small isometric cube in the blend. The cube alone is the app icon. On the app, the wordmark sits at the left of the bar, the sections in a centred group, and the business's own logo and name at the right.

**Artefacts:** isometric blocks in five blends (lime, green, mint, teal, night) and a sheet of paper lying flat, with hairlines at 30 degrees. They are drawn by `direction-1/iso.py` (`python3 iso.py <folder>`), which writes the SVGs in `direction-1/art/`. Blocks appear in a few places only: the website, the owed panel and empty states. Charts stay flat and honest.

**Dark mode:** Night with soft green and teal light at the edges, glass panels (white at 4.5 per cent with a hairline edge and blur), Lime for the primary button.

## On the canvas

Foundation; the website at desktop and phone width; the dashboard in light, dark and on a phone; an issued invoice. The invoice on that page keeps the business's own colour, so the app around it never competes with the client's brand.

## Next

Kobby's reaction, then: tokens and fonts in the app, the shell (bar, phone tab bar), dashboard, lists, invoice page, editor, settings, auth pages, then the landing page. Every screen keeps its tests; the accessibility checks run on both themes.

## His reaction, 22 October evening

The colour direction is right, and the dark mode carries the glassy feel he wanted. Two open points: the fonts, and the cubes, which read as decoration with no meaning.

On the canvas, beside the foundation:

- **Fonts, three pairings** with the same content: Sora and Poppins (the old app: Sora ExtraBold was the "invoiça." wordmark, Poppins set everything else); Sora and Onest (recommended: Sora for the wordmark, headlines and figures, Onest for tables and forms, narrower and with tabular figures); Archivo (round 1).
- **Artefacts, three ideas** to replace the cubes: glass sheets (the invoice as layered tinted glass, for the website and dark mode); the route (the fine lines as the path an invoice travels from draft to paid, usable inside the app as real information); the cedilla (the ç's hook in the blend, for the wordmark, icon and largest moments). Recommended: all three, each with its own job.

The marketing site keeps the old site's order (a promise, three proofs, a feature strip, phones, the free plan) and its best lines, rewritten; time tracking and the dollar price go; real invoices from the seven templates come in as the proof.
