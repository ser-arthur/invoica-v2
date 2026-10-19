-- Reminders about unpaid invoices (docs/specs/reminders.md). Off by default; when on, the owner chooses when they
-- go. A client can be left out, and an invoice paused.

alter table organisation
  add column reminders_enabled boolean not null default false,
  add column reminder_offsets integer[] not null default '{-3,0,7,14,30}'
    check (reminder_offsets <@ array[-3, 0, 7, 14, 30]),
  add column reminder_wording jsonb not null default '{}'::jsonb;

alter table client add column reminders_enabled boolean not null default true;

create table reminder_pause (
  organisation_id uuid not null references organisation (id),
  document_id uuid not null,
  paused_by text references auth_user (id) on delete set null,
  paused_at timestamptz not null default now(),
  primary key (organisation_id, document_id),
  foreign key (organisation_id, document_id) references document (organisation_id, id)
);
alter table reminder_pause enable row level security;
alter table reminder_pause force row level security;
create policy tenant on reminder_pause for all using (organisation_id = (select app.current_organisation_id()))
  with check (organisation_id = (select app.current_organisation_id()));
grant select, insert, delete on reminder_pause to invoica_app;

-- The scan for due reminders runs on a schedule, outside any signed-in session, so it is the one place that looks
-- across organisations. It reads through app.due_reminders below, which returns ids only: for each invoice with a
-- reminder due, its organisation, the reminder's offset and the organisation's owner, as whom the reminder is then
-- queued inside that organisation as usual. While it runs it sets app.reminder_scan, and only the migration role,
-- which owns the function, is let through by these policies.
do $$
declare
  t text;
begin
  foreach t in array array['document', 'client', 'payment', 'refund', 'reminder_pause']
  loop
    execute format(
      'create policy reminder_scan on %I for select to invoica_owner '
      'using (current_setting(''app.reminder_scan'', true) = ''on'')', t);
  end loop;
end
$$;

create function app.due_reminders(p_now timestamptz)
returns table (organisation_id uuid, document_id uuid, offset_days integer, owner_user_id text)
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
begin
  perform set_config('app.reminder_scan', 'on', true);
  return query
  with orgs as (
    select o.id, o.reminder_offsets, (p_now at time zone o.time_zone)::date as today,
      (select m.user_id from membership m where m.organisation_id = o.id and m.role = 'owner'
       order by m.created_at limit 1) as owner
    from organisation o
    where o.reminders_enabled
  ),
  open as (
    select d.organisation_id, d.id, d.due_date, orgs.today, orgs.reminder_offsets, orgs.owner
    from document d
    join orgs on orgs.id = d.organisation_id
    join client c on c.id = d.client_id
    where d.kind = 'invoice' and d.lifecycle in ('issued', 'sent') and d.due_date is not null
      and c.reminders_enabled and coalesce(c.email, '') <> ''
      and not exists (select 1 from reminder_pause rp where rp.document_id = d.id)
      and d.total
        - coalesce((select sum(p.amount) from payment p where p.document_id = d.id and p.removed_at is null), 0)
        + coalesce((select sum(r.amount) from refund r where r.document_id = d.id), 0)
        - coalesce((
            select sum(n.total) from document n
            where n.credited_document_id = d.id and n.kind = 'credit_note' and n.lifecycle in ('issued', 'sent')
          ), 0) > 0
  ),
  due as (
    select open.organisation_id, open.id as document_id, open.owner,
      (select max(o) from unnest(open.reminder_offsets) as o
       where open.due_date + o <= open.today and open.today - (open.due_date + o) < 7) as offset_days
    from open
  )
  select due.organisation_id, due.document_id, due.offset_days, due.owner
  from due
  where due.offset_days is not null and due.owner is not null
    and not exists (
      select 1 from outbox x
      where x.organisation_id = due.organisation_id
        and x.idempotency_key = 'reminder:' || due.document_id || ':' || due.offset_days
    );
  perform set_config('app.reminder_scan', '', true);
end
$$;

revoke execute on function app.due_reminders(timestamptz) from public;
grant execute on function app.due_reminders(timestamptz) to invoica_worker;
