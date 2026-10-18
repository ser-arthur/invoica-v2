-- New organisations work tax out per line unless their country's preset says otherwise (decision 0007).
alter table organisation alter column tax_level set default 'line';

-- Templates are named signature, studio and counsel; new organisations and drafts start with signature.
alter table organisation alter column default_template set default 'signature';
alter table document alter column template set default 'signature';
update organisation set default_template = 'signature' where default_template = 'receipt';
