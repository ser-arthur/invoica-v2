# VAT in sterling on invoices in another currency

A UK VAT-registered business may invoice in any currency, but the total VAT must be shown in sterling (`docs/specs/tax-uk.md`, section 7: regulation 14(1)(l) and VAT Notice 700 paragraph 16.4). A credit note shows the VAT it credits in sterling too (regulation 15C(6)(h)).

Status: built 19 October 2026 (migration 0014). The owner chose the method and wording on 19 October ("pick the best way"): HMRC's period rate by default, and the wording below.

## When it applies

An invoice or credit note needs VAT in sterling when its seller is registered for VAT, the seller's country is the UK, the document's currency is not sterling, and it shows VAT at a rate above zero, charged or under a reverse charge.

## The rate

- The rate is units of the document's currency to £1, as HMRC publishes its period rates and as rates are quoted in the UK (for example 1.1500 for euros), entered with up to six decimal places and kept as an integer in millionths.
- It must be a rate HMRC accepts: its period rate for the month of the tax point (the default), or the UK market selling rate at the time of supply (VAT Notice 700 paragraph 7.6; HMRC VAT Valuation manual, VATVAL09500). The business chooses its method in Settings and uses it for every invoice; the method and the rate's date are kept on the invoice.
- The editor links to HMRC's published rates for the month of the tax point.
- A credit note uses the rate of the invoice it credits.
- A rate belongs to what it was entered for: the currency, the method, and the month of the tax point (HMRC's period rate) or its day (a market rate). A draft keeps that with its rate. When the currency or the tax point's month or day changes, the editor clears the rate and asks for the new one ("The exchange rate was entered for EUR. Enter the rate for JPY."), and the server refuses the old rate on saving and on issue. A draft with no dates saved in October and issued in November is asked for November's rate.
- A difference between this rate and what the bank pays when the client settles is not a VAT difference: the VAT due is the sterling figure on the invoice, and the difference is a currency gain or loss in the accounts.

## The figures

- VAT in sterling is the document's VAT total converted at the rate and rounded half up to the penny. Reverse-charge VAT, which is shown and not charged, is converted on its own.
- Each figure is converted once from the document's total, never added up from converted rows, so it is the conversion of the total the document shows.
- Credit notes are kept as a ledger against the invoice's sterling figures: together they never credit more sterling than the invoice charged, and the note that credits the last of the invoice's VAT credits the last of its sterling. Ten notes of a tenth of €20.00 of VAT at 1.1500 credit £1.74 nine times and £1.73 once, £17.39 in all, as the invoice charged.

## Acceptance criteria

1. A rate is read from text with up to six decimal places; zero, negative, more than six decimal places and anything not a number are refused (`packages/core/test/sterling.test.ts`).
2. €200.00 of VAT at €1.15 to £1 is £173.91; 2,000 CFA francs (no minor unit) at 762.195122 is £2.62; half a penny rounds up (same file).
3. Reverse-charge VAT is converted on its own and never added to the charged VAT (same file).
4. Sterling VAT is needed only for a UK VAT-registered seller, a currency other than sterling and a VAT rate above zero (same file).
5. Issuing an invoice that needs sterling VAT without a rate is refused, in the editor and on the server (`packages/db/test/sterling.test.ts`, `apps/web/e2e/editor.spec.ts`).
6. The invoice keeps the rate, its date and the method in its snapshot, and every template prints the sterling VAT beside the totals (`packages/db/test/sterling.test.ts`, `packages/documents/test/sterling-view.test.ts`).
7. A credit note against such an invoice uses the invoice's rate and prints the VAT it credits in sterling (same files).
8. A rate kept when the currency or the tax point's month changes is refused on saving and on issue, and the editor clears it and asks again (`packages/db/test/sterling.test.ts`, `apps/web/e2e/editor.spec.ts`).
9. Credit notes in pieces credit exactly the sterling the invoice charged, for any split (`packages/core/test/sterling.test.ts`, `packages/db/test/sterling.test.ts`).

## Printed wording

Beside the totals: "VAT in sterling £973.91" (on a credit note, "VAT credited in sterling"; under a reverse charge, "Reverse-charge VAT in sterling"). With the notes: "VAT in sterling at £1 = 1.1500 EUR, HMRC period rate for October 2026." or "..., UK market selling rate on 16 October 2026."
