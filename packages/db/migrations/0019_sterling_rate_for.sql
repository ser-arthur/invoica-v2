-- What a draft's exchange rate was entered for: its currency, the way rates are chosen, and the month (HMRC's period
-- rate) or day (a market rate) of the tax point, as "EUR|hmrc_period|2026-10". A rate that no longer fits, because
-- the currency or the tax point changed, is asked for again (docs/specs/vat-in-sterling.md, rule 8).
alter table document add column sterling_rate_for text;
