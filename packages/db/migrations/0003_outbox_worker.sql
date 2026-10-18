-- The outbox worker claims jobs across organisations through two security-definer functions. The app role
-- still sees only its own organisation's jobs; the functions run as the migration role, which the table no
-- longer forces row-level security on.

alter table outbox no force row level security;

-- A credit note is created from a request that may be repeated; its key makes the repeat a no-op.
alter table document add column idempotency_key text;
create unique index document_idempotency on document (organisation_id, idempotency_key) where idempotency_key is not null;

-- Claims up to p_limit due jobs, marks them running and returns them. Jobs left running for more than
-- ten minutes are treated as abandoned and claimed again.
create function app.claim_outbox(p_limit integer)
returns table (id uuid, organisation_id uuid, topic text, payload jsonb, requested_by text, attempts integer)
language sql volatile security definer set search_path = public, pg_temp
as $$
  update outbox o
  set status = 'running', attempts = o.attempts + 1, run_after = now() + interval '10 minutes'
  where o.id in (
    select j.id from outbox j
    where (j.status = 'pending' and j.run_after <= now())
       or (j.status = 'running' and j.run_after <= now())
    order by j.run_after
    limit p_limit
    for update skip locked
  )
  returning o.id, o.organisation_id, o.topic, o.payload, o.requested_by, o.attempts
$$;

-- Records the outcome of a claimed job. Failures are retried with a growing delay, up to eight attempts.
create function app.finish_outbox(p_id uuid, p_ok boolean, p_error text)
returns void
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  tries integer;
begin
  select attempts into tries from outbox where id = p_id for update;
  if p_ok then
    update outbox set status = 'done', done_at = now(), last_error = null where id = p_id;
  elsif tries >= 8 then
    update outbox set status = 'failed', last_error = left(p_error, 2000) where id = p_id;
  else
    update outbox
    set status = 'pending', last_error = left(p_error, 2000), run_after = now() + make_interval(secs => 30 * power(2, tries))
    where id = p_id;
  end if;
end
$$;

revoke execute on function app.claim_outbox(integer), app.finish_outbox(uuid, boolean, text) from public;
grant execute on function app.claim_outbox(integer), app.finish_outbox(uuid, boolean, text) to invoica_app;
