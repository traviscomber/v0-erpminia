create or replace function public.current_application_user_id()
returns uuid
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select case
    when auth.role() = 'service_role' then
      nullif(
        coalesce(current_setting('request.headers', true), '{}')::jsonb
          ->> 'x-application-user-id',
        ''
      )::uuid
    else coalesce(
      (select l.profile_id
         from public.auth_profile_identity_links l
        where l.auth_user_id = auth.uid()),
      auth.uid()
    )
  end;
$$;

revoke all on function public.current_application_user_id() from public;
grant execute on function public.current_application_user_id() to authenticated, service_role;

comment on function public.current_application_user_id() is
  'Returns the linked application user for authenticated JWTs, or the verified application actor forwarded by trusted service-role API routes.';
