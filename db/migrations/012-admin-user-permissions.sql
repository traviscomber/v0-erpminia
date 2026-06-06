create table if not exists public.permissions (
    id uuid primary key default gen_random_uuid(),
    resource text not null,
    action text not null,
    description text,
    status text default 'active',
    created_at timestamptz not null default now(),
    unique (resource, action)
);

insert into public.permissions (resource, action, description)
values
    ('produccion', 'view', 'View production module'),
    ('produccion', 'create', 'Create production records'),
    ('produccion', 'edit', 'Edit production records'),
    ('produccion', 'delete', 'Delete production records'),
    ('produccion', 'export', 'Export production data'),
    ('produccion', 'approve', 'Approve production workflows'),
    ('produccion', 'admin', 'Administer production module'),
    ('mantenimiento', 'view', 'View maintenance module'),
    ('mantenimiento', 'create', 'Create maintenance records'),
    ('mantenimiento', 'edit', 'Edit maintenance records'),
    ('mantenimiento', 'delete', 'Delete maintenance records'),
    ('mantenimiento', 'export', 'Export maintenance data'),
    ('mantenimiento', 'approve', 'Approve maintenance workflows'),
    ('mantenimiento', 'admin', 'Administer maintenance module'),
    ('bodega', 'view', 'View warehouse module'),
    ('bodega', 'create', 'Create warehouse records'),
    ('bodega', 'edit', 'Edit warehouse records'),
    ('bodega', 'delete', 'Delete warehouse records'),
    ('bodega', 'export', 'Export warehouse data'),
    ('bodega', 'approve', 'Approve warehouse workflows'),
    ('bodega', 'admin', 'Administer warehouse module'),
    ('hse', 'view', 'View HSE module'),
    ('hse', 'create', 'Create HSE records'),
    ('hse', 'edit', 'Edit HSE records'),
    ('hse', 'delete', 'Delete HSE records'),
    ('hse', 'export', 'Export HSE data'),
    ('hse', 'approve', 'Approve HSE workflows'),
    ('hse', 'admin', 'Administer HSE module'),
    ('documentos', 'view', 'View documents module'),
    ('documentos', 'create', 'Create documents'),
    ('documentos', 'edit', 'Edit documents'),
    ('documentos', 'delete', 'Delete documents'),
    ('documentos', 'export', 'Export documents'),
    ('documentos', 'approve', 'Approve documents'),
    ('documentos', 'admin', 'Administer documents module'),
    ('compras', 'view', 'View procurement module'),
    ('compras', 'create', 'Create procurement records'),
    ('compras', 'edit', 'Edit procurement records'),
    ('compras', 'delete', 'Delete procurement records'),
    ('compras', 'export', 'Export procurement data'),
    ('compras', 'approve', 'Approve procurement workflows'),
    ('compras', 'admin', 'Administer procurement module'),
    ('finanzas', 'view', 'View finance module'),
    ('finanzas', 'create', 'Create finance records'),
    ('finanzas', 'edit', 'Edit finance records'),
    ('finanzas', 'delete', 'Delete finance records'),
    ('finanzas', 'export', 'Export finance data'),
    ('finanzas', 'approve', 'Approve finance workflows'),
    ('finanzas', 'admin', 'Administer finance module'),
    ('reportes', 'view', 'View reports module'),
    ('reportes', 'create', 'Create reports'),
    ('reportes', 'edit', 'Edit reports'),
    ('reportes', 'delete', 'Delete reports'),
    ('reportes', 'export', 'Export reports'),
    ('reportes', 'approve', 'Approve reports'),
    ('reportes', 'admin', 'Administer reports module')
on conflict (resource, action) do nothing;

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
