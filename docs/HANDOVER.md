# Handover

Read this first in every session. Update it at the end of every session.

## Current state (18 October 2026, night)

- **Phase 0 audit done.** `docs/audit.md`: inventory, worked examples for every money calculation, 37 issues (4 critical, 13 high, 13 medium, 7 low), what is worth keeping. Evidence in `docs/audit/evidence/`.
- **Decided by Kobby on 18 October 2026:**
  - `0001-rewrite-strategy.md`, **accepted**: a re-architecture from scratch in a fresh repository, keeping the product's intent. No tests against the old app; the audit's worked examples become the new core's first tests. The old app is dead: no fixes, keys revoked and site taken down at cut-over.
  - `0004-launch-market.md`, **accepted**: open to anyone, pound as default; every organisation controls its own tax (no tax, its own rates, several taxes per line, compound, tax-included prices); the UK and Ghana researched and built in as presets.
  - `0005-positioning-and-pricing.md`, **accepted**: v1 leads with "look established from day one", then "get paid on time"; a 30-day reverse trial into a free plan; Free £0 (3 active clients), Pro £7 a month, Studio £15 a month; the first 200 paying customers keep Pro at £5 a month.
  - `0002-stack.md`, **accepted**: TypeScript throughout; the PDF engine chosen by a spike.
- **Still proposed:** `0003-audience-and-v1-scope.md` (v1 as a correct invoice that looks exactly as intended, however long; now with line styles and the UK VAT line rule).
- **Invoice templates, round 1:** six mocks (Counsel, Receipt, Studio, Folio, Source, Plain) and a two-page invoice, on the claude.ai design canvas "Invoica invoice templates, round 1" (https://claude.ai/artifact/D6pmTfx6nkTEMLx7bkdsMs, private until shared), with notes, PDFs and code in `docs/design/`. Awaiting Kobby's reaction.
- **Product thinking** (positions, market prices, sources) lives in the claude.ai project as `claude/invoica-product-directions.md`.
- **Domain language:** `docs/domain.md`, now with tax terms.
- **The current app** is unchanged at commit `a0ef5cb`, live at `invoica-io.vercel.app`, with no real users. Secrets are dealt with at go-live (Kobby's call).
- **No new code exists yet.**

## Delivery method

**Numbered zips** (`invoica-patch-NN`): changed files, a manifest, a verify script that fails on the unpatched tree, and a delete list. Kobby applies, verifies and commits.

The switch to pull requests (foundation section 7) has not started. Step 2 is blocked: Claude's GitHub access returned "link your GitHub account to let Claude access repositories".

| Patch | Contents | Applied |
| --- | --- | --- |
| `invoica-patch-01` | the audit and its evidence, decision records 0001 and 0002, `domain.md`, `HANDOVER.md` | [Placeholder: Kobby to confirm] |
| `invoica-patch-02` | section 1 answers; 0001 and 0002 updated; 0003 and 0004 added | [Placeholder: Kobby to confirm] |
| `invoica-patch-03` | 0001 and 0004 accepted; 0002 and 0003 updated; 0005 added; tax terms in `domain.md`. Applies on top of 01 and 02 | [Placeholder: Kobby to confirm] |
| `invoica-patch-04` | 0002 accepted; founding offer in 0005; line styles in 0003; template round 1 in `docs/design/`; new terms in `domain.md`. Applies on top of 01 and 03 | [Placeholder: Kobby to confirm] |

## What changed last

Night of 18 October 2026: Kobby accepted the stack and a £5 founding offer, shared two of his own invoices as references, and asked for a wide range of templates. The old app's three styles were rendered from a local copy, UK invoice requirements were read from GOV.UK, and six template mocks were built and rendered to PDF with Chromium, including a two-page invoice to test page breaks.

## Next steps

**For Kobby:**

1. React to the six template mocks: which to keep for v1, what to change, what is missing.
2. Approve, change or reject `0003-audience-and-v1-scope.md`.

**Next tasks for Claude, one per session:**

1. **PDF engine spike.** A throwaway project, delivered as its own zip, starting from `docs/design/round-1/mock/`. It renders one pack of hard invoices (one line; 60 lines; very long descriptions; long names and addresses; a zero-decimal currency; totals falling at a page break) through each candidate engine and through the browser's own print, compares them on the criteria in `0002-stack.md` and the findings in `docs/design/templates-round-1.md`, and ends in decision record 0006.
2. **Tax and invoice research for the UK and Ghana**, from GOV.UK and the GRA: VAT rates and levies with their dates, what an invoice must show for registered and unregistered businesses, and Ghana's E-VAT requirements. Ends in `docs/specs/` notes the invoice spec will cite. Can run before or after the spike.
3. **Foundations** (foundation section 10, step 1) in the new repository.

**Not yet in the repository:** `CLAUDE.md` exists in the claude.ai project but not in the repo. It goes in with the new repository.

## Open questions

1. Which templates ship in v1, and with what changes.
2. Is `invoica.com`, used for the contact address and the seed accounts, Invoica's domain (audit I-M11)? The foundation names `invoica.io`.
3. Should Claude's commits and pull requests carry co-author lines (foundation section 7, switch-over step 6)?

## Decisions

| Record | Title | Status |
| --- | --- | --- |
| 0001 | Rewrite strategy | Accepted |
| 0002 | Stack | Accepted |
| 0003 | Audience and v1 scope | Proposed |
| 0004 | Launch market and tax | Accepted |
| 0005 | Positioning and pricing | Accepted |
