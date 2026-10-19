# Credit notes

How Invoica works out a credit note's figures. Written after review 2 (`docs/reviews/review-2.md`), which found that credits taken in more than one way, or under "VAT on the invoice total, rounded down", did not add up to the invoice row by row.

## What a credit note can credit

A credit note credits an issued invoice in one of three ways:

1. **The whole invoice**, while nothing is paid or credited.
2. **Quantities of its lines**, up to what is left uncredited on each line.
3. **An amount**, in the invoice's own price basis: excluding tax when the invoice's prices exclude tax, including tax when they include it.

Prices and tax always come from the invoice as issued (its snapshot). Today's tax codes are never consulted.

## The ledger by tax group

The invoice's lines are grouped by the tax code they used, as the invoice's own totals group them. For each group the invoice holds:

- its **value**: the sum of its lines after their share of discounts, in the invoice's price basis;
- for each tax component, the **base** and the **amount** the invoice charged (or showed, for a reverse charge).

Every credit note takes value from one or more groups. The value credited in a group so far is the sum of the values of every earlier credit note's lines in that group.

A credit note's tax in a group, for each component, is worked out cumulatively:

> tax credited after this note, less tax credited before it, where the tax credited for a credited value `x` is the invoice's amount for that component times `x` over the group's value, rounded half up.

The base is worked out the same way from the invoice's base. So:

- when a group's whole value has been credited, its credited tax and base equal the invoice's exactly, whatever the order and mix of credits;
- a credit note never shows a tax row for a group it does not credit, and never a negative tax or base;
- the effective rate on a credit note is the rate the invoice actually charged in that group.

## Line credits

A line credited by quantity takes, for the quantity credited so far `c` out of the invoiced `Q`:

- amount: quantity times unit price at `c`, rounded half up, so a line credited in parts can show an amount a penny away from its own quantity times price, while the parts add up to the invoice line exactly;
- discount share: the line's invoiced share times `c / Q`, rounded half up;
- value: amount less discount share.

A credit note's line figures are the difference between those at the quantities after it and before it. A group may not be credited beyond its value, even when its lines still have quantity left (an amount credit may have taken some of it).

## Amount credits

The amount is shared across the groups in proportion to the value each has left, by largest remainder, so it never exceeds what a group has left. Each share becomes one credit note line at that group's tax code, titled with the invoice number and the lines it reduces.

## Acceptance criteria

Each is a test in `packages/core/test/credits.test.ts` or `packages/db/test/review-2.test.ts`.

1. Crediting the whole invoice reproduces its totals and every tax row exactly.
2. Any mix of line and amount credits that leaves nothing in any group credits every tax row's amount and base exactly.
3. No credit note has a negative tax amount or base, or a row for a group it does not credit.
4. On every credit note, line tax shares add up to its tax total, and its total is its net plus the tax charged.
5. A quantity above what is left on a line, a value above what is left in a group, and an amount above what is left on the invoice are refused.
6. Review 2's worked examples (R2-H1, R2-M1, R2-M2) give exact results.
7. An amount credit on an invoice priced excluding tax is priced excluding tax, so the credit note shows the decrease before tax.
8. The database refuses issuing a credit note whose lines credit more of an invoice line than was invoiced, or credit a line of another invoice.

## Not covered

A credit note above the balance owed (after full payment) is refused. Crediting a paid invoice needs a refund or a client credit balance, which waits for Kobby's decision.
