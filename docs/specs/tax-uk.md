# United Kingdom: VAT and invoice requirements for Invoica

Research date: 18 October 2026. Every fact below carries its source link and either the page's own "last updated" date or the legislation status shown on the day it was checked. "Checked" means read on 18 October 2026.

## Summary

- VAT rates in force: standard 20%, reduced 5%, zero 0%. Exempt and outside-the-scope supplies carry no VAT and must be shown separately from taxable lines on a VAT invoice.
- VAT registration threshold: £90,000 of taxable turnover. Deregistration threshold: £88,000. Both took effect on 1 April 2024 (SI 2024/307) and GOV.UK still gives them as current.
- Rounding (VAT Notice 700, paragraph 17.5): the total VAT on an invoice may be rounded down to a whole penny. If VAT is worked out line by line, each line is rounded either down to the nearest 0.1p or to the nearest 1p or 0.5p, consistently. Retailers must not round down. Proposed Invoica rule: per-line VAT rounded to the nearest penny (half up), invoice VAT equals the sum of the lines, with an optional "round invoice total down" mode for invoice traders.
- A full VAT invoice needs the 12 items in regulation 14 of the VAT Regulations 1995. A simplified invoice is allowed up to £250 including VAT. A modified (VAT-inclusive) invoice is a retail facility for supplies over £250. Credit notes have a statutory content list (regulation 15C) and a 14-day issue rule.
- VAT on any invoice must be stated in sterling. Conversion uses the UK market selling rate at the time of supply, the HMRC period rate, or a rate HMRC has approved.
- The only statutory wording is the reference "reverse charge" (regulation 14(1)(o)). Construction reverse charge invoices must also say the customer accounts for the VAT; HMRC gives example wording.
- Records: VAT records at least 6 years; sole traders at least 5 years after the 31 January filing deadline; companies 6 years from the end of the financial year.
- Making Tax Digital for VAT has applied to all VAT-registered businesses since their first return period starting on or after 1 April 2022. Making Tax Digital for Income Tax started on 6 April 2026 (qualifying income over £50,000), widening to over £30,000 from 6 April 2027 and over £20,000 from 6 April 2028.
- Mandatory e-invoicing: Budget 2025 states that from April 2029 all VAT invoices must be issued as e-invoices. Peppol was confirmed as the core network on 23 June 2026. The implementation roadmap is due at Budget 2026, which has not yet happened.
- Late payment (B2B): statutory interest is 8% a year over Bank Rate. Bank Rate was 3.75% on 30 June 2026, so the statutory rate for interest that starts to run between 1 July and 31 December 2026 is 11.75% a year (derived). Fixed compensation: £40 (debt under £1,000), £70 (£1,000 to under £10,000), £100 (£10,000 or more). Stating these on an invoice is optional.

### How the sources were read

