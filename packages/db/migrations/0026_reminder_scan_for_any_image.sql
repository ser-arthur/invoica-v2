-- Decision 0011: the reminder scan works with any app image, older or newer, so the scheduler needs no stopping
-- while an upgrade runs or after going back to an older image.

-- The scan an image from before migration 0022 calls, with the contract it was built for: the database's own
-- business date, and the reminder due on it, which that image queues as offered.
create or replace function app.due_reminders(p_now timestamptz)
returns table (organisation_id uuid, document_id uuid, offset_days integer, owner_user_id text)
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  o record;
  v_today date;
begin
  perform set_config('app.reminder_scan', 'on', true);
  for o in
    select org.id, org.reminder_offsets, org.time_zone,
      (select m.user_id from membership m where m.organisation_id = org.id and m.role = 'owner'
       order by m.created_at limit 1) as owner
    from organisation org
    where org.reminders_enabled
    order by org.id
  loop
    begin
      v_today := (p_now at time zone o.time_zone)::date;
    exception when others then
      raise warning 'reminder scan left out organisation %: %', o.id, sqlerrm;
      continue;
    end;
    continue when o.owner is null;
    return query
    with open as (
      select d.id, d.due_date, (d.issued_at at time zone o.time_zone)::date as issued_on
      from document d
      join client c on c.id = d.client_id
      where d.organisation_id = o.id
        and d.kind = 'invoice' and d.lifecycle in ('issued', 'sent') and d.due_date is not null
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
      select open.id as document_id,
        (select max(x) from unnest(o.reminder_offsets) as x
         where open.due_date + x <= v_today and v_today - (open.due_date + x) < 7
           and open.due_date + x >= open.issued_on) as offset_days
      from open
    )
    select o.id, due.document_id, due.offset_days, o.owner
    from due
    where due.offset_days is not null
      and not exists (
        select 1 from outbox x
        where x.organisation_id = o.id
          and x.idempotency_key = 'reminder:' || due.document_id || ':' || due.offset_days
      );
  end loop;
  perform set_config('app.reminder_scan', '', true);
end
$$;

revoke execute on function app.due_reminders(timestamptz) from public;
grant execute on function app.due_reminders(timestamptz) to invoica_worker;

-- The scan the app calls (docs/specs/reminders.md, rule 12): the invoices that may have a reminder due, reading the
-- business date three hours either side of now, and the latest offset not yet queued. The app chooses the reminder
-- with its own date. The same narrow view as app.due_reminders: ids and offsets only, for the worker role only.
create function app.reminder_candidates(p_now timestamptz)
returns table (organisation_id uuid, document_id uuid, offset_days integer, owner_user_id text)
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  o record;
  v_latest date;
  v_earliest date;
begin
  perform set_config('app.reminder_scan', 'on', true);
  for o in
    select org.id, org.reminder_offsets, org.time_zone,
      (select m.user_id from membership m where m.organisation_id = org.id and m.role = 'owner'
       order by m.created_at limit 1) as owner
    from organisation org
    where org.reminders_enabled
    order by org.id
  loop
    begin
      v_latest := ((p_now + interval '3 hours') at time zone o.time_zone)::date;
      v_earliest := ((p_now - interval '3 hours') at time zone o.time_zone)::date;
    exception when others then
      raise warning 'reminder scan left out organisation %: %', o.id, sqlerrm;
      continue;
    end;
    continue when o.owner is null;
    return query
    with open as (
      select d.id, d.due_date,
        ((d.issued_at - interval '3 hours') at time zone o.time_zone)::date as issued_on
      from document d
      join client c on c.id = d.client_id
      where d.organisation_id = o.id
        and d.kind = 'invoice' and d.lifecycle in ('issued', 'sent') and d.due_date is not null
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
      select open.id as document_id,
        (select max(x) from unnest(o.reminder_offsets) as x
         where open.due_date + x <= v_latest and v_earliest - (open.due_date + x) < 7
           and open.due_date + x >= open.issued_on
           and not exists (
             select 1 from outbox q
             where q.organisation_id = o.id and q.idempotency_key = 'reminder:' || open.id || ':' || x
           )) as offset_days
      from open
    )
    select o.id, due.document_id, due.offset_days, o.owner
    from due
    where due.offset_days is not null;
  end loop;
  perform set_config('app.reminder_scan', '', true);
end
$$;

revoke execute on function app.reminder_candidates(timestamptz) from public;
grant execute on function app.reminder_candidates(timestamptz) to invoica_worker;
