-- Reproducible baseline for interpretation evidence views.
-- Production may already contain richer versions created during canonical reconciliation work.
-- In that case these definitions are intentionally not replaced.

do $$
begin
  if to_regclass('public.production_geology_point_observations_v1') is null then
    execute $view$
      create view public.production_geology_point_observations_v1
      with (security_invoker = true)
      as
      with base as (
        select r.organization_id,
          r.id as source_report_id,
          r.canonical_drill_hole_id as drill_hole_id,
          h.hole_code,
          r.operation_date,
          r.source_file,
          r.source_sheet,
          r.source_row,
          concat_ws(' ', r.drilling_observations, r.machine_observations) as evidence_text
        from public.production_drilling_source_reports r
        join public.production_drill_holes h on h.id=r.canonical_drill_hole_id
        where r.canonical_drill_hole_id is not null
      ), parsed as (
        select b.*,
          replace(substring(b.evidence_text from '(?i)(?:en|al|a los)\s+(?:el\s+)?metro(?:s)?\s+([0-9]+(?:[\.,][0-9]+)?)'),',','.')::numeric as at_depth_m
        from base b
        where b.evidence_text ~* '(?:en|al|a los)\s+(?:el\s+)?metro(?:s)?\s+[0-9]+(?:[\.,][0-9]+)?'
      )
      select organization_id, source_report_id, drill_hole_id, hole_code, operation_date, source_file, source_sheet, source_row,
        at_depth_m,
        case when evidence_text ~* '(falla|grieta)' then 'structure' else 'mineralization' end as observation_type,
        case when evidence_text ~* 'calcopirita' then 'calcopirita observada'
             when evidence_text ~* 'falla' then 'falla observada'
             when evidence_text ~* 'grieta' then 'grieta observada'
             else 'mineralizacion visual observada' end as observation,
        case when evidence_text ~* '(aprox|más menos|mas menos|\+\-)' then 'approximate_depth_point' else 'explicit_depth_point' end as confidence,
        evidence_text
      from parsed
      where at_depth_m is not null
        and evidence_text ~* '(calcopirita|mineral|mineralizada|mineralizacion|mineralización|falla|grieta)'
        and evidence_text !~* '(no se aprecia mineral|sin mineral|sin presencia de mineral|no mineralizada|no mineralizado|sin rastro de mineral)'
        and evidence_text !~* '(?:desde|entre|del|de los|en el|metro)\s*[0-9]+(?:[\.,][0-9]+)?\s*(?:m|mts|metros)?\s*(?:a|al|hasta|y)\s*(?:el\s+)?(?:metro\s*)?[0-9]+(?:[\.,][0-9]+)?';
    $view$;
  end if;

  if to_regclass('public.production_geology_transition_candidates_v1') is null then
    execute $view$
      create view public.production_geology_transition_candidates_v1
      with (security_invoker = true)
      as
      with base as (
        select r.organization_id,
          r.id as source_report_id,
          r.canonical_drill_hole_id as drill_hole_id,
          h.hole_code,
          r.operation_date,
          r.source_file,
          r.source_sheet,
          r.source_row,
          concat_ws(' ', r.drilling_observations, r.machine_observations) as evidence_text,
          regexp_match(lower(concat_ws(' ', r.drilling_observations, r.machine_observations)),
            '(?:desde|del|alrededor de|aprox(?:imadamente)? desde|\+\- desde|más menos desde|mas menos desde)[^0-9]{0,20}(?:el )?(?:metro|metraje)?[^0-9]{0,8}([0-9]+(?:[\.,][0-9]+)?)[^a-záéíóúñ]{0,20}(roca )?(caliza|andesita|fracturada|compacta|semicompacta|semi compacta|mineralizada)') as m
        from public.production_drilling_source_reports r
        join public.production_drill_holes h on h.id=r.canonical_drill_hole_id
        where r.canonical_drill_hole_id is not null
      )
      select organization_id, source_report_id, drill_hole_id, hole_code, operation_date, source_file, source_sheet, source_row,
        replace(m[1],',','.')::numeric as at_depth_m,
        nullif(trim(m[3]),'') as observed_transition,
        'explicit_depth_transition'::text as confidence,
        evidence_text
      from base
      where m is not null and replace(m[1],',','.')::numeric >= 0;
    $view$;
  end if;

  if to_regclass('public.production_geology_contiguous_units_v1') is null then
    execute $view$
      create view public.production_geology_contiguous_units_v1
      with (security_invoker = true)
      as
      with base as (
        select r.organization_id,
          r.id as source_report_id,
          r.canonical_drill_hole_id as drill_hole_id,
          h.hole_code,
          r.operation_date,
          r.source_row,
          r.meter_initial as from_m,
          r.meter_final as to_m,
          lower(regexp_replace(coalesce(r.drilling_observations,''),'\s+',' ','g')) as txt
        from public.production_drilling_source_reports r
        join public.production_drill_holes h on h.id=r.canonical_drill_hole_id
        where r.canonical_drill_hole_id is not null
          and r.meter_initial is not null and r.meter_final is not null and r.meter_final > r.meter_initial
          and coalesce(r.drilled_meters,0) >= 0
      ), classified as (
        select b.*,
          case when txt ~ '(no se (aprecia|ve|observa)|sin (presencia de )?(mineral|mineralizacion|mineralización)|no mineralizad|sin rastro de mineral)' then 'explicit_absence'
               when txt ~ '(se aprecia mineral|se ve mineral|se observa mineral|presencia de mineral|indicios de mineral|mineralizad|mineralización|mineralizacion|calcopirita|bornita|pirita)' then 'visual_presence'
               else null end as mineralization_state,
          case when txt ~ 'caliza' and txt ~ 'andesita' then 'mixed_caliza_andesita'
               when txt ~ 'caliza' then 'caliza'
               when txt ~ 'andesita' then 'andesita'
               else null end as lithology_observed,
          array_remove(array[
            case when txt ~ 'fracturad' then 'fracturada' end,
            case when txt ~ 'compact' then 'compacta' end,
            case when txt ~ '(dura|duro)' then 'dura' end,
            case when txt ~ '(blanda|blando)' then 'blanda' end,
            case when txt ~ 'abrasiv' then 'abrasiva' end
          ],null) as rock_conditions,
          array_remove(array[
            case when txt ~ 'falla' then 'falla' end,
            case when txt ~ 'grieta' then 'grieta' end,
            case when txt ~ 'derrumbe' then 'derrumbe' end,
            case when txt ~ '(vacío|vacio)' then 'vacio' end,
            case when txt ~ '(pérdida de retorno|perdida de retorno|pierde retorno|sin retorno)' then 'perdida_retorno' end
          ],null) as structural_features,
          txt ~ '(desde|hasta|entre|primer|últim|ultim|metro [0-9]|metros [0-9]|metraje [0-9]|del metro|al metro|a los [0-9])' as has_internal_depth_language
        from base b
      ), typed as (
        select c.*,
          case when has_internal_depth_language then null
               when mineralization_state='visual_presence' then 'operational_visual_span'
               when mineralization_state='explicit_absence' then 'operational_negative_span'
               when lithology_observed is not null then 'operational_lithology_span'
               when cardinality(structural_features)>0 then 'operational_structure_span'
               when cardinality(rock_conditions)>0 then 'operational_rock_condition_span'
               else null end as evidence_class
        from classified c
      )
      select organization_id, drill_hole_id, hole_code, from_m, to_m, (to_m-from_m) as length_m,
        evidence_class, lithology_observed, mineralization_state, rock_conditions, structural_features,
        1::bigint as source_report_count, operation_date as first_observed_at, operation_date as last_observed_at,
        array[source_report_id]::uuid[] as source_report_ids, array[source_row]::integer[] as source_rows,
        txt as evidence_text, 'baseline_operational_unit'::text as confidence,
        'Baseline derived from one source report span; not a formal geological log and not merged across reports.'::text as interpretation_guardrail
      from typed where evidence_class is not null;
    $view$;
  end if;
end $$;

revoke all on public.production_geology_point_observations_v1 from anon;
revoke all on public.production_geology_transition_candidates_v1 from anon;
revoke all on public.production_geology_contiguous_units_v1 from anon;
grant select on public.production_geology_point_observations_v1 to authenticated, service_role;
grant select on public.production_geology_transition_candidates_v1 to authenticated, service_role;
grant select on public.production_geology_contiguous_units_v1 to authenticated, service_role;
