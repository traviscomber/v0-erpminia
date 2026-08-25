grant select (auth_user_id, profile_id) on public.auth_profile_identity_links to anon;
grant execute on function public.current_application_user_id() to anon;

DO $$
DECLARE
  r record;
  using_expr text;
  check_expr text;
  ddl text;
BEGIN
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where (coalesce(qual,'') ilike '%auth.uid()%'
       or coalesce(with_check,'') ilike '%auth.uid()%')
      and not (schemaname='public' and tablename='auth_profile_identity_links' and policyname='auth_profile_identity_links_select_own')
  loop
    using_expr := case when r.qual is null then null else replace(r.qual, 'auth.uid()', 'public.current_application_user_id()') end;
    check_expr := case when r.with_check is null then null else replace(r.with_check, 'auth.uid()', 'public.current_application_user_id()') end;

    ddl := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if using_expr is not null then
      ddl := ddl || format(' using (%s)', using_expr);
    end if;
    if check_expr is not null then
      ddl := ddl || format(' with check (%s)', check_expr);
    end if;

    execute ddl;
  end loop;
END $$;
