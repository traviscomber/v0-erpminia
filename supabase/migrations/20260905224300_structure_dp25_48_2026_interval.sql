insert into public.production_drill_intervals (organization_id,drill_hole_id,from_m,to_m,mineralization,operational_result,notes)
select h.organization_id,h.id,85.5,100.5,'mineralización visual observada','operational_visual_mineralization_report_span','Canonical geology 2026 pass: BaseDatos row 3884, 2026-03-16. Report span 85.5-100.5 m; text states roca con mineralizacion. Source-grounded report-span observation; no assay/grade inference.'
from public.production_drill_holes h
where h.hole_code='DP25-48'
  and h.drilled_depth_m>=100.5
  and not exists (
    select 1 from public.production_drill_intervals i
    where i.drill_hole_id=h.id and i.from_m=85.5 and i.to_m=100.5
  );
