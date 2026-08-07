create table if not exists public.operational_audit_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  source_type text not null check (source_type in ('work_order','preventive','maintenance_document','automation_run')),
  source_id uuid not null,
  criterion text not null,
  finding text not null,
  severity text not null default 'observation' check (severity in ('observation','minor','major','critical')),
  responsible_person_id uuid,
  status text not null default 'open' check (status in ('open','resolved')),
  reviewed_by uuid not null,
  reviewed_at timestamptz not null default now(),
  resolution_note text,
  evidence_reference text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operational_audit_findings_org_status
  on public.operational_audit_findings (organization_id, status, reviewed_at desc);
create index if not exists idx_operational_audit_findings_source
  on public.operational_audit_findings (organization_id, source_type, source_id);
create index if not exists idx_operational_audit_findings_responsible
  on public.operational_audit_findings (organization_id, responsible_person_id, status) where responsible_person_id is not null;

alter table public.operational_audit_findings enable row level security;
revoke all on table public.operational_audit_findings from anon, authenticated;
grant select, insert, update, delete on table public.operational_audit_findings to service_role;
