alter table public.user_roles
  add column if not exists assigned_by uuid null references public.profiles(id) on delete set null;

create unique index if not exists user_roles_user_org_unique
  on public.user_roles (user_id, organization_id);

create index if not exists user_roles_assigned_by_idx
  on public.user_roles (assigned_by)
  where assigned_by is not null;
