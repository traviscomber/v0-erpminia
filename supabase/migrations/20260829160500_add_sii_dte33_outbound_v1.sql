alter table public.sii_integrations
  add column if not exists signer_rut text,
  add column if not exists issuer_legal_name text,
  add column if not exists issuer_giro text,
  add column if not exists issuer_acteco text,
  add column if not exists issuer_address text,
  add column if not exists issuer_commune text,
  add column if not exists issuer_city text,
  add column if not exists resolution_date date,
  add column if not exists resolution_number integer,
  add column if not exists issuer_profile_updated_at timestamptz;

alter table public.sii_integrations
  drop constraint if exists sii_integrations_signer_rut_format,
  add constraint sii_integrations_signer_rut_format
    check (signer_rut is null or signer_rut ~ '^[0-9]{1,8}-[0-9K]$'),
  drop constraint if exists sii_integrations_issuer_acteco_format,
  add constraint sii_integrations_issuer_acteco_format
    check (issuer_acteco is null or issuer_acteco ~ '^[0-9]{1,6}$'),
  drop constraint if exists sii_integrations_resolution_number_nonnegative,
  add constraint sii_integrations_resolution_number_nonnegative
    check (resolution_number is null or resolution_number >= 0);

create table public.sii_outbound_dtes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  environment text not null check (environment in ('certification','production')),
  document_type integer not null default 33 check (document_type = 33),
  folio_reservation_id uuid not null references public.sii_folio_reservations(id) on delete restrict,
  caf_id uuid not null references public.sii_cafs(id) on delete restrict,
  folio bigint not null check (folio > 0),
  idempotency_key text not null check (length(idempotency_key) between 1 and 128),
  document_id text not null check (length(document_id) between 1 and 64),
  status text not null default 'signed' check (status in ('signed','submitted','upload_rejected','processing','accepted','rejected','error')),
  recipient_rut text not null,
  recipient_name text not null,
  issue_date date not null,
  net_amount bigint not null check (net_amount >= 0),
  tax_rate numeric(5,2) not null check (tax_rate >= 0),
  tax_amount bigint not null check (tax_amount >= 0),
  total_amount bigint not null check (total_amount >= 0),
  payload jsonb not null,
  dte_xml text not null,
  envelope_xml text not null,
  track_id text,
  upload_status text,
  upload_response text,
  submission_attempts integer not null default 0 check (submission_attempts >= 0),
  dte_status text,
  dte_status_glosa text,
  last_status_response text,
  submitted_at timestamptz,
  last_status_checked_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sii_outbound_dtes_reservation_unique unique (folio_reservation_id),
  constraint sii_outbound_dtes_idempotency_unique unique (organization_id, environment, idempotency_key),
  constraint sii_outbound_dtes_folio_unique unique (organization_id, environment, document_type, folio)
);

create index sii_outbound_dtes_status_idx
  on public.sii_outbound_dtes (organization_id, environment, status, created_at desc);
create index sii_outbound_dtes_track_idx
  on public.sii_outbound_dtes (organization_id, track_id)
  where track_id is not null;

alter table public.sii_outbound_dtes enable row level security;
revoke all on public.sii_outbound_dtes from public, anon, authenticated;
revoke insert, update, delete on public.sii_outbound_dtes from service_role;
grant select on public.sii_outbound_dtes to service_role;

