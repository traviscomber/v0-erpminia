-- The Maintenance Senior Assistant reads the public
-- drill_asset_operational_evidence_90d_v1 view server-side after user/module
-- authorization. That view is security_invoker=true and depends on the
-- canonical.asset_availability_daily table. Keep direct access unavailable to
-- anon/authenticated roles, but allow the server-only service role to resolve
-- the canonical dependency.

grant select on table canonical.asset_availability_daily to service_role;
