# 0012. The logo

- **Status:** Accepted, 22 October 2026 (Kobby), on the design canvas, "Round 4" page.
- **Related:** `docs/design/direction-round-5.md`; the drawing is `docs/design/direction-4/i_document.py` (concept `slip`, `second='ink'`).

## Context

The old app's mark was the word "invoiça." with a cedilla and a full stop. Rounds 1 to 4 of the design direction tried a guilloché pattern, a seal, a monogram and a folded v. Kobby wanted the name to stand alone and to carry the idea of a document in it.

## Decision

- The logo is the name, "invoica", in Sora ExtraBold, with no cedilla and no full stop.
- The first i is a slip: a wider stem with its top right corner turned, the fold in green, under a round green dot. The second i is a plain stem with a dark dot, so the colour sits in one place.
- That first i alone, white on Night (#09191C), is the app icon and the browser tab.
- Letters take the text colour. The fold and the first dot take the accent: #37C66B on light grounds, #46DA80 on dark. Below about 34 pixels tall the fold is one flat green; larger, it carries a light gradient.

## Consequences

- `apps/web/src/components/logo.tsx` draws it from path data written by `docs/design/direction-5/logo-svg.py`; `Wordmark` in `ui.tsx` now draws the logo, so every screen that showed the old word shows the new one.
- `apps/web/src/app/icon.svg`, `favicon.ico` and `apple-icon.png` are the slip i on Night, from the same script.
- The logo is never retyped or redrawn by hand: changes go through the script.
