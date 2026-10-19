-- The outbox worker connects as its own role (review 1, L3). Only that role may claim and finish jobs, which
-- reach across organisations; the app role can still queue jobs for its own organisation. The role is created
-- outside migrations: by provisioning in development and tests, in the database provider's console in production.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'invoica_worker') then
    raise exception 'Create the role invoica_worker before running this migration';
  end if;
end
$$;

-- A failure that cannot succeed later (p_retry false) fails the job at once; others are retried with a growing
-- delay, up to eight attempts. Finishing a job only counts while it is running.
drop function app.finish_outbox(uuid, boolean, text);

create function app.finish_outbox(p_id uuid, p_ok boolean, p_error text, p_retry boolean)
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
  elsif not coalesce(p_retry, true) or job.attempts >= 8 then
    update outbox set status = 'failed', last_error = left(p_error, 2000) where id = p_id;
  else
    update outbox
    set status = 'pending', last_error = left(p_error, 2000), run_after = now() + make_interval(secs => 30 * power(2, job.attempts))
    where id = p_id;
  end if;
end
$$;

revoke execute on function app.finish_outbox(uuid, boolean, text, boolean) from public;
revoke execute on function app.claim_outbox(integer) from invoica_app;

grant usage on schema app to invoica_worker;
grant execute on function app.claim_outbox(integer), app.finish_outbox(uuid, boolean, text, boolean) to invoica_worker;
