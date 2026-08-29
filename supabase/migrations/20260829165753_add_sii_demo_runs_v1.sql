create table if not exists public.sii_demo_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  scenario text not null check (scenario in ('accepted','rejected')),
  company_rut text not null default '76000000-0',
  receiver_rut text not null default '77000000-9',
  document_type integer not null default 33 check (document_type = 33),
  folio bigint not null,
  net_amount bigint not null check (net_amount >= 0),
  tax_amount bigint not null check (tax_amount >= 0),
  total_amount bigint not null check (total_amount = net_amount + tax_amount),
  track_id text not null,
  status text not null check (status in ('accepted','rejected')),
  status_code text not null,
  status_message text not null,
  payload_hash text not null,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint sii_demo_runs_org_folio_unique unique (organization_id, folio),
  constraint sii_demo_runs_org_track_unique unique (organization_id, track_id)
);

alter table public.sii_demo_runs enable row level security;
revoke all on public.sii_demo_runs from public, anon, authenticated;
revoke insert, update, delete on public.sii_demo_runs from service_role;
grant select on public.sii_demo_runs to service_role;

create or replace function public.create_sii_demo_run_v1(
  p_organization_id uuid,
  p_actor_id uuid,
  p_scenario text default 'accepted'
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_id uuid := gen_random_uuid();
  v_folio bigint;
  v_track text;
  v_status text;
  v_code text;
  v_message text;
  v_net bigint := 100000;
  v_tax bigint := 19000;
  v_total bigint := 119000;
  v_steps jsonb;
begin
  if p_scenario not in ('accepted','rejected') then
    raise exception 'SII_DEMO_SCENARIO_INVALID';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_actor_id
      and p.organization_id = p_organization_id
      and p.status = 'active'
  ) then
    raise exception 'SII_DEMO_ACTOR_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sii_demo:' || p_organization_id::text, 0));

  select greatest(coalesce(max(r.folio), 900000), 900000) + 1
  into v_folio
  from public.sii_demo_runs r
  where r.organization_id = p_organization_id;

  v_track := 'DEMO-' || upper(substr(replace(v_id::text, '-', ''), 1, 12));
  v_status := case when p_scenario = 'accepted' then 'accepted' else 'rejected' end;
  v_code := case when p_scenario = 'accepted' then 'DOK-DEMO' else 'RCH-DEMO' end;
  v_message := case when p_scenario = 'accepted'
    then 'Documento demo aceptado por simulador local. No fue enviado al SII.'
    else 'Documento demo rechazado por simulador local. No fue enviado al SII.' end;

  v_steps := jsonb_build_array(
    jsonb_build_object('key','certificate','label','Certificado demo','status','ok','simulated',true),
    jsonb_build_object('key','caf','label','CAF 33 demo','status','ok','simulated',true),
    jsonb_build_object('key','folio','label','Folio demo ' || v_folio::text,'status','ok','simulated',true),
    jsonb_build_object('key','dte33','label','Factura DTE 33 demo','status','ok','simulated',true),
    jsonb_build_object('key','ted','label','TED demo','status','ok','simulated',true),
    jsonb_build_object('key','signature','label','Firma demo','status','ok','simulated',true),
    jsonb_build_object('key','upload','label','Envío simulado','status','ok','simulated',true,'network',false),
    jsonb_build_object('key','track','label','TrackID ' || v_track,'status','ok','simulated',true),
    jsonb_build_object('key','result','label',v_message,'status',v_status,'simulated',true)
  );

  insert into public.sii_demo_runs (
    id, organization_id, created_by, scenario, folio,
    net_amount, tax_amount, total_amount, track_id,
    status, status_code, status_message, payload_hash, steps
  ) values (
    v_id, p_organization_id, p_actor_id, p_scenario, v_folio,
    v_net, v_tax, v_total, v_track,
    v_status, v_code, v_message,
    md5(concat_ws('|', v_id::text, p_organization_id::text, v_folio::text, v_total::text, p_scenario)),
    v_steps
  );

  return v_id;
end;
$$;

create or replace function public.clear_sii_demo_runs_v1(
  p_organization_id uuid,
  p_actor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_actor_id
      and p.organization_id = p_organization_id
      and p.status = 'active'
  ) then
    raise exception 'SII_DEMO_ACTOR_INVALID';
  end if;

  delete from public.sii_demo_runs
  where organization_id = p_organization_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.create_sii_demo_run_v1(uuid, uuid, text) from public;
revoke all on function public.create_sii_demo_run_v1(uuid, uuid, text) from anon, authenticated;
grant execute on function public.create_sii_demo_run_v1(uuid, uuid, text) to service_role;

revoke all on function public.clear_sii_demo_runs_v1(uuid, uuid) from public;
revoke all on function public.clear_sii_demo_runs_v1(uuid, uuid) from anon, authenticated;
grant execute on function public.clear_sii_demo_runs_v1(uuid, uuid) to service_role;
