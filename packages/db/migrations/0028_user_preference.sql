-- docs/specs/theme-on-the-account.md and docs/decisions/0014-theme-on-the-account.md: a person's own settings, the
-- same in every business they belong to. The first table that belongs to a person and to no organisation, so its row
-- rule is by person: a transaction sees and writes only the row of the user it runs as (app.user_id, set from
-- the verified session). Removed with the person's account.

create table user_preference (
  user_id text primary key references auth_user (id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  updated_at timestamptz not null default now()
);

alter table user_preference enable row level security;
alter table user_preference force row level security;

create policy own_preference on user_preference for all
  using (user_id = (select app.current_user_id()))
  with check (user_id = (select app.current_user_id()));

create trigger touch_updated_at before update on user_preference
  for each row execute function app.touch_updated_at();

grant select, insert, update on user_preference to invoica_app;
