-- New saved items and tax codes carry the request key of the form that saved them, as new clients do (0020), so
-- saving again after a lost answer, or twice at once, makes one.
alter table item add column idempotency_key text;
create unique index item_idempotency_key_idx on item (organisation_id, idempotency_key)
  where idempotency_key is not null;
alter table tax_code add column idempotency_key text;
create unique index tax_code_idempotency_key_idx on tax_code (organisation_id, idempotency_key)
  where idempotency_key is not null;