create or replace function public.save_sii_issuer_profile_v1(
  p_organization_id uuid,
  p_signer_rut text,
  p_legal_name text,
  p_giro text,
  p_acteco text,
  p_address text,
  p_commune text,
  p_city text,
  p_resolution_date date,
  p_resolution_number integer
) returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if p_organization_id is null
     or nullif(btrim(coalesce(p_signer_rut,'')),'') is null
     or btrim(p_signer_rut) !~ '^[0-9]{1,8}-[0-9K]$'
     or nullif(btrim(coalesce(p_legal_name,'')),'') is null or length(btrim(p_legal_name)) > 100
     or nullif(btrim(coalesce(p_giro,'')),'') is null or length(btrim(p_giro)) > 80
     or nullif(btrim(coalesce(p_acteco,'')),'') is null or btrim(p_acteco) !~ '^[0-9]{1,6}$'
     or nullif(btrim(coalesce(p_address,'')),'') is null or length(btrim(p_address)) > 60
     or nullif(btrim(coalesce(p_commune,'')),'') is null or length(btrim(p_commune)) > 20
     or (nullif(btrim(coalesce(p_city,'')),'') is not null and length(btrim(p_city)) > 20)
     or p_resolution_date is null
     or p_resolution_number is null or p_resolution_number < 0 then
    raise exception 'Perfil tributario SII inválido';
  end if;

  update public.sii_integrations
  set signer_rut = upper(btrim(p_signer_rut)),
      issuer_legal_name = btrim(p_legal_name),
      issuer_giro = btrim(p_giro),
      issuer_acteco = btrim(p_acteco),
      issuer_address = btrim(p_address),
      issuer_commune = btrim(p_commune),
      issuer_city = nullif(btrim(coalesce(p_city,'')),''),
      resolution_date = p_resolution_date,
      resolution_number = p_resolution_number,
      issuer_profile_updated_at = now(),
      updated_at = now()
  where organization_id = p_organization_id;

  if not found then
    raise exception 'Configuración SII no encontrada para la organización';
  end if;
end
$$;

create or replace function public.save_sii_signed_dte_v1(
  p_organization_id uuid,
  p_environment text,
  p_reservation_id uuid,
  p_caf_id uuid,
  p_folio bigint,
  p_idempotency_key text,
  p_document_id text,
  p_recipient_rut text,
  p_recipient_name text,
  p_issue_date date,
  p_net_amount bigint,
  p_tax_rate numeric,
  p_tax_amount bigint,
  p_total_amount bigint,
  p_payload jsonb,
  p_dte_xml text,
  p_envelope_xml text
) returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_existing_id uuid;
  v_reservation public.sii_folio_reservations%rowtype;
  v_id uuid;
begin
  if p_organization_id is null
     or p_environment not in ('certification','production')
     or p_reservation_id is null or p_caf_id is null
     or p_folio is null or p_folio <= 0
     or nullif(btrim(coalesce(p_idempotency_key,'')),'') is null or length(btrim(p_idempotency_key)) > 128
     or nullif(btrim(coalesce(p_document_id,'')),'') is null or length(btrim(p_document_id)) > 64
     or nullif(btrim(coalesce(p_recipient_rut,'')),'') is null
     or nullif(btrim(coalesce(p_recipient_name,'')),'') is null
     or p_issue_date is null
     or p_net_amount is null or p_net_amount < 0
     or p_tax_rate is null or p_tax_rate < 0
     or p_tax_amount is null or p_tax_amount < 0
     or p_total_amount is null or p_total_amount < 0
     or p_total_amount <> p_net_amount + p_tax_amount
     or p_payload is null
     or nullif(p_dte_xml,'') is null
     or nullif(p_envelope_xml,'') is null then
    raise exception 'DTE SII firmado inválido';
  end if;

  select d.id into v_existing_id
  from public.sii_outbound_dtes d
  where d.organization_id = p_organization_id
    and d.environment = p_environment
    and d.idempotency_key = btrim(p_idempotency_key);

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select r.* into v_reservation
  from public.sii_folio_reservations r
  where r.id = p_reservation_id
    and r.organization_id = p_organization_id
  for update;

  if not found then raise exception 'Reserva de folio SII no encontrada'; end if;
  if v_reservation.environment <> p_environment or v_reservation.document_type <> 33 then
    raise exception 'La reserva de folio no corresponde a Factura Electrónica';
  end if;
  if v_reservation.caf_id <> p_caf_id or v_reservation.folio <> p_folio then
    raise exception 'CAF o folio no coincide con la reserva SII';
  end if;
  if v_reservation.idempotency_key <> btrim(p_idempotency_key) then
    raise exception 'La llave de idempotencia no coincide con la reserva SII';
  end if;
  if v_reservation.status = 'voided' then
    raise exception 'El folio SII fue anulado y no puede emitirse';
  end if;
  if v_reservation.status = 'used' then
    raise exception 'El folio SII ya fue usado por otro DTE';
  end if;

  insert into public.sii_outbound_dtes(
    organization_id, environment, document_type, folio_reservation_id, caf_id, folio,
    idempotency_key, document_id, status, recipient_rut, recipient_name, issue_date,
    net_amount, tax_rate, tax_amount, total_amount, payload, dte_xml, envelope_xml,
    created_by, created_at, updated_at
  ) values (
    p_organization_id, p_environment, 33, p_reservation_id, p_caf_id, p_folio,
    btrim(p_idempotency_key), btrim(p_document_id), 'signed', btrim(p_recipient_rut), btrim(p_recipient_name), p_issue_date,
    p_net_amount, p_tax_rate, p_tax_amount, p_total_amount, p_payload, p_dte_xml, p_envelope_xml,
    public.current_application_user_id(), now(), now()
  ) returning id into v_id;

  update public.sii_folio_reservations
  set status = 'used',
      reference = 'sii_dte:' || v_id::text,
      used_at = now()
  where id = p_reservation_id;

  return v_id;
