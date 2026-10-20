-- Business dates for reminders are worked out in one place, the app, as the invoice page works them out
-- (docs/specs/reminders.md, rule 12). The database's time zone data and the app's are updated separately and can
-- read an hour apart, so the scan offers each open invoice that may have a reminder due by the database's reading
-- of the date, a day either side, and the app chooses the reminder, if any, by its own.

-- A business's time zone is a place in one of the time zone database's regions, or UTC, and one the database knows.
-- Names outside a region ("CET", "Factory", "localtime") are refused: the app reads some of them differently and
-- others not at all. `isValidTimeZone` in @invoica/core checks the same.
create or replace function app.guard_time_zone()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.time_zone !~ '^(UTC|(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Etc|Indian|Pacific)(/[A-Za-z0-9_+-]+)+)$'
     or not exists (select 1 from pg_timezone_names where name = new.time_zone) then
    raise exception 'Choose a time zone from the list.' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- The scan, one business at a time. `offset_days` is the latest offset not yet queued whose day falls in the week
-- before today, by the database's date and with a day's margin either side, and not before the day before the
-- invoice was issued. The app checks it against its own date and queues the reminder it finds due.
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
         where open.due_date + x <= v_today + 1 and v_today - (open.due_date + x) < 8
           and open.due_date + x >= open.issued_on - 1
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
