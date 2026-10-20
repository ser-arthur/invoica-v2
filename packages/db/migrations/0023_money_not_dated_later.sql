-- Money is recorded once it is received or paid back, so a payment or refund dated after today is refused here as
-- well as in the app. The app checks to the day in the business's time zone; this allows one day more, as the
-- database's time zone data and the app's can read an hour apart.
create function app.guard_not_dated_later() returns trigger language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_day date := (to_jsonb(new) ->> tg_argv[0])::date;
  v_zone text;
begin
  select o.time_zone into v_zone from organisation o where o.id = new.organisation_id;
  if v_zone is not null and v_day > (now() at time zone v_zone)::date + 1 then
    raise exception '%', tg_argv[1] using errcode = 'P0001';
  end if;
  return new;
end
$$;
revoke execute on function app.guard_not_dated_later() from public;

create trigger payment_not_dated_later before insert or update of paid_on on payment
  for each row execute function app.guard_not_dated_later('paid_on', 'A payment cannot be dated after today.');
create trigger refund_not_dated_later before insert on refund
  for each row execute function app.guard_not_dated_later('refunded_on', 'A refund cannot be dated after today.');
