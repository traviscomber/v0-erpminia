create or replace function public.reserve_sii_folio_v1(
  p_organization_id uuid,
  p_environment text,
  p_document_type integer,
  p_idempotency_key text
) returns table(
  reservation_id uuid,
  caf_id uuid,
  folio bigint,
  document_type integer,
  reservation_status text
)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_existing public.sii_folio_reservations%rowtype;
  v_caf public.sii_cafs%rowtype;
  v_folio bigint;
  v_idempotency_key text;
begin
  if p_organization_id is null
     or p_environment not in ('certification','production')
     or p_document_type is null or p_document_type <= 0 or p_document_type >= 1000
     or nullif(btrim(coalesce(p_idempotency_key,'')),'') is null
     or length(p_idempotency_key) > 128 then
    raise exception 'Solicitud de folio SII inválida';
  end if;

  v_idempotency_key := btrim(p_idempotency_key);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_organization_id::text || ':' || p_environment || ':folio:' || v_idempotency_key,
      0
    )
  );

  select r.* into v_existing
  from public.sii_folio_reservations r
  where r.organization_id = p_organization_id
    and r.environment = p_environment
    and r.idempotency_key = v_idempotency_key;

  if found then
    if v_existing.document_type <> p_document_type then
      raise exception 'La llave de idempotencia ya fue usada para otro tipo DTE';
    end if;
    return query select v_existing.id, v_existing.caf_id, v_existing.folio, v_existing.document_type, v_existing.status;
    return;
  end if;

  select c.* into v_caf
  from public.sii_cafs c
  where c.organization_id = p_organization_id
    and c.environment = p_environment
    and c.document_type = p_document_type
    and c.status = 'active'
    and c.next_folio <= c.range_end
  order by c.range_start, c.authorization_date, c.id
  limit 1
  for update;

  if not found then
    raise exception 'No hay folios SII disponibles para el tipo DTE solicitado';
  end if;

  v_folio := v_caf.next_folio;

  update public.sii_cafs c
  set next_folio = v_folio + 1,
      status = case when v_folio >= c.range_end then 'exhausted' else c.status end,
      exhausted_at = case when v_folio >= c.range_end then now() else c.exhausted_at end,
      updated_at = now()
  where c.id = v_caf.id;

  insert into public.sii_folio_reservations(
    organization_id, caf_id, environment, document_type, folio,
    idempotency_key, status, reserved_by, reserved_at
  ) values (
    p_organization_id, v_caf.id, p_environment, p_document_type, v_folio,
    v_idempotency_key, 'reserved', public.current_application_user_id(), now()
  ) returning * into v_existing;

  return query select v_existing.id, v_existing.caf_id, v_existing.folio, v_existing.document_type, v_existing.status;
end
$$;

revoke all on function public.reserve_sii_folio_v1(uuid,text,integer,text) from public, anon, authenticated;
grant execute on function public.reserve_sii_folio_v1(uuid,text,integer,text) to service_role;
