-- MVP tables for Sustainability modules still using mock data

alter table if exists public.compliance_events
  add column if not exists location text,
  add column if not exists responsible_person_name text;

create table if not exists public.sostenibilidad_capacitaciones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nombre_capacitacion text not null,
  tipo text not null default 'ACHS',
  tema text not null,
  programa_hse text not null,
  proveedor_instructor text not null,
  fecha_programada date not null,
  hora_inicio time,
  hora_termino time,
  duracion_horas integer not null default 0,
  cantidad_asistentes integer not null default 0,
  faenas_cargos text[] not null default '{}',
  estado text not null default 'planificada',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.sostenibilidad_epp (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cargo_puesto text not null,
  elemento_epp text not null,
  cantidad_elemento integer not null default 1,
  marca_modelo text,
  frecuencia_reemplazo text not null default 'semestral',
  activo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.sostenibilidad_kpis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mes_ano date not null,
  tasa_accidentabilidad numeric(10,2) not null default 0,
  tasa_frecuencia numeric(10,2) not null default 0,
  tasa_gravedad numeric(10,2) not null default 0,
  dias_sin_accidentes integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique (organization_id, mes_ano)
);

create table if not exists public.sostenibilidad_medio_ambiente (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  numero_registro text not null,
  fecha date not null default current_date,
  tipo text not null,
  descripcion text not null,
  valor text not null,
  unidad text not null,
  cumplimiento text not null default 'conforme',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique (organization_id, numero_registro)
);

create table if not exists public.sostenibilidad_comunidades (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  numero_registro text not null,
  fecha date not null default current_date,
  tipo text not null,
  descripcion text not null,
  stakeholder text not null,
  estado text not null default 'pendiente',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique (organization_id, numero_registro)
);

create table if not exists public.sostenibilidad_documentos_flujo (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  documento_id text not null,
  documento_nombre text not null,
  descripcion text,
  archivo_url text,
  version integer not null default 1,
  estado text not null default 'pendiente_validador1',
  validador1_nombre text,
  validador1_accion text,
  validador2_nombre text,
  validador2_accion text,
  creador_nombre text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique (organization_id, documento_id)
);

create table if not exists public.inspecciones_internas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  numero_inspeccion text not null,
  fecha_planificada date not null,
  fecha_realizada date,
  faena text not null,
  inspector text not null,
  hallazgos_count integer not null default 0,
  estado text not null default 'planificada',
  reporte_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique (organization_id, numero_inspeccion)
);

create table if not exists public.inspecciones_externas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  numero_inspeccion text not null,
  fecha_planificada date not null,
  fecha_realizada date,
  faena text not null,
  inspector text not null,
  empresa_externa text not null,
  contacto_externo text not null,
  hallazgos_count integer not null default 0,
  estado text not null default 'planificada',
  reporte_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique (organization_id, numero_inspeccion)
);

alter table if exists public.sostenibilidad_corrective_actions
  add column if not exists responsible_person_name text;

alter table if exists public.sostenibilidad_capacitaciones
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table if exists public.sostenibilidad_epp
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table if exists public.sostenibilidad_kpis
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table if exists public.sostenibilidad_medio_ambiente
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table if exists public.sostenibilidad_comunidades
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table if exists public.sostenibilidad_documentos_flujo
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table if exists public.inspecciones_internas
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table if exists public.inspecciones_externas
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_sost_capacitaciones_org on public.sostenibilidad_capacitaciones(organization_id);
create index if not exists idx_sost_epp_org on public.sostenibilidad_epp(organization_id);
create index if not exists idx_sost_kpis_org on public.sostenibilidad_kpis(organization_id);
create index if not exists idx_sost_ma_org on public.sostenibilidad_medio_ambiente(organization_id);
create index if not exists idx_sost_comunidades_org on public.sostenibilidad_comunidades(organization_id);
create index if not exists idx_sost_doc_flujo_org on public.sostenibilidad_documentos_flujo(organization_id);
create index if not exists idx_inspecciones_internas_org on public.inspecciones_internas(organization_id);
create index if not exists idx_inspecciones_externas_org on public.inspecciones_externas(organization_id);
