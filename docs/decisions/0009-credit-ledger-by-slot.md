# 0009. Credit notes are worked out slot by slot, from what the invoice kept

## Context

Review 2 found credit notes that did not add up to their invoice. The fix shared each tax group's tax in proportion to the value credited. Review 3 found that this credits a whole line under VAT per line with a share of the group's rounding (£200.04 of VAT on a £1,000.00 line that was charged £200.00), that after a part payment the rest of an invoice priced excluding VAT could not always be credited exactly, and that crediting depended on working old invoices out again with today's code.

## Decision

- An invoice is divided into slots, the places its tax was worked out: each line under VAT per line, each tax code under VAT on the total.
- Invoices keep their slots in their snapshot at issue. Credit notes keep what they took from each slot.
- A slot's tax for what has been credited is the tax on that value alone, with the invoice's rounding, never more than the slot showed, and exactly what it showed once the whole slot is credited. Each note takes that, less what earlier notes took.
- "Everything still owed" credits exactly the balance, lowering the note's tax by at most one unit for each component where needed.
- An invoice whose records cannot be read with certainty cannot be credited, and says so.

The rules and acceptance criteria are in `docs/specs/credit-notes.md`.

## Consequences

- A whole line credits the tax it was charged; any mix of credits adds up to the invoice row by row; each note's tax is within two units of its rate times its base.
- Credit notes issued before this version kept no ledger, so their invoices cannot be credited again. This affects development and demo data only.
- Prices including tax with several taxes in one code (Ghana) can refuse a very small credit as too small to split.
