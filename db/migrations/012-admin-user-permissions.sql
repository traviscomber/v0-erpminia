create table if not exists public.user_permissions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    role text not null default 'viewer',
    module text not null,
    action text not null,
    permission text not null,
    permission_id uuid references public.permissions(id) on delete set null,
    is_active boolean not null default true,
    expires_at timestamptz,
    granted_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, organization_id, module, action)
);

create index if not exists idx_user_permissions_org_user
on public.user_permissions (organization_id, user_id);

create index if not exists idx_user_permissions_module_action
on public.user_permissions (module, action);
