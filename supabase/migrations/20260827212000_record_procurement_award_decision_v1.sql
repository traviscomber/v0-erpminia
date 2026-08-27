create table if not exists public.procurement_award_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null,
  quotation_id uuid not null unique,
  purchase_order_id uuid not null unique,
  supplier_id uuid not null,
  primary_reason text not null check (primary_reason in ('price','lead_time','performance','urgency','commercial_terms','continuity','other')),
  decision_notes text,
  currency text,
  quoted_total numeric,
  lead_time_days integer,
  supplier_operational_score numeric,
  evidence_dimensions integer,
  delivery_score numeric,
  quality_score numeric,
  invoice_score numeric,
  comparable_currency_count integer not null default 0,
  candidate_count integer not null default 0,
  is_lowest_price boolean not null default false,
  is_fastest_delivery boolean not null default false,
  decided_by uuid,
  decided_at timestamptz not null default now()
);

create index if not exists idx_procurement_award_decisions_org_request on public.procurement_award_decisions(organization_id,request_id,decided_at desc);
create index if not exists idx_procurement_award_decisions_supplier on public.procurement_award_decisions(organization_id,supplier_id,decided_at desc);

alter table public.procurement_award_decisions enable row level security;
revoke all on public.procurement_award_decisions from public,anon,authenticated;
grant select,insert on public.procurement_award_decisions to service_role;

create or replace function public.enforce_procurement_award_decision_context_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public','canonical','pg_temp'
as $function$
begin
  if new.source_sheet='procurement_workflow'
     and coalesce(current_setting('motil.award_decision_authorized',true),'') <> '1' then
    raise exception 'Motivo de adjudicación requerido: use el flujo de decisión antes de emitir la OC';
  end if;
  return new;
end
$function$;

drop trigger if exists trg_enforce_procurement_award_decision_context_v1 on canonical.purchase_orders;
create trigger trg_enforce_procurement_award_decision_context_v1
before insert on canonical.purchase_orders
for each row execute function public.enforce_procurement_award_decision_context_v1();

create or replace function public.award_supplier_quotation_with_decision_v1(
  p_quotation_id uuid,
  p_primary_reason text,
  p_decision_notes text default null,
  p_actor_id uuid default public.current_application_user_id()
) returns uuid
language plpgsql
security definer
set search_path to 'public','canonical','staging','pg_temp'
as $function$
declare
  v_quote canonical.supplier_quotations%rowtype;
  v_po_id uuid;
  v_score record;
  v_candidate_count integer := 0;
  v_currency_count integer := 0;
  v_min_total numeric;
  v_min_lead integer;
begin
  if p_primary_reason not in ('price','lead_time','performance','urgency','commercial_terms','continuity','other') then raise exception 'Motivo de adjudicación inválido'; end if;
  if p_primary_reason='other' and nullif(btrim(coalesce(p_decision_notes,'')),'') is null then raise exception 'Explique el motivo cuando seleccione Otro'; end if;

  select * into v_quote from canonical.supplier_quotations where id=p_quotation_id for update;
  if not found then raise exception 'Cotización no encontrada'; end if;
  if p_actor_id is null or not exists(select 1 from public.user_roles ur where ur.user_id=p_actor_id and ur.organization_id=v_quote.organization_id) then raise exception 'Sin acceso a la organización de la cotización'; end if;
  if exists(select 1 from public.procurement_award_decisions where quotation_id=p_quotation_id) then raise exception 'La adjudicación ya tiene una decisión registrada'; end if;

  select count(*),count(distinct currency),min(total_amount),min(lead_time_days) filter(where lead_time_days is not null)
    into v_candidate_count,v_currency_count,v_min_total,v_min_lead
    from canonical.supplier_quotations
    where organization_id=v_quote.organization_id and request_id=v_quote.request_id and status in ('received','evaluated');

  select * into v_score from public.supplier_operational_score_v2 where organization_id=v_quote.organization_id and supplier_id=v_quote.supplier_id;

  perform set_config('motil.award_decision_authorized','1',true);
  v_po_id := public.award_supplier_quotation(p_quotation_id,p_actor_id);
  perform set_config('motil.award_decision_authorized','',true);

  insert into public.procurement_award_decisions(
    organization_id,request_id,quotation_id,purchase_order_id,supplier_id,
    primary_reason,decision_notes,currency,quoted_total,lead_time_days,
    supplier_operational_score,evidence_dimensions,delivery_score,quality_score,invoice_score,
    comparable_currency_count,candidate_count,is_lowest_price,is_fastest_delivery,decided_by
  ) values (
    v_quote.organization_id,v_quote.request_id,v_quote.id,v_po_id,v_quote.supplier_id,
    p_primary_reason,nullif(btrim(coalesce(p_decision_notes,'')),''),v_quote.currency,v_quote.total_amount,v_quote.lead_time_days,
    v_score.operational_score,v_score.evidence_dimensions,v_score.delivery_score,v_score.quality_score,v_score.invoice_score,
    v_currency_count,v_candidate_count,
    case when v_currency_count=1 then v_quote.total_amount=v_min_total else false end,
    case when v_quote.lead_time_days is not null and v_min_lead is not null then v_quote.lead_time_days=v_min_lead else false end,
    p_actor_id
  );

  insert into canonical.procurement_events(organization_id,request_id,quotation_id,purchase_order_id,event_type,summary,payload,actor_id)
  values(
    v_quote.organization_id,v_quote.request_id,v_quote.id,v_po_id,'award_decision_recorded','Motivo de adjudicación registrado',
    jsonb_build_object(
      'primary_reason',p_primary_reason,
      'decision_notes',nullif(btrim(coalesce(p_decision_notes,'')),''),
      'quoted_total',v_quote.total_amount,
      'currency',v_quote.currency,
      'lead_time_days',v_quote.lead_time_days,
      'supplier_operational_score',v_score.operational_score,
      'evidence_dimensions',v_score.evidence_dimensions,
      'candidate_count',v_candidate_count,
      'comparable_currency_count',v_currency_count,
      'is_lowest_price',case when v_currency_count=1 then v_quote.total_amount=v_min_total else false end,
      'is_fastest_delivery',case when v_quote.lead_time_days is not null and v_min_lead is not null then v_quote.lead_time_days=v_min_lead else false end
    ),
    p_actor_id
  );

  return v_po_id;
end
$function$;

revoke all on function public.award_supplier_quotation_with_decision_v1(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.award_supplier_quotation_with_decision_v1(uuid,text,text,uuid) to service_role;
