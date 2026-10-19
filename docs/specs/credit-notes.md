# Credit notes

How Invoica works out a credit note's figures. Written after review 2 (`docs/reviews/review-2.md`), which found that credits taken in more than one way, or under "VAT on the invoice total, rounded down", did not add up to the invoice row by row; revised after review 3 (`docs/reviews/review-3.md`), which found that a credit note's tax should be the tax on what it credits, and that the rest of a part-paid invoice could not always be credited exactly.

## What a credit note can credit

A credit note credits an issued invoice in one of four ways:

1. **The whole invoice**, while nothing is paid or credited.
2. **Quantities of its lines**, up to what is left uncredited on each line.
3. **An amount**, in the invoice's own price basis: excluding tax when the invoice's prices exclude tax, including tax when they include it.
4. **Everything still owed**: exactly the balance, after any payments.

Prices and tax always come from the invoice as issued (its snapshot). Today's tax codes are never consulted.

## The ledger

The invoice is divided into **slots**, the units its tax was worked out on: each line when tax is worked out per line, each tax group (the lines sharing a tax code) when it is worked out on the invoice total. For each slot the invoice holds:

- its **value**: its lines after their share of discounts, in the invoice's price basis;
- for each tax component, the **base** and the **amount** the invoice charged (or showed, for a reverse charge).

The invoice keeps its slots in its snapshot when it is issued, so crediting never depends on working old figures out again. Every credit note takes value from slots and keeps, in its own snapshot, the value, base and tax it took from each.

A credit note's tax, for each slot and component, is the tax for everything credited from the slot after this note, less the tax actually credited before it. The tax for a credited value is the tax on that value alone, worked out the way the invoice works out a line's tax, with its rounding, and never more than the slot showed; when the whole slot is credited, it is exactly what the invoice showed. So:

- a whole line credited under VAT per line credits exactly the VAT that line was charged;
- when every slot is credited, every tax row's amount and base equal the invoice's, whatever the order and mix of credits;
- a credit note never shows a row for a slot it does not credit, and never a negative tax or base;
- because each note takes what is due less what was actually credited, the ledger corrects any earlier difference;
- each tax's base is the net the note takes from the slot (for a tax charged on another tax, the net and that tax).

With prices including tax and more than one tax in a code (Ghana's levies and VAT), a small credit can come out with more tax than value, or leave a remainder too small to hold the tax still to be credited. Such a credit is refused as too small to split; a little more or a little less can be credited instead.

## Line credits

A line credited by quantity takes, for the quantity credited so far `c` out of the invoiced `Q`:

- amount: quantity times unit price at `c`, rounded half up, so a line credited in parts can show an amount a penny away from its own quantity times price, while the parts add up to the invoice line exactly;
- discount share: the line's invoiced share times `c / Q`, rounded half up;
- value: amount less discount share.

A credit note's line figures are the difference between those at the quantities after it and before it. A slot may not be credited beyond its value, even when its lines still have quantity left (an amount credit may have taken some of it).

## Amount credits

The amount is shared across the slots in proportion to the value each has left, by largest remainder, so it never exceeds what a slot has left. The credit note has one line for each tax code, titled with the invoice number and the lines it reduces; when the list of lines is long, the title gives their number and the description names every one.

Once part of the invoice is paid, the dialog's hint gives the largest amount whose credit note stays within the balance.

## Everything still owed

The credit note's total is exactly the balance. It is offered once the whole invoice can no longer be credited.

- When prices include tax it is an amount credit of the balance. If a slot's tax would come out more than the value it takes, that tax is lowered, at most one unit for each component.
- When prices exclude tax, the value credited is the largest whose total does not pass the balance. When that total falls short, one more unit of value is credited and the note's tax is lowered by the difference, at most one unit for each component, so the total is the balance.

The ledger keeps the tax actually credited, so any later note (after a payment is removed, say) takes up the difference.

## Acceptance criteria

Each is a test in `packages/core/test/credits.test.ts`, `packages/core/test/credits-review-3.test.ts`, `packages/db/test/review-2.test.ts` or `packages/db/test/review-3.test.ts`.

1. Crediting the whole invoice reproduces its totals and every tax row exactly.
2. Any mix of line and amount credits that leaves nothing in any slot credits every tax row's amount and base exactly.
3. No credit note has a negative tax amount or base, or a row for a slot it does not credit.
4. On every credit note, line tax shares add up to its tax total, and its total is its net plus the tax charged.
5. A quantity above what is left on a line, a value above what is left in a slot, and an amount above what is left on the invoice are refused.
6. Review 2's worked examples (R2-H1, R2-M1, R2-M2) give exact results.
7. An amount credit on an invoice priced excluding tax is priced excluding tax, so the credit note shows the decrease before tax.
8. The database refuses issuing a credit note whose lines credit more of an invoice line than was invoiced, or credit a line of another invoice.
9. Under VAT per line, a whole line credited credits exactly the VAT that line was charged (review 3, R3-L1).
10. For every slot a note credits, each tax is within two units of its rate times its base, and each base not charged on another tax is the net the note takes from the slot (review 3, R3-L1).
11. After any part payment, "everything still owed" credits exactly the balance in one note (review 3, R3-M1).
12. An invoice with credit notes that carry no ledger (from before this version) cannot be credited again, and says so; its page still works.

## Not covered

A credit note above the balance owed (after full payment) is refused. Crediting a paid invoice needs a refund or a client credit balance, which waits for Kobby's decision.
