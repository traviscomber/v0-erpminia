create or replace view public.procurement_three_way_match_lines_v1
with (security_invoker=true)
as select * from intelligence.procurement_three_way_match_lines_v1;

create or replace view public.procurement_three_way_match_summary_v1
with (security_invoker=true)
as select * from intelligence.procurement_three_way_match_summary_v1;

revoke all on public.procurement_three_way_match_lines_v1 from public, anon, authenticated;
revoke all on public.procurement_three_way_match_summary_v1 from public, anon, authenticated;
grant select on public.procurement_three_way_match_lines_v1 to service_role;
grant select on public.procurement_three_way_match_summary_v1 to service_role;
