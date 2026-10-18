# App design critique, round 1

18 October 2026, night. Screens reviewed with the seeded demo businesses at 1360px and 390px: dashboard, invoice list, invoice page with the kept document, the editor, settings. Method: the design-critique checklist (first impression, usability, hierarchy, consistency, accessibility), with axe checks run separately in `apps/web/e2e/accessibility.spec.ts`.

## Overall impression

Calm, legible and clearly about money: the amount owed is the first thing you see, and the invoice itself is shown at full fidelity next to its payments. It carries the old app's DNA (wordmark, emerald, phone tab bar with a central new button, status pills) in a light, quieter form. The biggest opportunity is character: it is tidy, but parts of it still read like a well-made generic dashboard. The one memorable element should be the money moment, and the invoice templates themselves (round 2).

## Fixed in this round

| Finding | Severity | Change made |
| --- | --- | --- |
| Two "New invoice" buttons on the dashboard and invoice list at desktop width (header and page) | Moderate | Kept the one in the header; phones have the central new button |
| Invoice rows on phones crammed the amount and the status pill side by side; "Overdue, part paid" wrapped inside its pill | Moderate | Two-line rows on phones: client and amount, then number with due date and the pill. Pills never wrap; the label is now "Part paid, late" |
| The cedilla used as the active-tab marker read as a stray glyph at 10px | Minor | A short emerald bar under the active item |
| The ageing legend listed every bucket at £0.00 | Minor | Shows "Not due yet" and only the buckets that hold money |
| The document preview sat flush against its frame on screen | Moderate | Screen padding matches the printed page margins |
| A preview iframe widened the phone layout (sideways scroll) | Critical | Grids use `grid-cols-1` with `minmax(0, 1fr)` tracks; an end-to-end check now measures sideways scroll on the invoice page |

## Still open (next design pass)

1. **Give the owed figure a signature treatment.** It is the product's one strong moment. Ideas to mock: the figure set in Sora with the ageing ribbon directly under its digits; a short line that says what to do next ("Two invoices are late. Chase Northlane first: £2,400, 11 days late").
2. **Lists need a quick action.** "Record payment" and "Chase" from the invoice list and the dashboard's "Needs chasing", without opening each invoice.
3. **Editor density on phones.** The line card is clear but long; a collapsed line (title and amount) that expands to edit would halve the scroll on a 10-line invoice.
4. **Landing page.** Currently a headline and two buttons. It should show a real invoice from the templates, since that is what the product sells.
5. **Empty states** have copy but no visual; a small illustration of a paper invoice with the brand colour would make a new account feel less bare.
6. **Dark mode** passes contrast checks but has not had a visual review at all widths.

## Accessibility

- Automated: zero axe violations (WCAG 2.2 AA tag set) on 3 public pages and 6 app pages in light and dark, at desktop and phone widths.
- Contrast: body text, muted text and the brand colour meet 4.5:1 on both canvas and surface in both themes.
- Touch targets: tab bar items and the central new button are at least 44px; small "Remove" and arrow buttons in the editor are 32px high, below the 44px guideline for phones. To enlarge on phones.
- Not yet done: a full keyboard pass and a screen reader pass.