VAT Notice 700 is too long for the page reader to load in full. Its sections 16 to 18 were read from the text GOV.UK publishes for the same page through its search API (https://www.gov.uk/api/search.json?filter_link=/guidance/vat-guide-notice-700&fields=indexable_content). That text stops part-way through paragraph 18.2.2, so paragraph 18.2.3 (credit notes) could not be read; the credit note answer below relies on the regulation instead. The Notice 700 page itself shows "last updated 25 June 2026".

Quoted wording was extracted by an automated reader. Where an official text uses a dash, it is shown here as a colon or comma to meet the house style; the words are otherwise as extracted. Spot-check any quotation against the source before it is printed in the product.

## 1. VAT rates in force today

| Rate | Percentage | Examples given by GOV.UK |
|---|---|---|
| Standard | 20% | Most goods and services |
| Reduced | 5% | Some goods and services, for example children's car seats and home energy |
| Zero | 0% | For example most food and children's clothes |

Source: https://www.gov.uk/vat-rates (checked; page metadata public update 12 December 2014, system update 30 September 2026). Budget 2025 confirms the headline rate is unchanged: "The government is not increasing the headline rates of income tax, National Insurance contributions (NICs) or VAT." (https://www.gov.uk/government/publications/budget-2025-document/budget-2025-html, published 26 November 2025, updated 28 November 2025).

What the categories mean on an invoice (VAT Notice 700, https://www.gov.uk/guidance/vat-guide-notice-700, last updated 25 June 2026):

- Zero-rated (paragraph 3.5): "VAT is not payable on zero-rated supplies, and an invoice for a zero-rated supply will not constitute a VAT invoice". Zero-rated supplies are "treated as taxable supplies in all other respects", so the supplier can still recover VAT on its costs.
- Exempt (paragraph 3.6): "Some supplies are exempt from VAT, which means that no tax is payable" and the supplier "cannot normally recover any of the VAT on their own expenses."
- Outside the scope (paragraph 3.2): supplies are outside the scope of UK VAT if they are made by someone who is not a taxable person, made outside the UK and the Isle of Man, or not made in the course or furtherance of business.
- Mixed invoices (paragraph 16.5): if a VAT invoice includes zero-rated or exempt supplies, "you must make sure that those items show clearly that there's no VAT payable and you must show a separate total for their values." The same rule is in regulation 14(4) of the VAT Regulations 1995: the supplier "shall distinguish on the invoice between the goods or services which are the subject of an exempt, zero-rated or other supply and state separately the gross total amount payable in respect of each supply and rate." (https://www.legislation.gov.uk/uksi/1995/2518/regulation/14, latest revised version, checked).
- Simplified invoices must not include exempt supplies (Notice 700 paragraph 16.6.2; regulation 16(2)).

## 2. Registration and deregistration thresholds

- Registration: you must register if "your total taxable turnover for the last 12 months goes over £90,000" or "you expect your taxable turnover to go over £90,000 in the next 30 days". Source: https://www.gov.uk/register-for-vat (checked; public update 10 October 2024).
- Deregistration: "If your taxable turnover falls below £88,000 you can ask HM Revenue and Customs" to cancel. Source: https://www.gov.uk/register-for-vat/cancel-your-registration (checked; public update 10 October 2024). The table at https://www.gov.uk/how-vat-works/vat-thresholds (public update 24 October 2024) gives the same two figures.
- Date they took effect: 1 April 2024. The Value Added Tax (Increase of Registration Limits) Order 2024 (SI 2024/307), made 5 March 2024, came into force on 1 April 2024 and raised registration from £85,000 to £90,000 and deregistration from £83,000 to £88,000 (https://www.legislation.gov.uk/uksi/2024/307/made, checked). HMRC's policy paper says the same (https://www.gov.uk/government/publications/vat-increasing-the-registration-and-deregistration-thresholds/increasing-the-vat-registration-threshold, published 7 March 2024).
- HMRC's threshold table in VAT Notice 700/1 supplement (https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat/vat-notice-7001-supplement--2, updated 5 August 2026) states "The current registration threshold for taxable supplies is £90,000" and "The current deregistration limit is £88,000". Its history table lists £90,000 and £88,000 for 1 April 2024 to 31 March 2025 and 1 April 2025 to 31 March 2026, and has no row yet for the year from 1 April 2026.
- While waiting for a VAT number: "You cannot include VAT (Value Added Tax) on your invoices until you get your VAT (Value Added Tax) registration number"; you can raise prices to cover the VAT, and "After you get your VAT (Value Added Tax) registration number, reissue the invoice". Source: https://www.gov.uk/register-for-vat/how-register-for-vat (checked; public update 10 October 2024).

## 3. What every invoice must show (business not VAT registered)

GOV.UK's general list (https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include, checked; public update 7 August 2015, system update 16 October 2026). An invoice must include:

- "a unique identification number"
- "your company name, address and contact information"
- "the company name and address of the customer you're invoicing"
- "a clear description of what you're charging for"
- "the date the goods or service were provided (supply date)"
- "the date of the invoice"
- "the amount(s) being charged"
- "VAT amount if applicable"
- "the total amount owed"

The guide's overview adds that the invoice must include "how much the customer needs to pay you" and "when the customer must pay you" (https://www.gov.uk/invoicing-and-taking-payment-from-customers, public update 7 August 2015).

A business that is not VAT registered must not show VAT. See section 2 for the rule while a registration is pending.

### Sole traders and partnerships

- GOV.UK: sole traders must show "your name and any business name being used", and "an address where any legal documents can be delivered to you if you are using a business name." (same page as above).
- The legal basis is Companies Act 2006, Part 41, Chapter 2 (https://www.legislation.gov.uk/ukpga/2006/46/section/1200, sections 1200 to 1202, revised text up to date to 15 October 2026). Section 1200: the rules apply to "an individual or partnership carrying on business in the United Kingdom under a business name", meaning a name other than the individual's surname (with forename or initial allowed) or, for a partnership, the partners' surnames or corporate names. Section 1201: the information is the individual's name (or each partner's name) and, for each, "an address at which service of any document relating in any way to the business will be effective"; the address must be in the UK if there is a UK place of business. Section 1202(1)(c): this must be stated "in legible characters" on "invoices and receipts issued in the course of the business".

### Limited companies (and LLPs)

The Company, Limited Liability Partnership and Business (Names and Trading Disclosures) Regulations 2015 (SI 2015/17), revised text checked on legislation.gov.uk:

- Registered name on invoices: regulation 24(1)(e) requires the registered name on "its bills of parcels, invoices and other demands for payment, receipts and letters of credit" (https://www.legislation.gov.uk/uksi/2015/17/regulation/24).
- Registered number, registered office, part of the UK: regulation 25 requires "the part of the United Kingdom in which the company is registered", "the company's registered number" and "the address of the company's registered office" on "its business letters", "its order forms" and "its websites" (https://www.legislation.gov.uk/uksi/2015/17/regulation/25). The regulation does not name invoices. GOV.UK says the same three items go on "business letters, order forms and websites" (https://www.gov.uk/running-a-limited-company/signs-stationery-and-promotional-material, public update 29 January 2025). Invoica should print all three on company invoices, since an emailed invoice usually also serves as business correspondence. Treat this as a design choice; whether an invoice counts as a "business letter" is not confirmed by an official source.
- Share capital: if share capital is mentioned on letters, order forms or websites, it must be paid-up share capital (regulation 25(3)).
- Directors: under regulation 26, if a business letter names any director other than in the text or as a signatory, it must name every director (https://www.legislation.gov.uk/uksi/2015/17/regulation/26). GOV.UK's invoice guide applies this to invoices: if you list directors, include "the names of all directors".
- Company name as registered: GOV.UK says limited companies must use "the full company name as it appears on the certificate of incorporation" (invoice guide above).

## 4. Full, simplified and modified VAT invoices

### When a VAT invoice is required

- Regulation 13(1) of the VAT Regulations 1995: a registered person who makes a taxable supply in the UK to a taxable person must provide a VAT invoice. Regulation 13(5): within 30 days of the time of supply, or a longer period HMRC allows (https://www.legislation.gov.uk/uksi/1995/2518/regulation/13, latest revised, checked).
- VAT Notice 700 paragraph 16.2.1: you must give a VAT invoice whenever you supply standard-rated or reduced-rated goods or services to another VAT-registered person. "You do not, therefore, have to issue VAT invoices for zero-rated supplies." "You do not need to issue VAT invoices for supplies to customers who are not VAT registered." Paragraph 16.2.3: "normally issue a VAT invoice within 30 days of the tax point arising".
- Notice 700 paragraph 16.2.4: invoices may be written in another language, but English translations must be provided within 30 days if an HMRC officer asks.

### Full VAT invoice

Regulation 14(1), VAT Regulations 1995 (https://www.legislation.gov.uk/uksi/1995/2518/regulation/14, latest revised, checked). Items (f) and (k) are repealed.

| Ref | Required particular (statutory wording) |
|---|---|
| (a) | "a sequential number based on one or more series which uniquely identifies the document" |
| (b) | "the time of the supply" |
| (c) | "the date of the issue of the document" |
| (d) | "the name, address and registration number of the supplier" |
| (e) | "the name and address of the person to whom the goods or services are supplied" |
| (g) | "a description sufficient to identify the goods or services supplied" |
| (h) | "for each description, the quantity of the goods or the extent of the services, and the rate of VAT and the amount payable, excluding VAT, expressed in any currency" |
| (i) | "the gross total amount payable, excluding VAT, expressed in any currency" |
| (j) | "the rate of any cash discount offered" |
| (l) | "the total amount of VAT chargeable, expressed in sterling" |
| (m) | "the unit price" |
| (n) | for margin schemes, the reference "margin scheme: works of art", "margin scheme: antiques or collectors' items", "margin scheme: second-hand goods" or "margin scheme: tour operators" |
| (o) | where the customer is liable to pay the tax, the reference "reverse charge" |
| (p) | for free zone supplies, the reference "free zone" |

VAT Notice 700 paragraph 16.3.1 adds two practical points: you may trade under a trading name, "but you must show the name and address under which you're registered for VAT somewhere on the document"; and the date of issue is needed "(where different to the time of supply)". Paragraph 16.3.2 on unit price: it applies to countable goods or services (for services, for example "an hourly rate"); if the supply cannot be broken down, "the total tax exclusive price will be the unit price"; and unit price may not need showing if it is not normally provided in the sector or required by the customer.

VAT Notice 700/21 section 4.1 (https://www.gov.uk/guidance/record-keeping-for-vat-notice-70021, last updated 18 March 2024) gives the same list.

Northern Ireland goods to EU customers have extra rules (regulation 14(2), Notice 700 paragraph 16.3.1). Not covered here.

### Simplified VAT invoice (up to £250)

- Notice 700 paragraph 16.6.1: allowed if "the value of the supply you are making is £250 or less" and "your customer agrees" (and, for a Northern Ireland business, the customer is not in an EU member state). It must include: "your name, address and VAT registration number"; "the time of supply (tax point)"; "a description which identifies the goods or services supplied"; "for each applicable VAT rate, the total amount payable, including VAT, and the VAT rate".
- What it may omit, by comparison with the full list: the sequential invoice number, the customer's name and address, the quantity and unit price, the VAT-exclusive amounts, the cash discount rate, and the separate VAT total. This list of omissions is derived by comparing the two official lists; no source states it as a list.
- Exempt supplies must not be included (Notice 700 paragraph 16.6.2; regulation 16(2)).
- Statutory basis for retailers: regulation 16(1), consideration not exceeding £250 (figure in force since 1 January 2004 under SI 2003/3220) (https://www.legislation.gov.uk/uksi/1995/2518/regulation/16, latest revised, checked).
- Notice 700/21 sections 4.4 and 4.5 express the limit as "£250 or less (including VAT)".

### Modified invoice

- HMRC's internal manual VATREC16043 (https://www.gov.uk/hmrc-internal-manuals/vat-trader-records/vatrec16043, updated 16 January 2025) describes the retailer's invoice for supplies over £250 showing VAT-inclusive values. It must show separately at the foot: "the total tax-inclusive value of the positive-rated items;" "the total amount of VAT included in this value;" "the total tax-exclusive value of the positive-rated items; and" "a separate total of zero-rated supplies if any have been included in the invoice." The manual limits it to "retail businesses or the retail establishment of composite businesses", for "retail sales made by a retail establishment from retail stock currently on sale to the public".
- Sources disagree on who may use it. Notice 700/21 section 4.5, titled for businesses other than retailers, says supplies over £250 need "either a full VAT invoice or a modified VAT invoice". VATREC16043 limits the facility to retailers. VAT Notice 700 paragraph 16.6.2 (retailers) mentions only a full VAT invoice for transactions over £250. Invoica should treat the modified invoice as a retail-only option and default to full VAT invoices.

### Pro-forma invoices

Notice 700 paragraph 17.3: pro-formas "cannot be used as evidence to reclaim input tax" and should be "clearly marked 'this is not a VAT invoice'". Regulation 14(3) uses the same endorsement for delivery notes issued before the time of supply.

### Electronic invoices today

Notice 700 paragraph 17.7: a PDF sent by email or a structured EDI invoice are both acceptable forms; an electronic VAT invoice "must include all the information that's required on a paper VAT invoice", and authenticity of origin, integrity of data and legibility must be ensured. Conditions are in VAT Notice 700/63 (not read for this report).

## 5. VAT rounding (VAT Notice 700, paragraph 17.5)

Source: VAT Notice 700, paragraph 17.5, as published at https://www.gov.uk/guidance/vat-guide-notice-700 (last updated 25 June 2026), read from the GOV.UK search index text for that page. The dashes in the original are shown as colons.

> 17.5 Calculation of VAT on invoices: rounding of amounts
>
> Note, the concession in this paragraph to round down amounts of VAT is designed for invoice traders and applies only where the VAT charged to customers and the VAT paid to HMRC is the same. As a general rule, the concession to round down is not appropriate to retailers, who should read paragraph 17.6.
>
> You may round down the total VAT payable on all goods and services shown on a VAT invoice to a whole penny. You can ignore any fraction of a penny.
>
> 17.5.1 Calculation based on lines of goods or services
>
> If you want to work out the VAT separately for a line of goods or services, which are included with other goods or services in the same invoice, you should calculate the separate amounts of VAT by rounding in one of the following ways:
>
> - down to the nearest 0.1 pence: for example, 86.76 pence would be rounded down to 86.7 pence
> - to the nearest 1 pence or 0.5 pence: for example, 86.76 pence would be rounded up to 87 pence
>
> Whatever you decide, you must be consistent.
>
> The final total amount of VAT payable may be rounded down to the nearest whole penny.
>
> 17.5.2 Calculation based on tax per unit or per article
>
> If you want to work out the VAT per unit or per article (for example, for use in price lists), you must work out the amounts in one of the following ways:
>
> - 4 digits after the decimal point and then round to 3 digits: for example, if the VAT is £0.0024, it should be rounded to £0.002 (0.2 pence)
> - the nearest 1 pence or 0.5 pence: if you decide to do this, you must not round the VAT down to 'nil' on any unit or article that is liable at the standard or reduced rate, for example, if the VAT is £0.0024 it should be rounded to £0.005 (0.5 pence)

> 17.6 Calculation of VAT at retailers
>
> Most retailers account for VAT using a retail scheme. If that's the way you account for VAT, this paragraph does not affect you. If you calculate VAT at line level or invoice level, you must not round the VAT figure down. But, you may round (up and down) each VAT calculation.

Supporting HMRC guidance (internal manual, updated 16 January 2025):

- VATREC12010 (https://www.gov.uk/hmrc-internal-manuals/vat-trader-records/vatrec12010): the rounding concession "has been available since the inception of the tax" and is described in Notice 700 paragraph 17.5.
- VATREC12030 (https://www.gov.uk/hmrc-internal-manuals/vat-trader-records/vatrec12030) defines "nearest": "If the VAT on any transaction comes to less than 0.5 of one penny, it should be rounded down." "If the VAT comes to 0.5 of one penny or more, it should be rounded up." Other methods "should be considered and allowed if it produces a fair and reasonable result."

VAT-inclusive prices (Notice 700 paragraph 7.3.1): VAT is the VAT fraction of the inclusive price, worked out as "rate of tax divided by (100 + rate of tax)". The fraction is 1/6 at 20% and 1/21 at 5%.

### What this means for Invoica's rounding rule

1. Per-invoice rounding down: the whole invoice's VAT may be rounded down to a whole penny, ignoring fractions. Only for invoice traders.
2. Per-line rounding: each line's VAT is rounded either down to 0.1p, or to the nearest 1p or 0.5p (0.5p and above goes up). The method must be used consistently. The final total may then be rounded down to a whole penny.
3. Rounding a line down to a whole penny is not one of the allowed line methods.
4. Retailers may round each calculation to the nearest amount, up or down. Rounding down is closed to them at line and invoice level.

Proposed rule:

- Default for UK presets: work out VAT per line from the line's net amount (or from its VAT-inclusive amount using the VAT fraction), round each line's VAT to the nearest penny with 0.5p going up, and set the invoice VAT total to the sum of the rounded line amounts. This is 17.5.1 second option. It is also allowed for retailers under 17.6, so one rule works for every user.
- Optional business setting "Round VAT down on invoice total" (17.5): keep line VAT at full precision, sum, then round the total down to the whole penny. Show this option only to businesses that are not retailers, and keep the choice fixed per business so the "must be consistent" condition holds.
- Store amounts as integer pence (or a decimal with at least 4 places for intermediate results) so per-unit pricing under 17.5.2 is possible later.

## 6. Credit notes

Statutory content: regulation 15C(6) of the VAT Regulations 1995 (https://www.legislation.gov.uk/uksi/1995/2518/regulation/15C, latest revised, checked; in force from 1 September 2019). Where there is a decrease in consideration, the supplier must, within 14 days beginning with the day the decrease occurs, provide a credit note which includes:

- "(a) the identifying number of the document,"
- "(b) the date of issue of the document,"
- "(c) the name, address and registration number of the supplier,"
- "(d) the name and address of the recipient of the supply,"
- "(e) the identifying number and date of issue of the VAT invoice or invoices relating to the supply for which there is a decrease in consideration,"
- "(f) a description sufficient to identify the goods or services supplied,"
- "(g) the amount of the decrease in consideration excluding VAT,"
- "(h) the rate and the amount (expressed in sterling) of the VAT credited in respect of the decrease in consideration."

Other points from regulation 15C: debit notes for increases in consideration carry the same particulars (15C(3)) and the same 14-day rule (15C(2)). If no VAT invoice was required for the original supply, a credit note is only needed if a taxable customer asks for one, and item (e) then does not apply (15C(8) and (9)). Credit notes may be electronic if the customer agrees (15C(12)).

HMRC's conditions for a valid credit note (VATREC13040, https://www.gov.uk/hmrc-internal-manuals/vat-trader-records/vatrec13040, updated 16 January 2025): it must be issued to the customer, correct a genuine mistake or overcharge or reflect an agreed reduction, give value to the customer, not be issued for a bad debt, and be issued in good faith.

Reverse charge credit notes: the construction reverse charge guide asks for a note that the reverse charge applies and the reduction in VAT the customer owes, with example wording "reverse charge: customer to account for the output tax adjustment of £X to HMRC" (https://www.gov.uk/guidance/vat-reverse-charge-technical-guide, last updated 18 September 2024).

VAT Notice 700 paragraph 18.2.1: "You should issue a credit note to your customer and keep a copy." Paragraph 18.2.3, which VATREC13040 cites for the details a credit note must contain, could not be read (see "How the sources were read").

## 7. Invoices in a foreign currency

- Regulation 14(1)(h) and (i): line amounts and the gross total excluding VAT may be "expressed in any currency". Regulation 14(1)(l): the total VAT must be "expressed in sterling".
- VAT Notice 700 paragraph 16.4: "If you issue VAT invoices in a foreign currency for supplies of goods or services that take place in the UK, you must convert the total amount of VAT payable into sterling". Simplified invoices show the VAT-inclusive total "in sterling" (Notice 700/21 sections 4.4 and 4.5).
- Exchange rates, VAT Notice 700 paragraph 7.6 ("This section has force of law under the VAT Act 1994, Schedule 6, Paragraph 11"):
  - (a) the default is "the UK market selling rate at the time of the supply"; national newspaper rates are acceptable evidence.
  - (b) alternatively, "the period rate of exchange published by HMRC for customs purposes", for all supplies or a class of supplies; no advance notice to HMRC is needed, but once chosen it cannot be changed without HMRC's written agreement.
  - (c) a commercial rate or method approved in writing by HMRC's VAT Written Enquiries Team. Forward rates are not acceptable.
  - "Whatever rate or method you adopt, the appropriate rate for any supply is that current at the time of the supply."

Invoica needs a per-business setting for the conversion method (market rate or HMRC period rate), the rate used and its date stored on each invoice, and the sterling VAT total printed beside the foreign-currency total.

## 8. Prescribed wording

### Reverse charge (any supply where the customer accounts for the VAT)

Regulation 14(1)(o): "where a VAT invoice relates in whole or part to a supply where the person supplied is liable to pay the tax, the reference "reverse charge"". This is the only wording fixed in law.

### Domestic reverse charge for building and construction services

In force from 1 March 2021 (https://www.gov.uk/guidance/vat-domestic-reverse-charge-for-building-and-construction-services, last updated 24 September 2020). Invoice rules from the VAT reverse charge technical guide (https://www.gov.uk/guidance/vat-reverse-charge-technical-guide, last updated 18 September 2024), section "Invoices and other VAT documents":

- "show all the information required on a VAT invoice"
- "make a note on the invoice to make it clear that the domestic reverse charge applies and that the customer is required to account for the VAT"
- "clearly state how much VAT is due under the reverse charge", or if this amount cannot be shown, "state the rate of VAT", "but do not include the VAT in the amount charged to the customer"
- The guide gives example wording that meets the legal requirement: "VAT Act 1994 Section 55A applies", "S55A VATA 94 applies", or "Customer to pay the VAT to HMRC". These are examples; the fixed requirement is the reference "reverse charge".
- If software cannot show the reverse charge VAT: "add wording to the invoice to say 'customer to account to HMRC'" and "make sure customer can identify reverse charge goods or services". The guide's longer example is "customer to account to HMRC for the reverse charge output tax on the VAT exclusive price of items marked reverse charge".

### B2B services supplied to customers outside the UK

VAT Notice 741A (https://www.gov.uk/guidance/vat-place-of-supply-of-services-notice-741a, last updated 29 September 2022): under the general B2B rule the supply is made where the customer belongs (section 6.3), and "no UK VAT is chargeable where the place of supply is outside the UK" (section 1.4). Special rules (land, event admission, use and enjoyment) can override this. You "should obtain commercial evidence showing that your customer is in business and belongs outside the UK" (section 6.3), and a VAT number is the strongest evidence (section 2.4). Invoices "should avoid general or generic descriptions and make clear the nature of the services involved" (section 2.3). No invoice wording is prescribed. Regulation 13 requires a VAT invoice only for taxable supplies in the UK, so these supplies need no UK VAT invoice. Any "reverse charge" note for the customer's own country is set by that country's rules; this is not confirmed here.

### Zero-rated and exempt supplies

No fixed wording. The invoice must show clearly that no VAT is payable on those items, with a separate total (Notice 700 paragraph 16.5; regulation 14(4)). Regulation 14(2)(h) requires "a relevant reference or any indication that the supply is exempt or zero-rated" only for Northern Ireland supplies to EU customers. Invoica should print the labels "Zero-rated" and "Exempt" against each such line.

## 9. Record retention

- VAT: "for at least 6 years" (VAT Notice 700/21 section 2.4, https://www.gov.uk/guidance/record-keeping-for-vat-notice-70021, last updated 18 March 2024). HMRC may allow a shorter period on request.
- Sole traders (Self Assessment): "You must keep your records for at least 5 years after the 31 January submission deadline of the relevant tax year." (https://www.gov.uk/self-employed-records/how-long-to-keep-your-records, public update 23 January 2015).
- Limited companies: "You must keep records for 6 years from the end of the last company financial year they relate to", or longer in the cases listed (transactions spanning periods, assets expected to last over 6 years, late Company Tax Return, HMRC compliance check) (https://www.gov.uk/running-a-limited-company/company-and-accounting-records, public update 29 January 2025).
- Invoica design: never hard-delete issued invoices or credit notes. Keep them at least 6 years after the end of the VAT period or financial year, and at least until 5 years after the 31 January deadline for sole traders. A simple safe default is 7 years from the invoice date, with longer holds where a dispute or compliance check is flagged.

## 10. Making Tax Digital and the e-invoicing mandate

### MTD for VAT

- "All VAT (Value Added Tax)-registered businesses must use MTD (Making Tax Digital) for VAT (Value Added Tax) for their first VAT (Value Added Tax) return starting on or after 1 April 2022." (HMRC press release, https://www.gov.uk/government/news/less-than-one-week-to-go-for-mtd, 28 March 2022).
- Digital records for each supply made (VAT Notice 700/22 paragraph 3.3.2, https://www.gov.uk/government/publications/vat-notice-70022-making-tax-digital-for-vat/vat-notice-70022-making-tax-digital-for-vat, updated 1 April 2022): the time of supply (tax point), the value of the supply net of VAT, and the rate of VAT charged. Output values are also split into standard-rate, reduced-rate, zero-rate, exempt and outside-the-scope supplies.
- Digital links: data moving between software must be digitally linked; manual transfer and copy-and-paste are not digital links (same notice).
- For Invoica: each issued invoice must store tax point, net value per rate and the rate, and be exportable through a digital link (API or file export and import) to the user's MTD VAT software. Invoica does not file VAT returns unless it becomes MTD-recognised software.

### MTD for Income Tax

- Dates and qualifying income (https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax, last updated 26 March 2026): over £50,000 in 2024 to 2025, from 6 April 2026; over £30,000 in 2025 to 2026, from 6 April 2027; over £20,000 in 2026 to 2027, from 6 April 2028.
- Quarterly update deadlines for standard periods (https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates, last updated 16 October 2026): 7 August, 7 November, 7 February and 7 May. Updates carry totals per income and expense category, and "HMRC will not receive details of individual receipts or invoices in your quarterly updates."
- Each digital record needs an amount, a date and a category using Self Assessment categories, and software must be digitally linked (https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records, last updated 16 October 2026).
- For Invoica: sole-trader income records should carry the date income was received or earned, the amount and a Self Assessment income category, with a linked export.

### E-invoicing from April 2029

- Budget 2025 (26 November 2025): "From April 2029, businesses will be required to issue all VAT invoices as e-invoices, with a roadmap on implementation to be published next year." (https://www.gov.uk/government/publications/budget-2025-document/budget-2025-html).
- Consultation response, "Promoting electronic invoicing across UK businesses and the public sector", first published 26 November 2025 (https://www.gov.uk/government/consultations/promoting-electronic-invoicing-across-uk-businesses-and-the-public-sector/outcome/promoting-electronic-invoicing-across-uk-businesses-and-the-public-sector-consultation-response): the mandate covers "all VAT invoices" (typically B2B and B2G); the government has focused on a decentralised model; PDF and Word invoices were outside the consultation's definition of e-invoicing; real-time reporting will not be introduced alongside the 2029 mandate; businesses not required to register for VAT and choosing not to "will not be obliged to adopt this technology"; stakeholder engagement from January 2026.
- Tax Update 2026 (23 June 2026): "Peppol will be the core interoperability network for e-invoicing in the UK", working "towards the e-invoicing mandate in 2029" (https://www.gov.uk/government/publications/summary-of-tax-update-2026-simplification-modernisation-and-fairness/tax-update-2026-simplification-modernisation-and-fairness-summary).
- Secondary (VATupdate, 3 July 2026, https://www.vatupdate.com/2026/07/03/peppol-confirmed-as-core-interoperability-network-for-uk-e-invoicing-mandate/): describes a four-corner model with no central clearance in phase 1 and names EN 16931 and Peppol BIS Billing 3.0. Not confirmed from an official source.
- For Invoica: VAT-registered users will need to send structured e-invoices over Peppol from April 2029, either as a certified Peppol access point or through a partner access point. The data model should map now to EN 16931 core fields (seller and buyer identifiers, VAT breakdown per rate category, line net amounts, totals, currency codes).

## 11. Late payment of commercial debts

- Statutory interest: "8% plus the Bank of England base rate for business to business transactions" (https://www.gov.uk/late-commercial-payments-interest-debt-recovery/charging-interest-commercial-debt, public update 10 August 2016). The legal rate is set by the Late Payment of Commercial Debts (Rate of Interest) (No. 3) Order 2002, article 4: "8 per cent per annum over the official dealing rate in force on the 30th June (in respect of interest which starts to run between 1st July and 31st December) or the 31st December (in respect of interest which starts to run between 1st January and 30th June)" (https://www.legislation.gov.uk/uksi/2002/1675/article/4, original version).
- Bank Rate: 3.75%, held on 18 June 2026, 30 July 2026 and 17 September 2026 (https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate, checked). So the rate in force on 30 June 2026 was 3.75%, and statutory interest that starts to run between 1 July and 31 December 2026 is 11.75% a year (derived by adding 8%). The rate for interest starting from 1 January 2027 depends on Bank Rate on 31 December 2026 (next decision 5 November 2026).
- Fixed compensation: Late Payment of Commercial Debts (Interest) Act 1998, section 5A(2) (https://www.legislation.gov.uk/ukpga/1998/20/section/5A, latest revised): "for a debt less than £1000, the sum of £40"; "for a debt of £1000 or more, but less than £10,000, the sum of £70"; "for a debt of £10,000 or more, the sum of £100". Under section 5A(2A), reasonable recovery costs above the fixed sum can also be claimed.
- When a payment is late: if no date is agreed, 30 days after the customer receives the invoice or the goods or service are delivered, whichever is later. Agreed terms "must usually be within 30 days for public authorities or 60 days for business transactions" (https://www.gov.uk/late-commercial-payments-interest-debt-recovery, public update 10 August 2016).
- Must or may the invoice state them? No source found requires it. GOV.UK says: "You have the right to charge interest for late payment, but you can choose not to." (https://www.gov.uk/invoicing-and-taking-payment-from-customers/payment-obligations), and "Send a new invoice if you decide to add interest to the money you're owed." The rights apply by law through a term implied into B2B contracts (section 5A(3)). Invoica may offer an optional terms line and should always print the due date ("when the customer must pay you").
- Planned changes: the government response "Time to pay up" (first published 24 March 2026, updated 24 July 2026, https://www.gov.uk/government/consultations/late-payments-tackling-poor-payment-practices/outcome/late-payment-consultation-time-to-pay-up-government-response-web-version) plans a 60-day cap on payment terms "no earlier than 2027", removing the ability to agree an alternative remedy to statutory interest, and a time limit for raising invoice disputes. Legislation will come "as soon as Parliamentary time allows". None of this is law yet.

## Presets for Invoica (UK)

No UK VAT rate is compound. Each line carries one VAT rate. VAT-inclusive pricing uses the VAT fraction rate/(100 + rate).

| Preset key | Name printed on invoice | Rate (basis points) | Compound | Use for | Invoice behaviour |
|---|---|---|---|---|---|
| `uk_vat_standard` | VAT 20% | 2000 | No | Standard-rated goods and services | Adds VAT to the line; counts in VAT total |
| `uk_vat_reduced` | VAT 5% | 500 | No | Reduced-rated supplies (for example domestic fuel and power) | As above |
| `uk_vat_zero` | Zero-rated (0%) | 0 | No | Zero-rated supplies | Prints "Zero-rated"; separate total for zero-rated values |
| `uk_vat_exempt` | Exempt | 0 | No | Exempt supplies (for example many financial, insurance and property transactions) | Prints "Exempt"; separate total; not allowed on a simplified invoice |
| `uk_vat_outside_scope` | Outside the scope of UK VAT | 0 | No | Supplies outside the scope, including most B2B services to customers belonging outside the UK | Prints "Outside the scope of UK VAT"; separate total; store evidence of the customer's business status |
| `uk_vat_drc_standard` | Reverse charge: VAT 20% | 2000 | No | Construction services under the domestic reverse charge | Shows the VAT amount and rate; VAT not added to the amount due; prints "Reverse charge: Customer to pay the VAT to HMRC" |
| `uk_vat_drc_reduced` | Reverse charge: VAT 5% | 500 | No | Reduced-rate construction services under the domestic reverse charge | As above |
| `uk_no_vat` | (no tax line) | none | No | Businesses not VAT registered | No VAT column, no VAT number; optional footer "Not registered for VAT" (design choice, not a legal requirement) |

Rounding: section 5, default per line to the nearest penny with 0.5p up; optional invoice-total round-down for non-retailers.

Currency: default GBP. For non-GBP invoices from a VAT-registered business, print the VAT total in GBP with the rate, its source and its date.

## Invoice fields the UK template must show

### A. Sole trader, not VAT registered

- Invoice number (unique)
- Invoice date
- Supply date (date goods or services were provided)
- Trader's name; business name if used; address where legal documents can be served if a business name is used; contact details
- Customer's name (or company name) and address
- Description of what is charged for
- Amount(s) charged and total amount owed
- Payment due date or terms
- No VAT shown

### B. Partnership trading under a business name, not VAT registered

As A, plus the name of each partner and an address for service for each (Companies Act 2006 section 1201).

### C. Limited company or LLP, not VAT registered

As A, with these changes:

- Registered name exactly as on the certificate of incorporation (required on invoices)
- Registered number, part of the UK where registered (England and Wales, Scotland or Northern Ireland) and registered office address (required on letters, order forms and websites; Invoica should print them on invoices too)
- If any director is named other than as signatory, all directors
- If share capital is shown, paid-up share capital only

### D. Any VAT-registered business: full VAT invoice

All of A, B or C as relevant, plus regulation 14(1):

- Sequential invoice number from one or more series
- Time of supply (tax point), and date of issue if different
- Supplier's name, address and VAT registration number (the VAT-registered name and address if trading under another name)
- Customer's name and address
- For each line: description, quantity or extent, unit price, VAT rate, net amount
- Gross total excluding VAT
- Rate of any cash discount offered
- Total VAT in sterling
- Zero-rated and exempt lines marked, with separate totals
- "reverse charge" reference and customer-accounts note where applicable
- Margin scheme reference where applicable

### E. Simplified VAT invoice (total £250 or less including VAT, customer agrees)

- Supplier's name, address and VAT registration number
- Time of supply (tax point)
- Description of goods or services
- For each VAT rate: total including VAT, and the rate
- No exempt supplies

### F. Modified VAT invoice (retail only, over £250)

Line values VAT-inclusive, with totals at the foot: VAT-inclusive value of standard and reduced-rated items, VAT included, VAT-exclusive value, and a separate total of zero-rated items. Recommend leaving this out of the first release.

### G. VAT credit note

- Credit note number and date of issue
- Supplier's name, address and VAT number
- Customer's name and address
- Number and date of the original VAT invoice(s)
- Description of goods or services
- Decrease in consideration excluding VAT
- VAT rate and VAT credited in sterling
- Issued within 14 days of the decrease
- Reverse charge note where the original was reverse charged

### H. Optional on all B2B invoices

Statement of statutory interest (8% over Bank Rate) and fixed compensation (£40, £70 or £100).

## Open points

1. VAT Notice 700 paragraph 18.2.3 (the details a credit note must show, cited by HMRC manual VATREC13040) could not be read; the page is too long for the reader. The credit note list above is from regulation 15C, which is the law.
2. Quotations from Notice 700 were extracted by an automated reader from GOV.UK's search index text for the page. The wording of paragraph 17.5.2 in particular ("4 digits after the decimal point and then round to 3 digits") should be checked by eye on the live page before it is cited in the product.
3. Who may use a modified invoice: Notice 700/21 section 4.5 suggests non-retailers can; HMRC manual VATREC16043 limits it to retailers.
4. Whether company invoices must carry the registered number and registered office. Regulation 25 names business letters, order forms and websites only. Invoica prints them on invoices as a design choice.
5. Notice 700 paragraph 16.6.1 requires the customer's agreement to a simplified invoice; Notice 700/21 does not mention this condition.
6. Any announcement on the VAT registration threshold for the year from 1 April 2026 or later. GOV.UK gives £90,000 and £88,000 as current, but the Notice 700/1 history table has no row after 31 March 2026, and no Budget 2025 statement on the threshold was found.
7. UK e-invoicing technical details (data standard, access point accreditation, phasing, any small-business start date, cross-border invoices) are not yet official. The roadmap is due at Budget 2026. EN 16931 and Peppol BIS Billing 3.0 are named only by secondary sources.
8. VAT Notice 700/63 (electronic invoicing conditions) and HMRC's guidance on Peppol-ready software were not read.
9. Wording for invoices to EU business customers that their own country's reverse charge may require is outside UK law and not confirmed.
10. Statutory interest from 1 January 2027 depends on Bank Rate on 31 December 2026.
11. The late payment reforms (60-day cap, mandatory statutory interest, dispute window) are policy only. Invoica should not encode them until legislation is published.
