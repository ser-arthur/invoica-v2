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

Two refusals arise only on lines of a few pence: a quantity whose value after its share of the discounts would be below zero is refused as too small to credit on its own, and one whose value rounds to nothing is refused as a credit for nothing.

## Amount credits

The amount is shared across the slots in proportion to the value each has left, by largest remainder, so it never exceeds what a slot has left. The credit note has one line for each tax code, titled with the invoice number and the lines it reduces: those of the slots it takes value from, leaving out lines already credited in full. When the list is long, the title gives their number and the description names every one by position on the invoice ("Invoice lines 1 to 140") and, when they fit, by title.

Once part of the invoice is paid, the dialog's hint gives the largest amount whose credit note stays within the balance and can be split into its tax and the rest. With prices including tax, whether an amount can be split does not fall steadily with it, so the hint searches the nearest amounts one by one and then further down in strides; it may name an amount a little below the largest that works.

## Everything still owed

The credit note's total is exactly the balance. It is offered once the whole invoice can no longer be credited.

- When prices include tax it is an amount credit of the balance. A slot's tax is moved by at most one unit for each component so that neither the note nor what is left of the slot is below zero before tax. If a slot still cannot hold it, a unit or two of value moves between it and another slot.
- When prices exclude tax, the note first takes any tax still to credit on slots whose value is all credited: all of it, or as much as the balance when the balance is smaller. Then the value credited is the largest whose total does not pass the balance. When that total falls short, one more unit of value is credited and the note's tax is lowered by the difference, never below the tax due before that unit (so at most one unit for each component on any code whose rates are below 100%), and the total is the balance. The unit goes to a slot that keeps value after the note where it can.

The ledger keeps the tax actually credited, so a later note takes up any difference: after a payment is removed, say, "everything still owed" credits the rest exactly and leaves every tax row exact.

## Acceptance criteria

Each is a test in `packages/core/test/credits.test.ts` or `credits-review-3.test.ts`, `credits-review-4.test.ts`, `credits-review-5.test.ts` or `credits-review-7.test.ts`, or in `packages/db/test/review-2.test.ts` to `review-7.test.ts`.

1. Crediting the whole invoice reproduces its totals and every tax row exactly.
2. Any mix of line and amount credits that leaves nothing in any slot credits every tax row's amount and base exactly.
3. No credit note has a negative tax amount or base, or a row for a slot it does not credit.
4. On every credit note, line tax shares add up to its tax total, and its total is its net plus the tax charged.
5. A quantity above what is left on a line, a value above what is left in a slot, and an amount above what is left on the invoice are refused.
6. Review 2's worked examples (R2-H1, R2-M1, R2-M2) give exact results.
7. An amount credit on an invoice priced excluding tax is priced excluding tax, so the credit note shows the decrease before tax.
8. The database refuses issuing a credit note whose lines credit more of an invoice line than was invoiced, or credit a line of another invoice.
9. Under VAT per line, a whole line credited credits exactly the VAT that line was charged (review 3, R3-L1).
10. For every slot a note credits, each base not charged on another tax is the net the note takes from the slot, and, on codes whose rates add up to 30% or less (every UK and Ghana rate), each tax is within two units of its rate times its base (review 3, R3-L1). On codes with higher rates a note can be further away, by up to the tax that one unit of value adds, and a later note takes up what an earlier one left (review 5, R5-L6; review 7, R7-L3).
11. After any part payment, "everything still owed" credits exactly the balance in one note (review 3, R3-M1).
12. An invoice with credit notes that carry no ledger (from before this version) cannot be credited again, and says so; its page still works.
13. Under Ghana's default (tax on the total), with prices including or excluding tax, a balance of one to three units settles after any earlier amount credit (review 4, R4-M1; review 5, R5-L6).
14. After a note for everything still owed, removing its payment leaves a balance that a second such note credits exactly, with every base its net, and the invoice ends with every tax row exact (review 4, R4-L1 and R4-L2).
15. The database refuses issuing a credit note whose lines credit invoice lines at another price or tax, whose total or tax total is not its snapshot's, whose tax total is not its charged rows, whose tax rows are not whole numbers of zero or more, or whose rows, added up by tax with earlier notes, credit more tax or base than the invoice charged (review 4, R4-L5; review 5, R5-L2).
16. After a note for everything still owed, with the payment reversed and part of it paid again, a further such note credits exactly the balance, on UK and Ghana codes, a levy with VAT charged on it and single rates up to 100% (review 5, R5-L1). With several taxes compounded at high rates, prices including tax and rounding down, a balance of a unit or two on a single slot can be refused as too small to split (review 7, R7-L3); no UK or Ghana code does this.
17. A document whose total or balance would pass the largest safe whole number is refused as too large (review 5, R5-L5).
18. A line priced including tax whose taxes, rounded one by one, come to more than its price is refused when the invoice is worked out, so no invoice is issued with a net below zero (review 7, R7-L4).
19. The database refuses a credit note whose tax row is charged where the invoice's row for that tax was only shown, or the other way round (review 7, R7-L1).

## Not covered

A credit note above the balance owed (after full payment) is refused. Crediting a paid invoice needs a refund or a client credit balance, which waits for Kobby's decision.
