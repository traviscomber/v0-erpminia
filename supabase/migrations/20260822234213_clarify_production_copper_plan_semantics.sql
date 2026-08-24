create or replace view public.production_copper_plan_v1
with (security_invoker = true) as
select
  p.organization_id,
  p.id as plan_id,
  p.plan_code,
  p.period_start,
  p.period_end,
  p.status,
  p.total_mineral_to_plant_tons,
  p.target_cu_grade_pct,
  coalesce(
    sum(l.planned_fine_cu) filter (
      where l.line_type in ('preparation','chamber')
        and l.planned_fine_cu is not null
    ),
    case
      when p.total_mineral_to_plant_tons is not null
       and p.target_cu_grade_pct is not null
      then p.total_mineral_to_plant_tons * p.target_cu_grade_pct / 100.0
      else null
    end
  ) as planned_contained_cu_metric_tons,
  null::numeric as target_recovery_pct,
  null::numeric as planned_recovered_fine_cu_metric_tons,
  case
    when count(*) filter (
      where l.line_type in ('preparation','chamber')
        and l.planned_fine_cu is not null
    ) > 0 then 'source_document_contained_cu'
    when p.total_mineral_to_plant_tons is not null
     and p.target_cu_grade_pct is not null
      then 'derived_contained_cu_from_tons_grade'
    else 'incomplete'
  end as contained_cu_plan_state,
  'contained_cu_pre_recovery'::text as planned_fine_semantic,
  'PROGRAMA DE PRODUCCION AGOSTO 2026.pdf'::text as source_reference
from public.production_monthly_plans p
left join public.production_monthly_plan_lines l
  on l.organization_id = p.organization_id
 and l.plan_id = p.id
group by
  p.organization_id,
  p.id,
  p.plan_code,
  p.period_start,
  p.period_end,
  p.status,
  p.total_mineral_to_plant_tons,
  p.target_cu_grade_pct;

revoke all on public.production_copper_plan_v1 from anon, authenticated;
grant select on public.production_copper_plan_v1 to service_role;

comment on view public.production_copper_plan_v1 is
  'Plan mensual de cobre con semántica explícita: el campo fuente Ton Cu Fino Mina corresponde a Cu contenido pre-recuperación. No implica fino recuperado de planta sin recuperación objetivo documentada.';
