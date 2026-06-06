-- Reconciliacion productiva de Documents + Approvals
-- Corrige drift entre migrations legacy (public.users) y runtime actual

create extension if not exists pgcrypto;

create table if not exists public.users (
    id uuid primary key references auth.users(id),
    email varchar(255) not null unique,
    full_name varchar(255),
    role varchar(100) not null default 'operator',
    company_id uuid,
    site_id uuid,
    phone varchar(20),
    avatar_url varchar(500),
    status varchar(50) default 'active',
    created_at timestamp default now(),
    updated_at timestamp default now()
);

alter table public.users
    add column if not exists email varchar(255),
    add column if not exists full_name varchar(255),
    add column if not exists role varchar(100) default 'operator',
    add column if not exists status varchar(50) default 'active',
    add column if not exists created_at timestamp default now(),
    add column if not exists updated_at timestamp default now();

insert into public.users (id, email, full_name, role, status, created_at, updated_at)
select
    au.id,
    coalesce(p.email, au.email),
    coalesce(
        nullif(p.full_name, ''),
        nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
        split_part(au.email, '@', 1)
    ),
    coalesce(nullif(p.role, ''), 'operator'),
    coalesce(nullif(p.status, ''), 'active'),
    now(),
    now()
from auth.users au
left join public.profiles p on p.id = au.id
where coalesce(p.email, au.email) is not null
on conflict (id) do update
set
    email = excluded.email,
    full_name = coalesce(public.users.full_name, excluded.full_name),
    role = coalesce(public.users.role, excluded.role),
    status = coalesce(public.users.status, excluded.status),
    updated_at = now();

create table if not exists public.document_templates (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    category text not null,
    document_type text not null,
    schema jsonb default '{}'::jsonb,
    required_approvers integer default 2,
    expiry_days integer,
    sernageomin_requirement boolean default false,
    enabled boolean default true,
    created_by uuid references public.users(id) on delete set null,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    unique (organization_id, name)
);

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    template_id uuid references public.document_templates(id) on delete set null,
    document_number text,
    title text not null,
    description text,
    category text not null,
    document_type text not null,
    status text default 'draft',
    priority text default 'normal',
    version integer default 1,
    current_file_url text,
    current_file_path text,
    file_size_mb numeric,
    file_mime_type text,
    effective_date date,
    expiry_date date,
    days_until_expiry integer,
    expired boolean default false,
    sernageomin_requirement boolean default false,
    created_by uuid references public.users(id) on delete set null,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    submitted_at timestamp,
    submitted_by uuid references public.users(id) on delete set null,
    approved_at timestamp,
    approved_by uuid references public.users(id) on delete set null,
    rejected_at timestamp,
    rejection_reason text,
    search_text text
);

create table if not exists public.document_versions (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    version_number integer not null,
    file_url text not null,
    file_path text,
    file_size_mb numeric,
    file_mime_type text,
    change_notes text,
    created_by uuid references public.users(id) on delete set null,
    created_at timestamp default now(),
    unique (document_id, version_number)
);

create table if not exists public.document_approvals (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    approval_level integer not null default 1,
    approval_level_name text,
    required_role text,
    status text default 'pending',
    assigned_to uuid references public.users(id) on delete set null,
    assigned_to_name text,
    approved_by uuid references public.users(id) on delete set null,
    approved_by_name text,
    comments text,
    rejection_reason text,
    approved_at timestamp,
    submitted_for_review_at timestamp,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

create table if not exists public.document_expiry_alerts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    document_id uuid not null references public.documents(id) on delete cascade,
    alert_type text default 'expiry_approaching',
    days_until_expiry integer,
    alert_sent boolean default false,
    alert_sent_at timestamp,
    alert_recipients jsonb default '[]'::jsonb,
    created_at timestamp default now()
);

create table if not exists public.document_audit_logs (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    action text not null,
    user_id uuid references public.users(id) on delete set null,
    details text,
    created_at timestamp default now()
);

alter table public.document_templates
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
    add column if not exists name text,
    add column if not exists description text,
    add column if not exists category text,
    add column if not exists document_type text,
    add column if not exists schema jsonb default '{}'::jsonb,
    add column if not exists required_approvers integer default 2,
    add column if not exists expiry_days integer,
    add column if not exists sernageomin_requirement boolean default false,
    add column if not exists enabled boolean default true,
    add column if not exists created_by uuid references public.users(id) on delete set null,
    add column if not exists created_at timestamp default now(),
    add column if not exists updated_at timestamp default now();

