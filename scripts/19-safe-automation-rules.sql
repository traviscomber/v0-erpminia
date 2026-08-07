-- Block 19 - safe notification-only automation rules
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('maintenance','preventive','inventory','documents','finance')),
  severity text check (severity is null or severity in ('critical','warning','info')),
  enabled boolean not null default true,
  action_type text not null default 'notify' check (action_type = 'notify'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_rule_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  source_id uuid,
  category text not null,
  action_type text not null default 'notify' check (action_type = 'notify'),
  created_at timestamptz not null default now(),
  unique (rule_id, user_id, source_key)
);

alter table public.automation_rules enable row level security;
alter table public.automation_rule_runs enable row level security;

create policy automation_rules_org_read on public.automation_rules for select to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

create policy automation_rules_creator_write on public.automation_rules for all to authenticated
using (created_by = (select auth.uid()) and organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (created_by = (select auth.uid()) and organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

create policy automation_runs_own on public.automation_rule_runs for all to authenticated
using (user_id = (select auth.uid()) and organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (user_id = (select auth.uid()) and organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));
