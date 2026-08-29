create table if not exists public.sii_integrations (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  environment text not null default 'certification' check (environment in ('certification','production')),
  company_rut text,
  certificate_secret_id uuid,
  certificate_subject text,
  certificate_serial_number text,
  certificate_fingerprint_sha256 text,
  certificate_valid_from timestamptz,
  certificate_valid_to timestamptz,
  certificate_uploaded_by uuid,
  certificate_uploaded_at timestamptz,
  last_auth_test_at timestamptz,
  last_auth_ok boolean,
  last_auth_error text,
  updated_at timestamptz not null default now()
);

alter table public.sii_integrations enable row level security;
revoke all on public.sii_integrations from public, anon, authenticated;
grant select, insert, update, delete on public.sii_integrations to service_role;

create or replace function public.save_sii_certificate_v1(
  p_organization_id uuid,
  p_company_rut text,
  p_secret_payload text,
  p_subject text,
  p_serial_number text,
  p_fingerprint_sha256 text,
  p_valid_from timestamptz,
  p_valid_to timestamptz
) returns void
language plpgsql
security definer
set search_path = 'public', 'vault', 'pg_temp'
as $$
declare
  v_existing public.sii_integrations%rowtype;
  v_secret_id uuid;
  v_actor uuid := public.current_application_user_id();
  v_name text := 'sii.certificate.' || p_organization_id::text;
begin
  if p_organization_id is null or p_secret_payload is null or length(p_secret_payload)=0 then
    raise exception 'Configuración SII inválida';
  end if;

  if not exists(select 1 from public.organizations o where o.id=p_organization_id) then
    raise exception 'Organización no encontrada';
  end if;

  select * into v_existing
  from public.sii_integrations
  where organization_id=p_organization_id
  for update;

  if found and v_existing.certificate_secret_id is not null then
    v_secret_id := v_existing.certificate_secret_id;
    perform vault.update_secret(
      v_secret_id,
      p_secret_payload,
      v_name,
      'Certificado digital SII de Motil para organización ' || p_organization_id::text,
      null
    );
  else
    select vault.create_secret(
      p_secret_payload,
      v_name,
      'Certificado digital SII de Motil para organización ' || p_organization_id::text,
      null
    ) into v_secret_id;
  end if;

  insert into public.sii_integrations(
    organization_id, environment, company_rut, certificate_secret_id,
    certificate_subject, certificate_serial_number, certificate_fingerprint_sha256,
    certificate_valid_from, certificate_valid_to,
    certificate_uploaded_by, certificate_uploaded_at,
    last_auth_test_at, last_auth_ok, last_auth_error, updated_at
  ) values (
    p_organization_id, 'certification', nullif(btrim(coalesce(p_company_rut,'')),''), v_secret_id,
    nullif(btrim(coalesce(p_subject,'')),''), nullif(btrim(coalesce(p_serial_number,'')),''), nullif(btrim(coalesce(p_fingerprint_sha256,'')),''),
    p_valid_from, p_valid_to,
    v_actor, now(),
    null, null, null, now()
  )
  on conflict (organization_id) do update set
    company_rut=excluded.company_rut,
    certificate_secret_id=excluded.certificate_secret_id,
    certificate_subject=excluded.certificate_subject,
    certificate_serial_number=excluded.certificate_serial_number,
    certificate_fingerprint_sha256=excluded.certificate_fingerprint_sha256,
    certificate_valid_from=excluded.certificate_valid_from,
    certificate_valid_to=excluded.certificate_valid_to,
    certificate_uploaded_by=excluded.certificate_uploaded_by,
    certificate_uploaded_at=excluded.certificate_uploaded_at,
    last_auth_test_at=null,
    last_auth_ok=null,
    last_auth_error=null,
    updated_at=now();
end
$$;

create or replace function public.get_sii_certificate_payload_v1(
  p_organization_id uuid
) returns text
language plpgsql
security definer
set search_path = 'public', 'vault', 'pg_temp'
as $$
declare
  v_secret_id uuid;
  v_payload text;
begin
  select certificate_secret_id into v_secret_id
  from public.sii_integrations
  where organization_id=p_organization_id;

  if v_secret_id is null then
    raise exception 'Certificado SII no configurado';
  end if;

  select decrypted_secret into v_payload
  from vault.decrypted_secrets
  where id=v_secret_id;

  if v_payload is null then
    raise exception 'Secreto de certificado SII no encontrado';
  end if;

  return v_payload;
end
$$;

create or replace function public.record_sii_auth_test_v1(
  p_organization_id uuid,
  p_ok boolean,
  p_error text default null
) returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  update public.sii_integrations
  set last_auth_test_at=now(),
      last_auth_ok=coalesce(p_ok,false),
      last_auth_error=case when coalesce(p_ok,false) then null else left(nullif(btrim(coalesce(p_error,'')),''),500) end,
      updated_at=now()
  where organization_id=p_organization_id;

  if not found then
    raise exception 'Configuración SII no encontrada';
  end if;
end
$$;

revoke all on function public.save_sii_certificate_v1(uuid,text,text,text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.save_sii_certificate_v1(uuid,text,text,text,text,text,timestamptz,timestamptz) to service_role;

revoke all on function public.get_sii_certificate_payload_v1(uuid) from public, anon, authenticated;
grant execute on function public.get_sii_certificate_payload_v1(uuid) to service_role;

revoke all on function public.record_sii_auth_test_v1(uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.record_sii_auth_test_v1(uuid,boolean,text) to service_role;
