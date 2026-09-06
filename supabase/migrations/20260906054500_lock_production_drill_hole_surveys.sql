alter table public.production_drill_hole_surveys enable row level security;

revoke all on table public.production_drill_hole_surveys from anon, authenticated;
grant select, insert, update, delete on table public.production_drill_hole_surveys to service_role;

comment on table public.production_drill_hole_surveys is 'Server-mediated canonical downhole survey stations for La Patagua drill holes. Direct anon/authenticated access is disabled; source-backed numeric survey evidence only.';
