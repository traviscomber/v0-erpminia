create table if not exists public.maintenance_standard_job_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  plan_code text not null,
  name text not null,
  work_type text not null,
  canonical_asset_id uuid,
  asset_type text,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','inactive')),
  estimated_duration_hours numeric,
  labor_people_required integer,
  skill_requirement text,
  safety_controls text,
  required_document_reference text,
  reason text not null,
  evidence_reference text,
  proposed_by uuid,
  proposed_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, plan_code)
);

create table if not exists public.maintenance_standard_job_plan_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  plan_id uuid not null references public.maintenance_standard_job_plans(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  title text not null,
  instructions text,
  control_requirement text,
  required_document_reference text,
  estimated_minutes numeric,
  created_at timestamptz not null default now(),
  unique (plan_id, sequence_no)
);

create table if not exists public.maintenance_standard_job_plan_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  plan_id uuid not null references public.maintenance_standard_job_plans(id) on delete cascade,
  canonical_product_id uuid not null,
  bom_line_id uuid references public.equipment_technical_bom_lines(id),
  quantity_required numeric not null check (quantity_required > 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (plan_id, canonical_product_id)
);

create table if not exists public.maintenance_standard_job_plan_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  plan_id uuid not null references public.maintenance_standard_job_plans(id) on delete cascade,
  work_order_id uuid references public.maintenance_work_orders(id) on delete cascade,
  preventive_schedule_id uuid references public.preventive_maintenance_schedules(id) on delete cascade,
  status text not null default 'active' check (status in ('active','inactive')),
  applied_by uuid,
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((work_order_id is not null and preventive_schedule_id is null) or (work_order_id is null and preventive_schedule_id is not null))
);

create unique index if not exists ux_standard_job_plan_application_wo_active
  on public.maintenance_standard_job_plan_applications (work_order_id)
  where work_order_id is not null and status='active';
create unique index if not exists ux_standard_job_plan_application_preventive_active
  on public.maintenance_standard_job_plan_applications (preventive_schedule_id)
  where preventive_schedule_id is not null and status='active';
create index if not exists idx_standard_job_plans_org_status on public.maintenance_standard_job_plans (organization_id, status, updated_at desc);
create index if not exists idx_standard_job_plan_materials_plan on public.maintenance_standard_job_plan_materials (plan_id);
create index if not exists idx_standard_job_plan_steps_plan on public.maintenance_standard_job_plan_steps (plan_id, sequence_no);

alter table public.maintenance_standard_job_plans enable row level security;
alter table public.maintenance_standard_job_plan_steps enable row level security;
alter table public.maintenance_standard_job_plan_materials enable row level security;
alter table public.maintenance_standard_job_plan_applications enable row level security;

revoke all on public.maintenance_standard_job_plans from anon, authenticated;
revoke all on public.maintenance_standard_job_plan_steps from anon, authenticated;
revoke all on public.maintenance_standard_job_plan_materials from anon, authenticated;
revoke all on public.maintenance_standard_job_plan_applications from anon, authenticated;
grant select, insert, update, delete on public.maintenance_standard_job_plans to service_role;
grant select, insert, update, delete on public.maintenance_standard_job_plan_steps to service_role;
grant select, insert, update, delete on public.maintenance_standard_job_plan_materials to service_role;
grant select, insert, update, delete on public.maintenance_standard_job_plan_applications to service_role;
