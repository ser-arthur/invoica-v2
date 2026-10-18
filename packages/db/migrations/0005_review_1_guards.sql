-- Guards added after the first independent review (docs/reviews/review-1.md):
-- documents are only created as drafts; a credit note cannot be issued for more than the invoice's balance;
-- credit notes cannot be voided, and an invoice with credit notes cannot be voided; lines cannot move between
-- documents; stored files do not change; credit note lines remember the invoice line they credit; repeated
-- requests are recognised by a fingerprint of what they asked for; the outbox and organisation functions check
-- their input.

alter table document_line add constraint document_line_org_id unique (organisation_id, id);
alter table document_line add column credited_line_id uuid;
alter table document_line
  add foreign key (organisation_id, credited_line_id) references document_line (organisation_id, id);
create index document_line_credited_idx on document_line (organisation_id, credited_line_id) where credited_line_id is not null;

alter table document add column request_fingerprint text;
alter table payment add column request_fingerprint text;

create function app.guard_document_insert() returns trigger language plpgsql as $$
begin
  if new.lifecycle <> 'draft' then
    raise exception 'Documents are created as drafts and issued from there' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger document_guard_insert before insert on document
  for each row execute function app.guard_document_insert();

create or replace function app.guard_document() returns trigger language plpgsql as $$
declare
  mutable text[] := array['lifecycle', 'sent_at', 'voided_at', 'void_reason', 'pdf_file_id', 'updated_at'];
  inv record;
  applied bigint;
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
    if new.lifecycle = 'issued' and new.kind = 'credit_note' then
      select d.lifecycle, d.total, d.kind, d.currency into inv from document d where d.id = new.credited_document_id for update;
      if inv.kind <> 'invoice' or inv.lifecycle not in ('issued', 'sent') then
        raise exception 'Credit notes can only be issued against issued invoices' using errcode = 'P0001';
      end if;
      if new.currency <> inv.currency then
        raise exception 'A credit note must be in the invoice currency' using errcode = 'P0001';
      end if;
      select coalesce(sum(p.amount), 0) into applied from payment p
        where p.document_id = new.credited_document_id and p.removed_at is null;
      applied := applied + coalesce((
        select sum(c.total) from document c
        where c.credited_document_id = new.credited_document_id and c.kind = 'credit_note'
          and c.lifecycle in ('issued', 'sent') and c.id <> new.id
      ), 0);
      if applied + new.total > inv.total then
        raise exception 'A credit note cannot be more than the balance still owed' using errcode = 'P0001';
      end if;
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
  if new.lifecycle = 'void' and old.lifecycle <> 'void' then
    if old.kind = 'credit_note' then
      raise exception 'A credit note cannot be voided' using errcode = 'P0001';
    end if;
    if exists (select 1 from payment p where p.document_id = old.id and p.removed_at is null) then
      raise exception 'A document with payments recorded cannot be voided' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from document c where c.credited_document_id = old.id and c.kind = 'credit_note' and c.lifecycle in ('issued', 'sent')
    ) then
      raise exception 'An invoice with credit notes cannot be voided' using errcode = 'P0001';
    end if;
  end if;
  return new;
end
$$;

create or replace function app.guard_document_line() returns trigger language plpgsql as $$
declare
  parent_lifecycle text;
begin
  if tg_op = 'UPDATE' and (new.document_id is distinct from old.document_id or new.organisation_id is distinct from old.organisation_id) then
    raise exception 'A line cannot move to another document' using errcode = 'P0001';
  end if;
  select d.lifecycle into parent_lifecycle from document d where d.id = coalesce(old.document_id, new.document_id);
  if found and parent_lifecycle <> 'draft' then
    raise exception 'Lines of an issued document cannot be changed' using errcode = 'P0001';
  end if;
  if tg_op <> 'DELETE' and new.credited_line_id is not null and not exists (
    select 1 from document c join document_line l on l.document_id = c.credited_document_id
    where c.id = new.document_id and c.kind = 'credit_note' and l.id = new.credited_line_id
  ) then
    raise exception 'A credit note line can only credit a line of the invoice it credits' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end
$$;

create function app.guard_stored_file() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'A stored file cannot be changed' using errcode = 'P0001';
  end if;
  if exists (select 1 from document d where d.pdf_file_id = old.id)
     or exists (select 1 from organisation o where o.logo_file_id = old.id) then
    raise exception 'A file in use cannot be deleted' using errcode = 'P0001';
  end if;
  return old;
end
$$;
create trigger stored_file_guard before update or delete on stored_file
  for each row execute function app.guard_stored_file();

-- Finishing a job only counts while the job is running.
create or replace function app.finish_outbox(p_id uuid, p_ok boolean, p_error text)
returns void
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  job record;
begin
  select attempts, status into job from outbox where id = p_id for update;
  if not found or job.status <> 'running' then
    return;
  end if;
  if p_ok then
    update outbox set status = 'done', done_at = now(), last_error = null where id = p_id;
  elsif job.attempts >= 8 then
    update outbox set status = 'failed', last_error = left(p_error, 2000) where id = p_id;
  else
    update outbox
    set status = 'pending', last_error = left(p_error, 2000), run_after = now() + make_interval(secs => 30 * power(2, job.attempts))
    where id = p_id;
  end if;
end
$$;

-- Organisation creation checks what it is given.
create or replace function app.create_organisation(
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
  if p_trial_days is null or p_trial_days < 0 or p_trial_days > 30 then
    raise exception 'A trial lasts at most 30 days' using errcode = '22023';
  end if;
  if p_country_code !~ '^[A-Z]{2}$' or p_base_currency !~ '^[A-Z]{3}$' then
    raise exception 'Country or currency code is not valid' using errcode = '22023';
  end if;
  perform now() at time zone p_time_zone;
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
