-- A new client carries the request key of the form that saved it, so saving again after a lost answer, or twice at
-- once, makes one client.
alter table client add column idempotency_key text;
create unique index client_idempotency_key_idx on client (organisation_id, idempotency_key)
  where idempotency_key is not null;
