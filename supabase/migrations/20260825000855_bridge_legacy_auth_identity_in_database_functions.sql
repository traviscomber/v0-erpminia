drop policy if exists auth_profile_identity_links_select_own on public.auth_profile_identity_links;
create policy auth_profile_identity_links_select_own
  on public.auth_profile_identity_links
  for select
  to authenticated
  using (auth_user_id = auth.uid());

grant select (auth_user_id, profile_id) on public.auth_profile_identity_links to authenticated;

create or replace function public.current_application_user_id()
returns uuid
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select coalesce(
    (select l.profile_id
       from public.auth_profile_identity_links l
      where l.auth_user_id = auth.uid()),
    auth.uid()
  );
$$;

revoke all on function public.current_application_user_id() from public;
grant execute on function public.current_application_user_id() to authenticated, service_role;

DO $$
DECLARE
  r record;
  ddl text;
BEGIN
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname <> 'current_application_user_id'
      and pg_get_functiondef(p.oid) ilike '%auth.uid()%'
  loop
    ddl := replace(
      pg_get_functiondef(r.oid),
      'auth.uid()',
      'public.current_application_user_id()'
    );
    execute ddl;
  end loop;
END $$;
