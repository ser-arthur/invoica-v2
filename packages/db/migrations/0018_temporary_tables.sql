-- Neither the app nor the worker needs temporary tables, so only the migration role may create them. By default
-- every role may, on any database (PostgreSQL grants TEMPORARY to PUBLIC).
do $$
begin
  execute format('revoke temporary on database %I from public', current_database());
  execute format('grant temporary on database %I to invoica_owner', current_database());
end
$$;
