create table public.sii_cafs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  environment text not null default 'certification' check (environment in ('certification','production')),
  company_rut text not null,
  document_type integer not null check (document_type > 0 and document_type < 1000),
  range_start bigint not null check (range_start > 0),
  range_end bigint not null check (range_end >= range_start),
  next_folio bigint not null,
  authorization_date date not null,
  caf_version text not null default '1.0',
  key_id integer,
  signature_algorithm text,
  fingerprint_sha256 text not null check (fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  secret_id uuid not null,
  status text not null default 'active' check (status in ('active','exhausted','disabled')),
  uploaded_by uuid,
  uploaded_at timestamptz not null default now(),
  exhausted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint sii_cafs_next_folio_bounds check (next_folio >= range_start and next_folio <= range_end + 1),
  constraint sii_cafs_fingerprint_unique unique (organization_id, environment, fingerprint_sha256)
);

create index sii_cafs_available_idx
  on public.sii_cafs (organization_id, environment, document_type, range_start)
  where status = 'active';

alter table public.sii_cafs enable row level security;
revoke all on public.sii_cafs from public, anon, authenticated;
revoke insert, update, delete on public.sii_cafs from service_role;
grant select on public.sii_cafs to service_role;

create table public.sii_folio_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  caf_id uuid not null references public.sii_cafs(id) on delete restrict,
  environment text not null check (environment in ('certification','production')),
  document_type integer not null check (document_type > 0 and document_type < 1000),
  folio bigint not null check (folio > 0),
  idempotency_key text not null check (length(idempotency_key) between 1 and 128),
  status text not null default 'reserved' check (status in ('reserved','used','voided')),
  reference text,
  void_reason text,
  reserved_by uuid,
  reserved_at timestamptz not null default now(),
  used_at timestamptz,
  voided_at timestamptz,
  constraint sii_folio_unique unique (organization_id, environment, document_type, folio),
  constraint sii_folio_idempotency_unique unique (organization_id, environment, idempotency_key)
);

create index sii_folio_reservations_caf_idx on public.sii_folio_reservations(caf_id, folio);

alter table public.sii_folio_reservations enable row level security;
revoke all on public.sii_folio_reservations from public, anon, authenticated;
revoke insert, update, delete on public.sii_folio_reservations from service_role;
grant select on public.sii_folio_reservations to service_role;

create or replace function public.save_sii_caf_v1(
  p_organization_id uuid,
  p_environment text,
  p_company_rut text,
  p_document_type integer,
  p_range_start bigint,
  p_range_end bigint,
  p_authorization_date date,
  p_caf_version text,
  p_key_id integer,
  p_signature_algorithm text,
  p_fingerprint_sha256 text,
  p_secret_payload text
) returns uuid
language plpgsql
security definer
set search_path = 'public', 'vault', 'pg_temp'
as $$
declare
  v_existing_id uuid;
  v_secret_id uuid;
  v_actor uuid := public.current_application_user_id();
  v_integration_rut text;
  v_name text;
begin
  if p_organization_id is null
     or p_environment not in ('certification','production')
     or nullif(btrim(coalesce(p_company_rut,'')),'') is null
     or p_document_type is null or p_document_type <= 0 or p_document_type >= 1000
     or p_range_start is null or p_range_start <= 0
     or p_range_end is null or p_range_end < p_range_start
     or p_authorization_date is null
     or nullif(btrim(coalesce(p_fingerprint_sha256,'')),'') is null
     or p_fingerprint_sha256 !~ '^[0-9a-f]{64}$'
     or nullif(p_secret_payload,'') is null then
    raise exception 'CAF SII inválido';
  end if;

  if not exists(select 1 from public.organizations o where o.id = p_organization_id) then
    raise exception 'Organización no encontrada';
  end if;

  select si.company_rut into v_integration_rut
  from public.sii_integrations si
  where si.organization_id = p_organization_id
    and si.environment = p_environment;

  if v_integration_rut is null then
    raise exception 'Configuración SII no encontrada para la organización';
  end if;
  if upper(replace(v_integration_rut,'.','')) <> upper(replace(p_company_rut,'.','')) then
    raise exception 'El RUT del CAF no corresponde a la configuración SII';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_organization_id::text || ':' || p_environment || ':' || p_document_type::text, 0)
  );

  select c.id into v_existing_id
  from public.sii_cafs c
  where c.organization_id = p_organization_id
    and c.environment = p_environment
    and c.fingerprint_sha256 = p_fingerprint_sha256;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  if exists(
    select 1
    from public.sii_cafs c
    where c.organization_id = p_organization_id
      and c.environment = p_environment
      and c.document_type = p_document_type
      and int8range(c.range_start, c.range_end, '[]') && int8range(p_range_start, p_range_end, '[]')
  ) then
    raise exception 'El rango de folios del CAF se superpone con un CAF ya registrado';
  end if;

  v_name := 'sii.caf.' || p_organization_id::text || '.' || p_environment || '.' || p_document_type::text || '.' || p_range_start::text || '-' || p_range_end::text;
  select vault.create_secret(
    p_secret_payload,
    v_name,
    'CAF SII cifrado para organización ' || p_organization_id::text || ', DTE ' || p_document_type::text,
    null
  ) into v_secret_id;

  insert into public.sii_cafs(
    organization_id, environment, company_rut, document_type,
    range_start, range_end, next_folio, authorization_date,
    caf_version, key_id, signature_algorithm, fingerprint_sha256,
    secret_id, status, uploaded_by, uploaded_at, updated_at
  ) values (
    p_organization_id, p_environment, p_company_rut, p_document_type,
    p_range_start, p_range_end, p_range_start, p_authorization_date,
    coalesce(nullif(btrim(p_caf_version),''),'1.0'), p_key_id, nullif(btrim(coalesce(p_signature_algorithm,'')),''), p_fingerprint_sha256,
    v_secret_id, 'active', v_actor, now(), now()
  ) returning id into v_existing_id;

  return v_existing_id;
