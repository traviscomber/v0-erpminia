-- Deep specialists keep their own conversation and memory stores.
-- This trigger records only advisory Decision Case revalidation metadata after
-- a grounded assistant response has been persisted with source references.
-- It never changes operational sources, approvals, work orders, geology truth,
-- or any other canonical MOTIL state.

create or replace function public.record_deep_specialist_decision_case_revalidation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  latest_user_message text;
  target_domain_value text;
begin
  if new.role is distinct from 'assistant' then
    return new;
  end if;

  if new.source_refs is null
     or jsonb_typeof(new.source_refs) <> 'array'
     or jsonb_array_length(new.source_refs) = 0 then
    return new;
  end if;

  if tg_table_name = 'maintenance_ai_messages' then
    target_domain_value := 'maintenance';

    select m.content
      into latest_user_message
    from public.maintenance_ai_messages m
    where m.conversation_id = new.conversation_id
      and m.organization_id = new.organization_id
      and m.user_id = new.user_id
      and m.role = 'user'
      and m.created_at <= new.created_at
    order by m.created_at desc
    limit 1;
  elsif tg_table_name = 'geology_ai_messages' then
    target_domain_value := 'geology';

    select m.content
      into latest_user_message
    from public.geology_ai_messages m
    where m.conversation_id = new.conversation_id
      and m.organization_id = new.organization_id
      and m.user_id = new.user_id
      and m.role = 'user'
      and m.created_at <= new.created_at
    order by m.created_at desc
    limit 1;
  else
    return new;
  end if;

  -- Match the same review / prior-case intent boundary used by the shared
  -- Intelligence Core handoff loader. Ordinary specialist questions do not
  -- stamp Decision Cases as revalidated.
  if coalesce(latest_user_message, '') !~* '(decision[[:space:]]*case|caso|handoff|derivad|escalad|prioridad|pendiente|revis|revalid|anterior|eso|ese|esa|que requiere atencion|qué requiere atención)' then
    return new;
  end if;

  with target_cases as (
    select dc.id
    from public.motil_ai_decision_cases dc
    where dc.organization_id = new.organization_id
      and dc.created_by_user_id = new.user_id
      and dc.target_domain = target_domain_value
      and dc.status = 'open'
    order by dc.created_at desc
    limit 3
  )
  update public.motil_ai_decision_cases dc
     set last_revalidated_at = coalesce(new.created_at, now()),
         last_revalidated_by_user_id = new.user_id,
         last_revalidation_evidence_refs = new.source_refs,
         updated_at = now()
   where dc.id in (select id from target_cases);

  return new;
end;
$$;

revoke all on function public.record_deep_specialist_decision_case_revalidation() from public;
revoke all on function public.record_deep_specialist_decision_case_revalidation() from anon;
revoke all on function public.record_deep_specialist_decision_case_revalidation() from authenticated;

drop trigger if exists maintenance_ai_messages_record_decision_case_revalidation
  on public.maintenance_ai_messages;
create trigger maintenance_ai_messages_record_decision_case_revalidation
after insert on public.maintenance_ai_messages
for each row
execute function public.record_deep_specialist_decision_case_revalidation();

drop trigger if exists geology_ai_messages_record_decision_case_revalidation
  on public.geology_ai_messages;
create trigger geology_ai_messages_record_decision_case_revalidation
after insert on public.geology_ai_messages
for each row
execute function public.record_deep_specialist_decision_case_revalidation();

comment on function public.record_deep_specialist_decision_case_revalidation() is
  'Records non-canonical Decision Case revalidation metadata after grounded Maintenance or Geology assistant persistence. Never authorizes or mutates operational truth.';
