do $do$
declare
  v_old_expr text;
begin
  select pg_get_expr(c.conbin, c.conrelid)
    into v_old_expr
  from pg_constraint c
  where c.conrelid = 'public.production_import_batches'::regclass
    and c.conname = 'production_import_batches_motil_source_allowlist_check';

  if v_old_expr is null then
    raise exception 'production_import_batches_motil_source_allowlist_check not found';
  end if;

  execute 'alter table public.production_import_batches drop constraint production_import_batches_motil_source_allowlist_check';
  execute format(
    $sql$
      alter table public.production_import_batches
      add constraint production_import_batches_motil_source_allowlist_check
      check (
        (
          source_type = 'manual'
          and source_file ~ '^manual://production/(mineral_transport|plant_metallurgy)/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          and source_file_sha256 ~ '^[0-9a-f]{64}$'
        )
        or (%s)
      )
    $sql$,
    v_old_expr
  );
end
$do$;

create or replace function public.create_production_manual_entry_v1(
  p_organization_id uuid,
  p_actor_id uuid,
  p_mode text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_date date;
  v_template_version text;
  v_token uuid := gen_random_uuid();
  v_source_file text;
  v_source_hash text;
  v_row_hash text;
  v_batch_id uuid;
  v_session_id uuid;
  v_rule public.production_normalization_rules%rowtype;
  v_raw_quantity numeric;
  v_material_classification text;
  v_movement_id uuid;
  v_normalized_metric_tons numeric;
  v_treated_wet numeric;
  v_mineral_moisture numeric;
  v_head_grade numeric;
  v_concentrate_moisture numeric;
  v_dispatch_moisture numeric;
  v_concentrate_wet numeric;
  v_dispatched numeric;
  v_shift_id uuid;
  v_metallurgy_id uuid;
  v_automatic jsonb;
begin
  if p_organization_id is null or p_actor_id is null then
    raise exception 'organization_id y actor_id son obligatorios';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_actor_id
      and p.organization_id = p_organization_id
      and p.status = 'active'
  ) then
    raise exception 'Actor inválido o fuera de la organización';
  end if;

  if p_mode not in ('mineral_transport', 'plant_metallurgy') then
    raise exception 'Modo de ingreso inválido';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Payload inválido';
  end if;

  if p_mode = 'mineral_transport' then
    v_date := nullif(trim(p_payload ->> 'movementDate'), '')::date;
    v_raw_quantity := nullif(trim(p_payload ->> 'netWeight'), '')::numeric;
    v_template_version := 'TM_2026_V1';

    if v_date is null or v_raw_quantity is null or v_raw_quantity <= 0 then
      raise exception 'Fecha y tonelaje/peso neto válido son obligatorios';
    end if;

    select r.*
      into v_rule
    from public.production_normalization_rules r
    where r.organization_id = p_organization_id
      and r.source_type = 'tm'
      and r.status = 'approved'
      and (r.effective_from is null or r.effective_from <= v_date)
      and (r.effective_to is null or r.effective_to >= v_date)
    order by r.effective_from desc nulls last, r.created_at desc
    limit 1;

    if not found then
      raise exception 'No existe regla TM aprobada para %', v_date;
    end if;
  else
    v_date := nullif(trim(p_payload ->> 'operationDate'), '')::date;
    v_treated_wet := nullif(trim(p_payload ->> 'treatedWetMetricTons'), '')::numeric;
    v_mineral_moisture := nullif(trim(p_payload ->> 'mineralMoisturePct'), '')::numeric;
    v_head_grade := nullif(trim(p_payload ->> 'headGrade'), '')::numeric;
    v_template_version := 'PLANT_METALLURGY_V2';

    if v_date is null
       or nullif(trim(p_payload ->> 'shiftCode'), '') is null
       or v_treated_wet is null or v_treated_wet < 0
       or v_mineral_moisture is null or v_mineral_moisture < 0 or v_mineral_moisture >= 100
       or v_head_grade is null then
      raise exception 'Fecha, turno, toneladas húmedas, humedad mineral y ley de cabeza válidas son obligatorias';
    end if;

    if p_payload ? 'concentrateMoisturePct' and p_payload ->> 'concentrateMoisturePct' is not null then
      v_concentrate_moisture := nullif(trim(p_payload ->> 'concentrateMoisturePct'), '')::numeric;
      if v_concentrate_moisture is null or v_concentrate_moisture < 0 or v_concentrate_moisture >= 100 then
        raise exception 'Humedad de concentrado debe estar entre 0 y 100';
      end if;
    end if;

    if p_payload ? 'dispatchMoisturePct' and p_payload ->> 'dispatchMoisturePct' is not null then
      v_dispatch_moisture := nullif(trim(p_payload ->> 'dispatchMoisturePct'), '')::numeric;
      if v_dispatch_moisture is null or v_dispatch_moisture < 0 or v_dispatch_moisture >= 100 then
        raise exception 'Humedad de despacho debe estar entre 0 y 100';
      end if;
    end if;

    if p_payload ? 'concentrateWetMetricTons' and p_payload ->> 'concentrateWetMetricTons' is not null then
      v_concentrate_wet := nullif(trim(p_payload ->> 'concentrateWetMetricTons'), '')::numeric;
    end if;
    if p_payload ? 'dispatchedMetricTons' and p_payload ->> 'dispatchedMetricTons' is not null then
      v_dispatched := nullif(trim(p_payload ->> 'dispatchedMetricTons'), '')::numeric;
    end if;
  end if;

  v_source_file := format('manual://production/%s/%s', p_mode, v_token::text);
  v_source_hash := encode(extensions.digest(convert_to(v_source_file || '|' || p_payload::text, 'UTF8'), 'sha256'), 'hex');
  v_row_hash := encode(extensions.digest(convert_to(v_source_file || '|row|1|' || v_template_version || '|' || p_payload::text, 'UTF8'), 'sha256'), 'hex');

  insert into public.production_import_batches (
    organization_id, source_type, source_file, source_file_sha256,
    period_start, period_end, status, normalization_rule_version, notes, created_by
  ) values (
    p_organization_id, 'manual', v_source_file, v_source_hash,
    v_date, v_date, 'approved_for_import', v_template_version,
    'Ingreso manual desde módulo Producción.', p_actor_id
  )
  returning id into v_batch_id;

  insert into public.production_data_entry_sessions (
    organization_id, entry_mode, entry_source, import_batch_id, template_version,
    status, validation_summary, created_by
  ) values (
    p_organization_id, p_mode, 'manual', v_batch_id, v_template_version,
    'validated', jsonb_build_object('source', 'manual', 'schema', v_template_version), p_actor_id
  )
  returning id into v_session_id;

  if p_mode = 'mineral_transport' then
    v_material_classification := case
      when lower(coalesce(p_payload ->> 'description', '')) like '%esteril%'
        or lower(coalesce(p_payload ->> 'description', '')) like '%estéril%' then 'sterile'
      when lower(coalesce(p_payload ->> 'description', '')) like '%ceniza%' then 'ash'
      when lower(coalesce(p_payload ->> 'description', '')) like '%mineral%' then 'process_mineral'
      when nullif(trim(p_payload ->> 'description'), '') is null then 'unclassified'
      else 'other'
    end;

    insert into public.production_material_movements (
      organization_id, import_batch_id, movement_number, movement_date,
      client_name_raw, movement_description_raw, driver_name_raw, carrier_name_raw,
      vehicle_plate_raw, sector_name_raw, mine_name_raw, interior_mine_raw,
      seal_number, debt_status_raw, material_classification,
      raw_quantity, raw_unit, normalized_metric_tons, normalization_status, normalization_rule,
      source_file, source_sheet, source_row, source_hash, source_schema_version, adapter_version,
      source_payload, validation_status, validation_notes
    ) values (
      p_organization_id, v_batch_id, nullif(trim(p_payload ->> 'movementNumber'), ''), v_date,
      nullif(trim(p_payload ->> 'client'), ''), nullif(trim(p_payload ->> 'description'), ''),
      nullif(trim(p_payload ->> 'driver'), ''), nullif(trim(p_payload ->> 'carrier'), ''),
      nullif(trim(p_payload ->> 'plate'), ''), nullif(trim(p_payload ->> 'sector'), ''),
      nullif(trim(p_payload ->> 'mineOrigin'), ''), nullif(trim(p_payload ->> 'interiorMine'), ''),
      nullif(trim(p_payload ->> 'sealNumber'), ''), nullif(trim(p_payload ->> 'debtStatus'), ''), v_material_classification,
      v_raw_quantity, v_rule.raw_unit, v_raw_quantity * v_rule.multiplier, 'approved', v_rule.rule_code || '@' || v_rule.rule_version,
      v_source_file, 'Manual', 1, v_row_hash, v_template_version, 'manual_v1',
      '{}'::jsonb, 'valid', 'Ingreso manual validado contra contrato TM_2026_V1.'
    )
    returning id, normalized_metric_tons
      into v_movement_id, v_normalized_metric_tons;

    update public.production_import_batches
      set status = 'imported', updated_at = now()
      where id = v_batch_id and organization_id = p_organization_id;
    update public.production_data_entry_sessions
      set status = 'committed', updated_at = now()
      where id = v_session_id and organization_id = p_organization_id;

    return jsonb_build_object(
      'sessionId', v_session_id,
      'movement', jsonb_build_object(
        'id', v_movement_id,
        'normalized_metric_tons', v_normalized_metric_tons,
        'raw_unit', v_rule.raw_unit,
        'normalization_rule', v_rule.rule_code || '@' || v_rule.rule_version
      )
    );
  end if;

  insert into public.production_plant_shifts (
    organization_id, import_batch_id, operation_date, shift_code,
    raw_treated_quantity, raw_treated_unit, treated_metric_tons, mineral_moisture_pct,
    normalization_status, normalization_rule, lot_number_raw, blend_code_raw,
    source_file, source_sheet, source_row, source_hash, source_payload,
    validation_status, validation_notes, source_schema_version, adapter_version
  ) values (
    p_organization_id, v_batch_id, v_date, trim(p_payload ->> 'shiftCode'),
    v_treated_wet, 't', v_treated_wet, v_mineral_moisture,
    'not_required', 'MANUAL_TON_V1', nullif(trim(p_payload ->> 'lotNumber'), ''), nullif(trim(p_payload ->> 'blendCode'), ''),
    v_source_file, 'Manual', 1, v_row_hash, '{}'::jsonb,
    'valid', 'Ingreso manual en base húmeda con humedad mineral explícita.', v_template_version, 'manual_v1'
  )
  returning id into v_shift_id;

  insert into public.production_metallurgy_results (
    organization_id, plant_shift_id, head_grade, concentrate_grade, tailings_grade, galigher_grade,
    concentrate_wet_metric_tons, concentrate_moisture_pct, dispatched_metric_tons, dispatch_moisture,
    dispatch_grade, analysis_status, calculation_rule_version,
    source_file, source_sheet, source_row, source_hash, source_payload,
    validation_status, validation_notes
  ) values (
    p_organization_id, v_shift_id, v_head_grade,
    nullif(trim(p_payload ->> 'concentrateGrade'), '')::numeric,
    nullif(trim(p_payload ->> 'tailingsGrade'), '')::numeric,
    nullif(trim(p_payload ->> 'galigherGrade'), '')::numeric,
    v_concentrate_wet, v_concentrate_moisture, v_dispatched, v_dispatch_moisture,
    nullif(trim(p_payload ->> 'dispatchGrade'), '')::numeric,
    'observed', 'v2',
    v_source_file, 'Manual', 1, v_row_hash, '{}'::jsonb,
    'valid', 'Cálculos automáticos se obtienen desde production_metallurgy_automatic_v1.'
  )
  returning id into v_metallurgy_id;

  select jsonb_build_object(
      'automatic_mineral_dry_tons', a.automatic_mineral_dry_tons,
      'automatic_feed_fine', a.automatic_feed_fine,
      'automatic_recovery_by_grades', a.automatic_recovery_by_grades,
      'automatic_concentrate_dry_tons', a.automatic_concentrate_dry_tons,
      'automatic_concentrate_fine', a.automatic_concentrate_fine,
      'automatic_recovery_by_fine_balance', a.automatic_recovery_by_fine_balance,
      'automatic_real_fine_dispatch', a.automatic_real_fine_dispatch
    )
    into v_automatic
  from public.production_metallurgy_automatic_v1 a
  where a.id = v_metallurgy_id;

  v_automatic := coalesce(v_automatic, '{}'::jsonb);

  update public.production_import_batches
    set status = 'imported', updated_at = now()
    where id = v_batch_id and organization_id = p_organization_id;
  update public.production_data_entry_sessions
    set status = 'committed',
        validation_summary = jsonb_build_object('source', 'manual', 'calculations', v_automatic),
        updated_at = now()
    where id = v_session_id and organization_id = p_organization_id;

  return jsonb_build_object(
    'sessionId', v_session_id,
    'shiftId', v_shift_id,
    'metallurgyId', v_metallurgy_id,
    'automatic', v_automatic
  );
end
$function$;

revoke all on function public.create_production_manual_entry_v1(uuid, uuid, text, jsonb) from public;
revoke all on function public.create_production_manual_entry_v1(uuid, uuid, text, jsonb) from anon;
revoke all on function public.create_production_manual_entry_v1(uuid, uuid, text, jsonb) from authenticated;
grant execute on function public.create_production_manual_entry_v1(uuid, uuid, text, jsonb) to service_role;
