-- Block 18 - personal state over canonical executive decisions
create table if not exists public.user_action_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  status text not null default 'pending' check (status in ('pending','read','snoozed')),
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, source_key)
);

alter table public.user_action_states enable row level security;
drop policy if exists user_action_states_own on public.user_action_states;
create policy user_action_states_own on public.user_action_states
for all to authenticated
using (user_id = (select auth.uid()) and organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (user_id = (select auth.uid()) and organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

create index if not exists user_action_states_user_org_idx on public.user_action_states(user_id, organization_id, updated_at desc);
