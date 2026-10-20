-- The reminder scan, made safe against one business's time zone, and reminders only from the day an invoice is
-- issued (docs/specs/reminders.md, rules 9 and 10).

-- A business's time zone is a region name the database knows. A bare offset such as '+05:30' is refused: PostgreSQL
-- reads it as POSIX, the other way round from the app.
create function app.guard_time_zone()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.time_zone !~ '^[A-Za-z][A-Za-z_]*(/[A-Za-z0-9_+-]+)*$'
     or not exists (select 1 from pg_timezone_names where name = new.time_zone) then
    raise exception 'Choose a time zone from the list.' using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke execute on function app.guard_time_zone() from public;

create trigger guard_time_zone
before insert or update of time_zone on organisation
for each row execute function app.guard_time_zone();

-- The same scan, one business at a time: a business whose date cannot be worked out (its time zone is no longer in
-- the database's data) is left out with a warning, and every other business is still scanned. A reminder whose day
-- is before the day the invoice was issued, in the business's time zone, is not sent.
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
