create or replace view public.finance_asset_reconciliation_v1
with (security_invoker=true) as
select organization_id,
       finance_asset_id,
       finance_asset_code,
       finance_asset_name,
       maintenance_asset_id as canonical_asset_id,
       maintenance_asset_code as canonical_asset_code,
       maintenance_asset_name as canonical_asset_name,
       candidate_count,
       reconciliation_status,
       match_method
from public.finance_maintenance_asset_reconciliation_v1;

comment on view public.finance_asset_reconciliation_v1 is 'Neutral Mining OS contract for reconciling finance asset identities against canonical.assets. The legacy finance_maintenance_asset_reconciliation_v1 name is retained only for compatibility.';
revoke all on public.finance_asset_reconciliation_v1 from anon, authenticated;
grant select on public.finance_asset_reconciliation_v1 to service_role;

comment on view public.finance_maintenance_asset_reconciliation_v1 is 'COMPATIBILITY VIEW: legacy name. Canonical asset identity is owned by canonical.assets; new code should use finance_asset_reconciliation_v1.';
