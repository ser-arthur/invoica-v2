# Round 11: Signature's Night head in the business's colour

27 October 2026, 16:34. The owner noticed that when a business's colour changes, only two parts of Signature's Night
head follow it: the turned corner and, lower down, the tint behind how to pay. The number past the crease, the labels,
the due date and the crease itself stay in Invoica's mint and lime, so an orange business gets an orange corner beside
a green number. He asked whether more of the head should follow the colour, in a way that fits it, without everything
turning that colour. This is a proposal. Nothing in the product has changed.

The mockup is `round-11/signature-colour.ts`. It renders Larkspur Analytics (the website shelf's Signature) in its own
green and in four of the website's colours (orange, navy, plum and rose), today's head beside the proposal, and the
boards `signature-colour-heads.png` and `signature-colour-pages.png` are made from those renders.

## The proposal

The head's accents come from the business's colour, made light enough to read on Night without losing its hue:

| Part | Today | Proposed |
| --- | --- | --- |
| The number past the crease, "VAT invoice" and "Amount due" | Mint `#6ce4a2` | The colour at OKLCH lightness 0.80, keeping its hue and at least 0.11 of chroma |
| The due date | Lime `#cff26a` | The colour at lightness 0.87, chroma at least 0.10 |
| The crease line | Lime to green to teal | The due date's tint, to the accent, to the colour at lightness 0.68 |
| The turned corner, how to pay's tint, the rule over the amount due | The business's colour | Unchanged |
| "Powered by" and Invoica's wordmark | Invoica's colours | Unchanged |

Invoica's character stays in the structure: the Night head, the crease through the number, the lighter band past it,
the turned corner and the wordmark at the foot. The colour on the page is the business's.

For a business whose colour is near grey or black (little chroma), the accents would go silver, not take on a hue the
business never chose. A business in Invoica's own green looks as it does today.

## To decide

1. Proposed or today's.
2. If proposed: the same for Route on Night, whose route line is in Invoica's lime and teal today.

Built, the change goes through `docs/specs/invoice-templates.md` with its criteria (contrast of every accent on Night,
the hue kept, the neutral case), and the visual baselines for Signature are approved again.

**Chosen and built, 29 October, 14:48: proposed**, at the owner's word ("it should change"), with Route on Night the
same way (`docs/specs/invoice-templates.md`, "Signature's Night accents in the business's colour", criteria 24 to 28).
The rule is `liftForNight` in `@invoica/core`.
