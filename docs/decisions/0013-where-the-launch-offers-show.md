# 0013. Where the launch offers show

- **Status:** Accepted, 23 October 2026. Kobby asked for the best choice to be made and recorded; he can change it before launch.
- **Related:** `0005-positioning-and-pricing.md` (the offers and their terms, unchanged here), `0004-launch-market.md`; the pricing page spec, `docs/specs/pricing-page.md`.

## Context

Decision 0005 sets three offers: the 30-day reverse trial, lower prices in local currency where incomes are lower (Ghana and Nigeria first), and a founding offer, the first 200 paying customers keeping Pro at £5 a month for as long as they subscribe. The pricing page built on 23 October stated all three publicly. Kobby asked whether each should be public, and what would protect Invoica better than a discount.

## Decision

1. **The trial leads, publicly.** It is the one offer on the pricing page and the home page: 30 days of Pro, free, no card.
2. **The founding offer is not on the public site.** Its terms stay as in 0005. It is shown where someone decides whether to pay: in the app during the last week of the trial, and in the emails sent before the trial ends, for as long as places remain. Billing counts the places, and the offer is withdrawn when the 200th is taken. It may also go out through launch channels (the waiting list, communities, partners). It is only ever described as it really is.
3. **Local prices are public, in the visitor's currency.** A visitor in Ghana or Nigeria sees prices in cedis or naira, and anyone can switch currency on the pricing page. Local prices are their own round figures, reviewed each quarter, never converted from pounds day by day. They are charged only through a payment method of that country, so the price follows where the business pays from, not what a visitor claims.

Why:

- One offer per page. The page's job is to start a free trial; a second offer of £2 a month off competes with it and is weaker than a free month.
- The founding offer works at the moment of paying. "Keep £5 a month for as long as you stay" is a reason to subscribe at the end of the trial, and a reason never to leave afterwards.
- A public "first 200" cannot be checked by a visitor, and left up for months it reads as low demand. Inside the app the count is exact.
- For someone in Ghana or Nigeria a price in pounds is a barrier in itself, through foreign-card limits and conversion fees, so a local price on the page is the pull.

## What protects Invoica

A discount is not a moat: any competitor can match a price. What is hard to copy, in order:

1. **The UK, Ghana and Nigeria corridor.** UK-quality documents with Ghana's VAT and levies built in (0004), billing in local currency, being paid by Mobile Money and local cards as well as UK cards and bank transfer, and later the Ghana Revenue Authority's E-VAT connection, which needs the GRA's certification.
2. **Every invoice introduces Invoica.** The free plan's "Made with Invoica" mark (0005), and later the client's payment page, put the product in front of every client of every business using it.
3. **Records people keep there.** Numbers with no gaps, documents kept as issued, client and payment history, with export kept easy so that staying is a choice.
4. **How each client pays, learned over time.** Recorded payments let Invoica forecast when money arrives, and the forecast improves with use.

1 and 2 come first, as they grow from work already planned.

## Consequences

- The pricing page's questions no longer mention the founding offer; the question on Ghana and Nigeria stays.
- Billing (phase 2x) carries: the founding places count and the in-app and email offer; prices per currency in minor units; a currency switch on the pricing page, defaulting from the visitor's country where the host provides it.
- Before launch Kobby sets the cedi and naira prices and chooses the billing provider, which must charge local payment methods in both countries.
