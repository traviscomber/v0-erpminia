create or replace function public.enforce_procurement_award_decision_context_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
begin
  if new.source_sheet = 'procurement_workflow'
     and coalesce(current_setting('motil.award_decision_authorized', true), '') <> '1' then
    raise exception 'Motivo de adjudicación requerido: use el flujo de decisión antes de emitir la OC';
  end if;

  if new.source_sheet = 'procurement_workflow' then
    if nullif(btrim(new.cost_center_code), '') is null then
      raise exception 'Imputación contable pendiente: asigne un centro de costo válido antes de adjudicar';
    end if;

    if not exists (
      select 1
      from public.cost_centers c
      where c.organization_id = new.organization_id
        and c.code = new.cost_center_code
        and coalesce(c.status, 'active') not in ('inactive', 'disabled', 'closed')
    ) then
      raise exception 'Imputación contable inválida: el centro de costo no está activo o no pertenece a la organización';
    end if;
  end if;

  return new;
end
$function$;

revoke execute on function public.enforce_procurement_award_decision_context_v1() from public, anon, authenticated;
grant execute on function public.enforce_procurement_award_decision_context_v1() to service_role;
