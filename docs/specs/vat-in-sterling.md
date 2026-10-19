# VAT in sterling on invoices in another currency

A UK VAT-registered business may invoice in any currency, but the total VAT must be shown in sterling (`docs/specs/tax-uk.md`, section 7: regulation 14(1)(l) and VAT Notice 700 paragraph 16.4). A credit note shows the VAT it credits in sterling too (regulation 15C(6)(h)). Invoica does not do this yet; this spec sets out how it will.

## When it applies

An invoice or credit note needs VAT in sterling when its seller is registered for VAT, the seller's country is the UK, the document's currency is not sterling, and it shows VAT at a rate above zero, charged or under a reverse charge.

## The rate

- The rate is sterling per unit of the document's currency, entered with up to six decimal places (for example 0.8650 for euros), and kept as an integer in millionths.
- It must be the rate current at the time of supply: the UK market selling rate, or HMRC's period rate if the business has chosen it (VAT Notice 700 paragraph 7.6). The business chooses its method once, in settings; the method and the rate's date are kept on the invoice.
- A credit note uses the rate of the invoice it credits.

## The figures

- VAT in sterling is the document's VAT total converted at the rate and rounded half up to the penny. Reverse-charge VAT, which is shown and not charged, is converted on its own.
- Each figure is converted once from the document's total, never added up from converted rows, so it is the conversion of the total the document shows.

## Acceptance criteria

Criteria 1 to 4 are tests in `packages/core/test/sterling.test.ts`; 5 to 7 wait for the wording below to be approved.

1. A rate is read from text with up to six decimal places; zero, negative, more than six decimal places and anything not a number are refused.
2. €200.00 of VAT at 0.865 is £173.00; 2,000 CFA francs (no minor unit) at 0.001312 is £2.62; half a penny rounds up.
3. Reverse-charge VAT is converted on its own and never added to the charged VAT.
4. Sterling VAT is needed only for a UK VAT-registered seller, a currency other than sterling and a VAT rate above zero.
5. Issuing an invoice that needs sterling VAT without a rate is refused, in the editor and on the server.
6. The invoice keeps the rate, its date and the method in its snapshot, and every template prints the sterling VAT beside the totals.
7. A credit note against such an invoice uses the invoice's rate and prints the VAT it credits in sterling.

## For Kobby (tax wording is ask-first)

Proposed printed line, under the VAT total: "VAT in sterling £173.00, at 1 EUR = 0.8650 GBP (HMRC period rate, October 2026)". With a reverse charge: "Reverse-charge VAT in sterling £173.00". On a credit note: "VAT credited in sterling £34.60". Is this wording right, and should the market rate or HMRC's period rate be the default?
