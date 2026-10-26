# Round 8: Signature, Letter and Ticket, a design pass

25 October 2026. The owner kept Signature, Letter and Ticket beside the twelve new templates and asked whether they
needed bringing up to the same standard. They did: beside the new range they read as plain. This pass is a proposal on
the canvas page **Signature, Letter and Ticket** (each one as it is beside the second pass). Nothing in the product has
changed; once approved, each is built the way the twelve were (`docs/specs/invoice-templates.md`).

**Answered and built, 25 October, 17:05.** Signature as the second pass, shown on the canvas in indigo. Letter as it
was, with the invoice and its number and the name under "With thanks" larger. Ticket as the second pass, with the
amount due band inside the paper's margins and the grey page kept. Letter keeps speaking in the first person. The
canvas page now shows each as it was beside it as built (`built.ts` renders them from the product).

The prototypes are in `docs/design/round-6/prototypes/t` (`signature2.ts`, `letter2.ts`, `ticket2.ts`), with three
more invented businesses in `data.ts` and their marks in `logos.ts`; `before.ts` renders the three as they are today
with the same businesses. The canvas boards come from `docs/design/round-6/canvas/round9.py`.

No new fonts: each keeps the faces it has in the product (Sora and Onest; Newsreader; JetBrains Mono and Onest).

## 1. What changed

| Template | As it is | Second pass |
| --- | --- | --- |
| Signature (Invoica's own, the default and the free plan's) | Quiet, with the amount due in a block at the foot. With a logo, a summary and four lines it runs to a second page. | The amount due comes first, top right, on a slip of the business's colour with its corner turned down, the way Invoica's mark turns the corner of its i. Under it one ruled row of facts (number, issued, tax point, reference, due), then the parties, the lines on hairlines, and how to pay in a tinted panel beside the totals. The business's name always shows beside its logo. Shown in Invoica's green, as on the free plan, and in indigo. |
| Letter (coaches, tutors, therapists) | A plain letter; with a logo it ran to a second page (fixed in the product on 25 October). | Good stationery: the sender's name set like a letterhead with a short rule in their colour, a monogram when there is no logo, fold marks in the margin, the client's address where a window envelope shows it, sessions listed by date with dotted leaders, a signed sign-off, and how to pay written as a P.S. The due line reads "and I would be grateful for it by 2 November 2026". |
| Ticket (makers, shops, repairers, events) | A receipt in a narrow bordered column. | A till roll torn from the printer, laid on a grey page: torn edges top and bottom, the shop's mark and name centred, the lines with their working, the amount due on a band of the shop's colour, and a remittance stub under a perforation with the amount, the date and the bank details. Shown in red and teal. |

## 2. Checks on the prototypes

Each renders its own sample on one page with its logo and without, and the UK VAT fixture on one page; the long
fixture runs to three pages, with the totals, the amount due and how to pay together on the last. Text on the brand
colour is black or white by the contrast rule, as in the rest of the range.

## 3. For the owner

1. Approve the three for building, or say what to change.
2. Ticket's grey page: it shows the receipt as a strip of paper, and prints grey if the client prints it. The other
   way is a white page with the receipt drawn in a fine outline.
3. Letter speaks in the first person ("This is my invoice", "I would be grateful"), as it does today, which suits a
   sole practitioner. Keep it so?

When they are built, the picker's sample details (the client and the bank) become real-looking too, with account,
company and VAT numbers that fail their check digits so none can be real.
