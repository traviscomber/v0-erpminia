create or replace function public.resolve_drill_hole_location_manual_review(
  p_organization_id uuid,
  p_drill_hole_id uuid,
  p_mine_sector_id uuid,
  p_reviewed_by uuid,
  p_notes text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_mine_source_id uuid;
  v_evidence_id uuid;
  v_hole_code text;
begin
  select s.mine_source_id into v_mine_source_id
  from public.production_mine_sectors s
  where s.id = p_mine_sector_id
    and s.organization_id = p_organization_id
    and s.status = 'active';

  if v_mine_source_id is null then
    raise exception 'Sector no valido para la organizacion';
  end if;

  select h.hole_code into v_hole_code
  from public.production_drill_holes h
  where h.id = p_drill_hole_id
    and h.organization_id = p_organization_id
  for update;

  if v_hole_code is null then
    raise exception 'Pozo no encontrado';
  end if;

  insert into public.production_drill_hole_location_evidence (
    organization_id, drill_hole_id, mine_source_id, mine_sector_id,
    evidence_type, source_reference, evidence_date, confidence, status,
    evidence_payload, evidence_hash, notes, reviewed_by, reviewed_at
  ) values (
    p_organization_id, p_drill_hole_id, v_mine_source_id, p_mine_sector_id,
    'manual_review', 'Motil Sondaje · revision humana de ubicacion', current_date,
    'high', 'verified',
    jsonb_build_object('hole_code', v_hole_code, 'review_method', 'manual_sector_confirmation'),
    md5(concat_ws('|', p_organization_id::text, p_drill_hole_id::text, p_mine_sector_id::text, coalesce(p_notes,''))),
    nullif(trim(coalesce(p_notes,'')), ''), p_reviewed_by, now()
  )
  on conflict (organization_id, drill_hole_id, evidence_type, evidence_hash)
  do update set status='verified', confidence='high', reviewed_by=excluded.reviewed_by,
    reviewed_at=excluded.reviewed_at, notes=excluded.notes, updated_at=now()
  returning id into v_evidence_id;

  update public.production_drill_holes
  set mine_source_id=v_mine_source_id,
      mine_sector_id=p_mine_sector_id,
      notes=concat_ws(' | ', nullif(notes,''), 'Ubicacion confirmada por revision humana en Motil.'),
      updated_at=now()
  where id=p_drill_hole_id and organization_id=p_organization_id;

  update public.production_drilling_source_reports
  set canonical_mine_source_id=v_mine_source_id,
      canonical_mine_sector_id=p_mine_sector_id,
      reconciliation_status='matched',
      reconciliation_notes=concat_ws(' | ', nullif(reconciliation_notes,''), 'Ubicacion sincronizada desde revision humana del pozo canónico.')
  where organization_id=p_organization_id
    and canonical_drill_hole_id=p_drill_hole_id;

  return v_evidence_id;
end;
$$;

update public.production_drilling_source_reports r
set canonical_mine_source_id=h.mine_source_id,
    canonical_mine_sector_id=h.mine_sector_id,
    reconciliation_status='matched',
    reconciliation_notes=concat_ws(' | ', nullif(r.reconciliation_notes,''), 'Ubicacion sincronizada desde pozo canónico para capa de inteligencia.')
from public.production_drill_holes h
where h.id=r.canonical_drill_hole_id
  and h.organization_id=r.organization_id
  and h.mine_source_id is not null
  and h.mine_sector_id is not null
  and (r.canonical_mine_source_id is distinct from h.mine_source_id
       or r.canonical_mine_sector_id is distinct from h.mine_sector_id);
