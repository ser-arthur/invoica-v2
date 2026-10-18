-- Tenancy, immutability and grants.
--
-- The app connects as invoica_app, which owns nothing and cannot bypass row-level security. Each transaction
-- sets app.user_id (from the verified session) and app.organisation_id. app.current_organisation_id() only
-- returns the organisation when that user is a member of it, so a wrong organisation id sees nothing.

alter table organisation
  add foreign key (id, logo_file_id) references stored_file (organisation_id, id);

create function app.current_user_id() returns text
language sql stable
as $$ select nullif(current_setting('app.user_id', true), '') $$;

create function app.current_organisation_id() returns uuid
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  org uuid := nullif(current_setting('app.organisation_id', true), '')::uuid;
begin
  if org is null then
    return null;
  end if;
  if not exists (select 1 from membership m where m.organisation_id = org and m.user_id = app.current_user_id()) then
    return null;
  end if;
  return org;
end
$$;

-- The organisations the signed-in user belongs to, for choosing one before any organisation is set.
create function app.my_organisations()
returns table (id uuid, name text, role text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select o.id, o.name, m.role
  from organisation o
  join membership m on m.organisation_id = o.id
  where m.user_id = app.current_user_id()
  order by m.created_at
$$;

-- Creates an organisation with the signed-in user as its owner, its number counters and an audit entry.
create function app.create_organisation(
  p_name text,
  p_country_code char(2),
  p_base_currency char(3),
  p_time_zone text,
  p_trial_days integer
) returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  uid text := app.current_user_id();
  org uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into organisation (name, country_code, base_currency, time_zone, trial_ends_at)
  values (p_name, p_country_code, p_base_currency, p_time_zone, now() + make_interval(days => p_trial_days))
  returning id into org;
  insert into membership (organisation_id, user_id, role) values (org, uid, 'owner');
  perform set_config('app.organisation_id', org::text, true);
  insert into number_counter (organisation_id, kind) values (org, 'invoice'), (org, 'credit_note');
  insert into audit_log (organisation_id, actor_user_id, action, entity, entity_id)
  values (org, uid, 'organisation.created', 'organisation', org::text);
  return org;
end
$$;

-- Row-level security. Organisation and membership are not forced, so the security-definer functions above
-- (owned by the migration role) can read and create them; the app role has no insert or delete policy on either.
alter table organisation enable row level security;
create policy organisation_member on organisation
  for select using (id = (select app.current_organisation_id()));
create policy organisation_update on organisation
  for update using (id = (select app.current_organisation_id()))
  with check (id = (select app.current_organisation_id()));

alter table membership enable row level security;
create policy membership_visible on membership
  for select using (user_id = app.current_user_id() or organisation_id = (select app.current_organisation_id()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'tax_code', 'client', 'client_field', 'item', 'stored_file', 'document', 'document_line',
    'payment', 'number_counter', 'outbox'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy tenant on %I for all using (organisation_id = (select app.current_organisation_id())) '
      'with check (organisation_id = (select app.current_organisation_id()))', t);
  end loop;
end
$$;

alter table audit_log enable row level security;
alter table audit_log force row level security;
create policy audit_read on audit_log for select using (organisation_id = (select app.current_organisation_id()));
create policy audit_write on audit_log for insert with check (organisation_id = (select app.current_organisation_id()));

-- updated_at
create function app.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

do $$
declare
  t text;
begin
  foreach t in array array['auth_user', 'auth_session', 'auth_account', 'auth_verification', 'organisation', 'tax_code', 'client', 'item', 'document']
  loop
    execute format('create trigger touch_updated_at before update on %I for each row execute function app.touch_updated_at()', t);
  end loop;
end
$$;

-- An issued document never changes. Only its delivery and void fields, and a first PDF, may be set.
create function app.guard_document() returns trigger language plpgsql as $$
declare
  mutable text[] := array['lifecycle', 'sent_at', 'voided_at', 'void_reason', 'pdf_file_id', 'updated_at'];
begin
  if tg_op = 'DELETE' then
    if old.lifecycle <> 'draft' then
      raise exception 'An issued document cannot be deleted' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if old.lifecycle = 'draft' then
    if new.lifecycle not in ('draft', 'issued') then
      raise exception 'A draft can only be issued' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if (to_jsonb(old) - mutable) is distinct from (to_jsonb(new) - mutable) then
    raise exception 'An issued document cannot be changed' using errcode = 'P0001';
  end if;
  if old.pdf_file_id is not null and new.pdf_file_id is distinct from old.pdf_file_id then
    raise exception 'A kept PDF cannot be replaced' using errcode = 'P0001';
  end if;
  if not (
    new.lifecycle = old.lifecycle
    or (old.lifecycle = 'issued' and new.lifecycle in ('sent', 'void'))
    or (old.lifecycle = 'sent' and new.lifecycle = 'void')
  ) then
    raise exception 'Cannot move a document from % to %', old.lifecycle, new.lifecycle using errcode = 'P0001';
  end if;
  if new.lifecycle = 'void' and old.lifecycle <> 'void' and exists (
    select 1 from payment p where p.document_id = old.id and p.removed_at is null
  ) then
    raise exception 'A document with payments recorded cannot be voided' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger document_guard before update or delete on document
  for each row execute function app.guard_document();

-- Lines can only change while their document is a draft.
create function app.guard_document_line() returns trigger language plpgsql as $$
declare
  parent_lifecycle text;
begin
  select d.lifecycle into parent_lifecycle from document d where d.id = coalesce(new.document_id, old.document_id);
  if found and parent_lifecycle <> 'draft' then
    raise exception 'Lines of an issued document cannot be changed' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end
$$;
create trigger document_line_guard before insert or update or delete on document_line
  for each row execute function app.guard_document_line();

-- Payments: only against issued documents, in their currency, never above the balance. Once recorded, a
-- payment can only be marked removed, with a reason.
create function app.guard_payment() returns trigger language plpgsql as $$
declare
  doc record;
  applied bigint;
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(old) - array['removed_at', 'removed_reason']) is distinct from (to_jsonb(new) - array['removed_at', 'removed_reason'])
      or old.removed_at is not null then
      raise exception 'A recorded payment cannot be changed' using errcode = 'P0001';
    end if;
    return new;
  end if;

  select d.lifecycle, d.total, d.currency, d.kind into doc from document d where d.id = new.document_id for update;
  if doc.kind <> 'invoice' or doc.lifecycle not in ('issued', 'sent') then
    raise exception 'Payments can only be recorded on issued invoices' using errcode = 'P0001';
  end if;
  if doc.currency <> new.currency then
    raise exception 'A payment must be in the invoice currency' using errcode = 'P0001';
  end if;
  select coalesce(sum(p.amount), 0) into applied from payment p where p.document_id = new.document_id and p.removed_at is null;
  applied := applied + coalesce((
    select sum(c.total) from document c
    where c.credited_document_id = new.document_id and c.kind = 'credit_note' and c.lifecycle in ('issued', 'sent')
  ), 0);
  if applied + new.amount > doc.total then
    raise exception 'The payment is more than the balance due' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger payment_guard before insert or update on payment
  for each row execute function app.guard_payment();

create function app.refuse_change() returns trigger language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'P0001';
end
$$;
create trigger audit_log_append_only before update or delete on audit_log
  for each row execute function app.refuse_change();
create trigger payment_no_delete before delete on payment
  for each row execute function app.refuse_change();

-- Grants for the app role. It owns nothing, so row-level security always applies to it.
revoke all on all tables in schema public from public;
revoke execute on all functions in schema app from public;
grant usage on schema app to invoica_app;
grant execute on function app.current_user_id(), app.current_organisation_id(), app.my_organisations(),
  app.create_organisation(text, char, char, text, integer) to invoica_app;
grant select, insert, update, delete on auth_user, auth_session, auth_account, auth_verification to invoica_app;
grant select, update on organisation to invoica_app;
grant select on membership to invoica_app;
grant select, insert, update, delete on tax_code, client, client_field, item, stored_file, document, document_line, outbox
  to invoica_app;
grant select, insert, update on payment, number_counter to invoica_app;
grant select, insert on audit_log to invoica_app;
