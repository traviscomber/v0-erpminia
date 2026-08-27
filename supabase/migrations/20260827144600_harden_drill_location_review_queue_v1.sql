alter view public.production_drill_hole_location_review_queue_v3 set (security_invoker = true);
alter view public.production_drill_hole_location_review_queue_v4 set (security_invoker = true);
alter view public.production_drill_hole_location_review_queue_v5 set (security_invoker = true);
revoke all on public.production_drill_hole_location_review_queue_v3 from public, anon, authenticated;
revoke all on public.production_drill_hole_location_review_queue_v4 from public, anon, authenticated;
revoke all on public.production_drill_hole_location_review_queue_v5 from public, anon, authenticated;
grant select on public.production_drill_hole_location_review_queue_v3 to service_role;
grant select on public.production_drill_hole_location_review_queue_v4 to service_role;
grant select on public.production_drill_hole_location_review_queue_v5 to service_role;