end
$$;

create or replace function public.get_sii_caf_payload_v1(
  p_organization_id uuid,
  p_caf_id uuid
) returns text
language plpgsql
security definer
set search_path = 'public', 'vault', 'pg_temp'
as $$
declare
  v_secret_id uuid;
  v_payload text;
begin
  select c.secret_id into v_secret_id
  from public.sii_cafs c
  where c.id = p_caf_id and c.organization_id = p_organization_id;

  if v_secret_id is null then
    raise exception 'CAF SII no encontrado';
  end if;

  select ds.decrypted_secret into v_payload
  from vault.decrypted_secrets ds
  where ds.id = v_secret_id;

  if v_payload is null then
    raise exception 'Secreto CAF SII no disponible';
  end if;
  return v_payload;
end
$$;

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
begin
  if p_organization_id is null
     or p_environment not in ('certification','production')
     or p_document_type is null or p_document_type <= 0 or p_document_type >= 1000
     or nullif(btrim(coalesce(p_idempotency_key,'')),'') is null
     or length(p_idempotency_key) > 128 then
    raise exception 'Solicitud de folio SII inválida';
  end if;

  select r.* into v_existing
  from public.sii_folio_reservations r
  where r.organization_id = p_organization_id
    and r.environment = p_environment
    and r.idempotency_key = p_idempotency_key;

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
    btrim(p_idempotency_key), 'reserved', public.current_application_user_id(), now()
  ) returning * into v_existing;

  return query select v_existing.id, v_existing.caf_id, v_existing.folio, v_existing.document_type, v_existing.status;
end
$$;

create or replace function public.mark_sii_folio_used_v1(
  p_organization_id uuid,
  p_reservation_id uuid,
  p_reference text
) returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_row public.sii_folio_reservations%rowtype;
begin
  if p_organization_id is null or p_reservation_id is null or nullif(btrim(coalesce(p_reference,'')),'') is null then
    raise exception 'Confirmación de folio SII inválida';
  end if;

  select r.* into v_row
  from public.sii_folio_reservations r
  where r.id = p_reservation_id and r.organization_id = p_organization_id
  for update;

  if not found then raise exception 'Reserva de folio SII no encontrada'; end if;
  if v_row.status = 'voided' then raise exception 'El folio SII fue anulado y no puede marcarse como usado'; end if;
  if v_row.status = 'used' then
    if v_row.reference = btrim(p_reference) then return; end if;
    raise exception 'El folio SII ya está asociado a otra referencia';
  end if;

  update public.sii_folio_reservations
  set status = 'used', reference = left(btrim(p_reference),200), used_at = now()
  where id = p_reservation_id;
end
$$;

create or replace function public.void_sii_folio_reservation_v1(
  p_organization_id uuid,
  p_reservation_id uuid,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_status text;
begin
  if p_organization_id is null or p_reservation_id is null or nullif(btrim(coalesce(p_reason,'')),'') is null then
    raise exception 'Anulación de folio SII inválida';
  end if;

  select r.status into v_status
  from public.sii_folio_reservations r
  where r.id = p_reservation_id and r.organization_id = p_organization_id
  for update;

  if not found then raise exception 'Reserva de folio SII no encontrada'; end if;
  if v_status = 'used' then raise exception 'Un folio SII usado no puede anularse'; end if;
  if v_status = 'voided' then return; end if;

  update public.sii_folio_reservations
  set status = 'voided', void_reason = left(btrim(p_reason),500), voided_at = now()
  where id = p_reservation_id;
end
$$;

revoke all on function public.save_sii_caf_v1(uuid,text,text,integer,bigint,bigint,date,text,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.save_sii_caf_v1(uuid,text,text,integer,bigint,bigint,date,text,integer,text,text,text) to service_role;

revoke all on function public.get_sii_caf_payload_v1(uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_sii_caf_payload_v1(uuid,uuid) to service_role;

revoke all on function public.reserve_sii_folio_v1(uuid,text,integer,text) from public, anon, authenticated;
grant execute on function public.reserve_sii_folio_v1(uuid,text,integer,text) to service_role;

revoke all on function public.mark_sii_folio_used_v1(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.mark_sii_folio_used_v1(uuid,uuid,text) to service_role;

revoke all on function public.void_sii_folio_reservation_v1(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.void_sii_folio_reservation_v1(uuid,uuid,text) to service_role;
