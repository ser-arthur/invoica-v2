-- VAT in sterling on UK VAT documents in another currency (docs/specs/vat-in-sterling.md). The organisation chooses
-- how it converts, HMRC's period rate by default; a draft carries its rate as units of its currency to £1, in
-- millionths. The issued document keeps the rate, the method, the date and the converted figures in its snapshot.

alter table organisation
  add column sterling_rate_method text not null default 'hmrc_period'
  check (sterling_rate_method in ('hmrc_period', 'market'));

alter table document
  add column sterling_rate bigint check (sterling_rate is null or sterling_rate > 0);
