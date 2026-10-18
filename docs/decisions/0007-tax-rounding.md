# 0007. Tax rounding

- **Status:** Proposed, 18 October 2026. Built as described so the product works; Kobby to approve or change.
- **Related:** `0004-launch-market.md`, `docs/specs/tax-uk.md` (section 5), `docs/specs/tax-ghana.md` (presets), foundation section 4 ("Decide once whether tax rounds per line or per invoice").

## Context

The audit found four money calculations that disagreed by a penny, partly because no rounding rule existed (`docs/audit.md`, W1 to W3). The foundation asks for one rule, recorded and tested.

What the official sources allow (checked 18 October 2026):

- **UK, VAT Notice 700, paragraph 17.5.** The VAT total on an invoice may be rounded down to a whole penny. If VAT is worked out per line, each line is rounded down to 0.1p, or to the nearest 1p or 0.5p, and the method must be used consistently. Paragraph 17.6: retailers must not round down at line or invoice level, but may round each calculation to the nearest amount. HMRC's manual (VATREC12030) defines nearest as 0.5p and above going up.
- **Ghana.** No rounding rule was found. GRA's worked example computes NHIL, GETFund Levy and VAT separately on the invoice's standard-rated value.

## Decision

The core supports three modes (`half-up`, `half-even`, `down`) at two levels (`line`, `document`), and every figure goes through `@invoica/core`. Each organisation has one setting, fixed per business so it is used consistently. Defaults by country:

| Country | Level | Mode | Why |
| --- | --- | --- | --- |
| United Kingdom | Per line | Nearest penny, 0.5p up | Paragraph 17.5.1, second option. Allowed for every business, retailers included, so one rule fits all UK users |
| Ghana | Per document, per tax | Nearest pesewa, half up | Matches GRA's worked example; no official rule found |
| Elsewhere | Per line | Nearest unit, half up | The most common commercial practice |

UK businesses that are not retailers may switch to "per document, rounded down" (paragraph 17.5). Settings explains the choice in plain words and does not offer UK users the combinations HMRC does not describe.

A document stores the level and mode it was computed with, so an issued invoice never changes if the setting does.

## Consequences

- Tests pin both UK options and the Ghana default (`packages/core/test/presets.test.ts`, `totals.test.ts`).
- The audit's worked examples W1 to W3 are tested at document level with half up, as specified there; at the UK default (per line) W1's VAT is the same £22.00.
- Per-unit rounding (paragraph 17.5.2, for price lists) is not built. Amounts are whole minor units; a per-unit mode would need more precision and its own decision.
- Retailer status is not yet captured. Until it is, the "round down" option carries a note that it is for invoice traders only.
