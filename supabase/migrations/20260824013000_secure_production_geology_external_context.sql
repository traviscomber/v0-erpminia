-- External geology context is populated and consumed only by backend jobs.
-- Keep the table outside the public Data API while preserving service-role CRUD.

alter table public.production_geology_external_context enable row level security;

revoke all on table public.production_geology_external_context
from public, anon, authenticated;

grant select, insert, update, delete
on table public.production_geology_external_context
to service_role;
