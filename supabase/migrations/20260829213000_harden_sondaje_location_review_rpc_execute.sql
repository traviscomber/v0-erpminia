-- Restrict the manual canonical drill-hole location mutation RPC to the
-- privileged server-side client. The API route invokes this function through
-- the service-role Supabase client after module-level write authorization.

revoke execute on function public.resolve_drill_hole_location_manual_review(uuid, uuid, uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.resolve_drill_hole_location_manual_review(uuid, uuid, uuid, uuid, text)
  to service_role;