alter table public.documents
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
    add column if not exists template_id uuid references public.document_templates(id) on delete set null,
    add column if not exists document_number text,
    add column if not exists title text,
    add column if not exists description text,
    add column if not exists category text,
    add column if not exists document_type text,
    add column if not exists status text default 'draft',
    add column if not exists priority text default 'normal',
    add column if not exists version integer default 1,
    add column if not exists current_file_url text,
    add column if not exists current_file_path text,
    add column if not exists file_size_mb numeric,
    add column if not exists file_mime_type text,
    add column if not exists effective_date date,
    add column if not exists expiry_date date,
    add column if not exists days_until_expiry integer,
    add column if not exists expired boolean default false,
    add column if not exists sernageomin_requirement boolean default false,
    add column if not exists created_by uuid references public.users(id) on delete set null,
    add column if not exists created_at timestamp default now(),
    add column if not exists updated_at timestamp default now(),
    add column if not exists submitted_at timestamp,
    add column if not exists submitted_by uuid references public.users(id) on delete set null,
    add column if not exists approved_at timestamp,
    add column if not exists approved_by uuid references public.users(id) on delete set null,
    add column if not exists rejected_at timestamp,
    add column if not exists rejection_reason text,
    add column if not exists search_text text;

alter table public.document_versions
    add column if not exists document_id uuid references public.documents(id) on delete cascade,
    add column if not exists version_number integer,
    add column if not exists file_url text,
    add column if not exists file_path text,
    add column if not exists file_size_mb numeric,
    add column if not exists file_mime_type text,
    add column if not exists change_notes text,
    add column if not exists created_by uuid references public.users(id) on delete set null,
    add column if not exists created_at timestamp default now();

alter table public.document_approvals
    add column if not exists document_id uuid references public.documents(id) on delete cascade,
    add column if not exists approval_level integer default 1,
    add column if not exists approval_level_name text,
    add column if not exists required_role text,
    add column if not exists status text default 'pending',
    add column if not exists assigned_to uuid references public.users(id) on delete set null,
    add column if not exists assigned_to_name text,
    add column if not exists approved_by uuid references public.users(id) on delete set null,
    add column if not exists approved_by_name text,
    add column if not exists comments text,
    add column if not exists rejection_reason text,
    add column if not exists approved_at timestamp,
    add column if not exists submitted_for_review_at timestamp,
    add column if not exists created_at timestamp default now(),
    add column if not exists updated_at timestamp default now();

alter table public.document_audit_logs
    add column if not exists document_id uuid references public.documents(id) on delete cascade,
    add column if not exists action text,
    add column if not exists user_id uuid references public.users(id) on delete set null,
    add column if not exists details text,
    add column if not exists created_at timestamp default now();

update public.documents
set
    status = coalesce(status, 'draft'),
    priority = coalesce(priority, 'normal'),
    version = coalesce(version, 1),
    expired = coalesce(expired, false),
    updated_at = coalesce(updated_at, now()),
    search_text = coalesce(search_text, trim(concat_ws(' ', title, description, category, document_number)))
where true;

update public.document_approvals
set
    status = coalesce(status, 'pending'),
    approval_level = coalesce(approval_level, 1),
    updated_at = coalesce(updated_at, now())
where true;

create index if not exists idx_documents_organization_id on public.documents(organization_id);
create index if not exists idx_documents_status on public.documents(status);
create index if not exists idx_documents_created_by on public.documents(created_by);
create index if not exists idx_documents_expiry_date on public.documents(expiry_date);
create index if not exists idx_documents_category on public.documents(category);
create index if not exists idx_document_approvals_document_id on public.document_approvals(document_id);
create index if not exists idx_document_approvals_assigned_to on public.document_approvals(assigned_to);
create index if not exists idx_document_approvals_status on public.document_approvals(status);
create index if not exists idx_document_audit_logs_document_id on public.document_audit_logs(document_id);
create index if not exists idx_document_audit_logs_user_id on public.document_audit_logs(user_id);
create index if not exists idx_document_templates_org on public.document_templates(organization_id);
create index if not exists idx_users_email on public.users(email);
