alter table public.production_plant_shifts add column if not exists mineral_moisture_pct numeric null check (mineral_moisture_pct is null or (mineral_moisture_pct >= 0 and mineral_moisture_pct < 100));
alter table public.production_metallurgy_results add column if not exists concentrate_wet_metric_tons numeric null check (concentrate_wet_metric_tons is null or concentrate_wet_metric_tons >= 0);
alter table public.production_metallurgy_results add column if not exists concentrate_moisture_pct numeric null check (concentrate_moisture_pct is null or (concentrate_moisture_pct >= 0 and concentrate_moisture_pct < 100));

insert into public.production_calculation_rules (organization_id, rule_code, domain, output_field, input_fields, formula_description, rule_version, status, evidence)
select distinct organization_id, 'MET_MINERAL_DRY_TONS_V2', 'metallurgy', 'mineral_dry_metric_tons', '["treated_metric_tons","mineral_moisture_pct"]'::jsonb, 'treated_metric_tons * (1 - mineral_moisture_pct / 100)', 'v2', 'approved', 'Separates mineral feed moisture explicitly. Dry mineral basis required before applying head grade.'
from public.production_calculation_rules
on conflict (organization_id, rule_code, rule_version) do nothing;

insert into public.production_calculation_rules (organization_id, rule_code, domain, output_field, input_fields, formula_description, rule_version, status, evidence)
select distinct organization_id, 'MET_FEED_FINE_V2', 'metallurgy', 'feed_fine_metric_tons', '["treated_metric_tons","mineral_moisture_pct","head_grade"]'::jsonb, 'treated_metric_tons * (1 - mineral_moisture_pct / 100) * head_grade / 100', 'v2', 'approved', 'Calculates feed fine metal only after converting wet mineral feed to dry metric tons.'
from public.production_calculation_rules
on conflict (organization_id, rule_code, rule_version) do nothing;

insert into public.production_calculation_rules (organization_id, rule_code, domain, output_field, input_fields, formula_description, rule_version, status, evidence)
select distinct organization_id, 'MET_CONCENTRATE_DRY_TONS_V2', 'metallurgy', 'concentrate_dry_metric_tons', '["concentrate_wet_metric_tons","concentrate_moisture_pct"]'::jsonb, 'concentrate_wet_metric_tons * (1 - concentrate_moisture_pct / 100)', 'v2', 'approved', 'Separates concentrate moisture from mineral feed moisture and converts produced concentrate to dry basis.'
from public.production_calculation_rules
on conflict (organization_id, rule_code, rule_version) do nothing;

insert into public.production_calculation_rules (organization_id, rule_code, domain, output_field, input_fields, formula_description, rule_version, status, evidence)
select distinct organization_id, 'MET_CONCENTRATE_FINE_V2', 'metallurgy', 'concentrate_fine_metric_tons', '["concentrate_wet_metric_tons","concentrate_moisture_pct","concentrate_grade"]'::jsonb, 'concentrate_wet_metric_tons * (1 - concentrate_moisture_pct / 100) * concentrate_grade / 100', 'v2', 'approved', 'Calculates fine metal in produced concentrate on dry concentrate basis.'
from public.production_calculation_rules
on conflict (organization_id, rule_code, rule_version) do nothing;

insert into public.production_calculation_rules (organization_id, rule_code, domain, output_field, input_fields, formula_description, rule_version, status, evidence)
select distinct organization_id, 'MET_BALANCE_RECOVERY_V2', 'metallurgy', 'balance_recovery_pct', '["feed_fine_metric_tons","concentrate_fine_metric_tons"]'::jsonb, 'concentrate_fine_metric_tons / feed_fine_metric_tons * 100', 'v2', 'approved', 'Secondary recovery check by fine-metal balance; only valid when both dry-basis fine values are evidenced.'
from public.production_calculation_rules
on conflict (organization_id, rule_code, rule_version) do nothing;

drop view if exists public.production_metallurgy_automatic_v1;
create view public.production_metallurgy_automatic_v1 as
select
  r.*,
  s.operation_date,
  s.shift_code,
  s.treated_metric_tons,
  s.mineral_moisture_pct,
  s.humidity_factor as legacy_humidity_factor,
  case when s.treated_metric_tons is null or s.mineral_moisture_pct is null then null
       else s.treated_metric_tons * (1 - s.mineral_moisture_pct / 100) end as automatic_mineral_dry_tons,
  case when s.treated_metric_tons is null or s.mineral_moisture_pct is null or r.head_grade is null then null
       else s.treated_metric_tons * (1 - s.mineral_moisture_pct / 100) * r.head_grade / 100 end as automatic_feed_fine,
  case when r.head_grade is null or r.concentrate_grade is null or r.tailings_grade is null or r.head_grade = 0 or r.concentrate_grade = r.tailings_grade then null
       else ((r.head_grade - r.tailings_grade) * r.concentrate_grade) / ((r.concentrate_grade - r.tailings_grade) * r.head_grade) * 100 end as automatic_recovery_by_grades,
  case when r.concentrate_wet_metric_tons is null or r.concentrate_moisture_pct is null then null
       else r.concentrate_wet_metric_tons * (1 - r.concentrate_moisture_pct / 100) end as automatic_concentrate_dry_tons,
  case when r.concentrate_wet_metric_tons is null or r.concentrate_moisture_pct is null or r.concentrate_grade is null then null
       else r.concentrate_wet_metric_tons * (1 - r.concentrate_moisture_pct / 100) * r.concentrate_grade / 100 end as automatic_concentrate_fine,
  case when s.treated_metric_tons is null or s.mineral_moisture_pct is null or r.head_grade is null or r.concentrate_wet_metric_tons is null or r.concentrate_moisture_pct is null or r.concentrate_grade is null then null
       when (s.treated_metric_tons * (1 - s.mineral_moisture_pct / 100) * r.head_grade / 100) = 0 then null
       else (r.concentrate_wet_metric_tons * (1 - r.concentrate_moisture_pct / 100) * r.concentrate_grade / 100) / (s.treated_metric_tons * (1 - s.mineral_moisture_pct / 100) * r.head_grade / 100) * 100 end as automatic_recovery_by_fine_balance,
  case when r.dispatch_moisture is null or r.dispatch_grade is null or r.dispatched_metric_tons is null then null
       else (1 - r.dispatch_moisture / 100) * (r.dispatch_grade / 100) * r.dispatched_metric_tons end as automatic_real_fine_dispatch
from public.production_metallurgy_results r
join public.production_plant_shifts s on s.id = r.plant_shift_id and s.organization_id = r.organization_id;
revoke all on public.production_metallurgy_automatic_v1 from anon, authenticated;
grant select on public.production_metallurgy_automatic_v1 to service_role;