end
$$;

create or replace function public.record_sii_dte_submission_v1(
  p_organization_id uuid,
  p_dte_id uuid,
  p_upload_status text,
  p_track_id text,
  p_response text
) returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.sii_outbound_dtes
  where id = p_dte_id and organization_id = p_organization_id
  for update;

  if not found then raise exception 'DTE SII no encontrado'; end if;
  if v_status in ('accepted','rejected') then raise exception 'El DTE ya tiene estado final'; end if;
  if nullif(btrim(coalesce(p_upload_status,'')),'') is null then raise exception 'Estado de upload SII inválido'; end if;
  if btrim(p_upload_status) = '0' and nullif(btrim(coalesce(p_track_id,'')),'') is null then
    raise exception 'Upload SII exitoso sin TrackID';
  end if;

  update public.sii_outbound_dtes
  set status = case when btrim(p_upload_status) = '0' then 'submitted' else 'upload_rejected' end,
      upload_status = left(btrim(p_upload_status),40),
      track_id = case when btrim(p_upload_status) = '0' then left(btrim(p_track_id),80) else track_id end,
      upload_response = left(coalesce(p_response,''),10000),
      submission_attempts = submission_attempts + 1,
      submitted_at = case when btrim(p_upload_status) = '0' then coalesce(submitted_at,now()) else submitted_at end,
      updated_at = now()
  where id = p_dte_id;
end
$$;

create or replace function public.record_sii_dte_status_v1(
  p_organization_id uuid,
  p_dte_id uuid,
  p_state text,
  p_sii_status text,
  p_glosa text,
  p_response text
) returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$;
begin
  if p_state not in ('processing','accepted','rejected','error') then
    raise exception 'Estado normalizado SII inválido';
  end if;

  update public.sii_outbound_dtes
  set status = p_state,
      dte_status = nullif(left(btrim(coalesce(p_sii_status,'')),40),''),
      dte_status_glosa = nullif(left(btrim(coalesce(p_glosa,'')),500),''),
      last_status_response = left(coalesce(p_response,''),10000),
      last_status_checked_at = now(),
      accepted_at = case when p_state = 'accepted' then coalesce(accepted_at,now()) else accepted_at end,
      rejected_at = case when p_state = 'rejected' then coalesce(rejected_at,now()) else rejected_at end,
      updated_at = now()
  where id = p_dte_id and organization_id = p_organization_id;

  if not found then raise exception 'DTE SII no encontrado'; end if;
end
$$;

revoke all on function public.save_sii_issuer_profile_v1(uuid,text,text,text,text,text,text,text,date,integer) from public, anon, authenticated;
grant execute on function public.save_sii_issuer_profile_v1(uuid,text,text,text,text,text,text,text,date,integer) to service_role;

revoke all on function public.save_sii_signed_dte_v1(uuid,text,uuid,uuid,bigint,text,text,text,text,date,bigint,numeric,bigint,bigint,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.save_sii_signed_dte_v1(uuid,text,uuid,uuid,bigint,text,text,text,text,date,bigint,numeric,bigint,bigint,jsonb,text,text) to service_role;

revoke all on function public.record_sii_dte_submission_v1(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.record_sii_dte_submission_v1(uuid,uuid,text,text,text) to service_role;

revoke all on function public.record_sii_dte_status_v1(uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.record_sii_dte_status_v1(uuid,uuid,text,text,text,text) to service_role;
