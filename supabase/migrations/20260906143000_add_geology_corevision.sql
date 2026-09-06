-- MOTIL CoreVision: auditable visual geology evidence and human validation.
-- Visual AI outputs are evidence/interpretation aids only; they never become canonical geology automatically.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'geology-core-images',
  'geology-core-images',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.production_geology_core_images (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  drill_hole_id uuid references public.production_drill_holes(id) on delete set null,
  hole_code text,
  from_m numeric,
  to_m numeric,
  storage_path text not null,
  original_filename text,
  mime_type text not null,
  byte_size bigint,
  captured_at timestamptz,
  captured_by uuid,
  device_label text,
  illumination_profile text,
  scale_present boolean not null default false,
  depth_label_visible boolean not null default false,
  focus_confirmed boolean not null default false,
  uniform_light_confirmed boolean not null default false,
  status text not null default 'captured' check (status in ('captured','analyzed','in_review','validated','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_m is null or from_m >= 0),
  check (to_m is null or to_m >= 0),
  check (from_m is null or to_m is null or to_m >= from_m)
);

create unique index if not exists production_geology_core_images_storage_path_uidx
  on public.production_geology_core_images(storage_path);
create index if not exists production_geology_core_images_org_hole_idx
  on public.production_geology_core_images(organization_id, drill_hole_id, created_at desc);

create table if not exists public.production_geology_core_image_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  core_image_id uuid not null references public.production_geology_core_images(id) on delete cascade,
  model text not null,
  response_id text,
  analysis_version text not null default 'corevision_v1',
  visual_observations jsonb not null default '{}'::jsonb,
  analogs jsonb not null default '[]'::jsonb,
  evidence_for jsonb not null default '[]'::jsonb,
  evidence_against jsonb not null default '[]'::jsonb,
  missing_evidence jsonb not null default '[]'::jsonb,
  suggested_interpretation text,
  visual_similarity_score numeric,
  classification_confidence numeric,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (visual_similarity_score is null or (visual_similarity_score >= 0 and visual_similarity_score <= 1)),
  check (classification_confidence is null or (classification_confidence >= 0 and classification_confidence <= 1))
);

create index if not exists production_geology_core_image_analyses_org_image_idx
  on public.production_geology_core_image_analyses(organization_id, core_image_id, created_at desc);

create table if not exists public.production_geology_core_image_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  core_image_id uuid not null references public.production_geology_core_images(id) on delete cascade,
  analysis_id uuid references public.production_geology_core_image_analyses(id) on delete set null,
  decision text not null check (decision in ('validated','rejected','edited')),
  canonical_labels jsonb not null default '{}'::jsonb,
  geologist_comment text,
  reviewer_id uuid,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists production_geology_core_image_reviews_org_image_idx
  on public.production_geology_core_image_reviews(organization_id, core_image_id, reviewed_at desc);

alter table public.production_geology_core_images enable row level security;
alter table public.production_geology_core_image_analyses enable row level security;
alter table public.production_geology_core_image_reviews enable row level security;

revoke all on table public.production_geology_core_images from anon, authenticated;
revoke all on table public.production_geology_core_image_analyses from anon, authenticated;
revoke all on table public.production_geology_core_image_reviews from anon, authenticated;

grant all on table public.production_geology_core_images to service_role;
grant all on table public.production_geology_core_image_analyses to service_role;
grant all on table public.production_geology_core_image_reviews to service_role;

comment on table public.production_geology_core_images is 'Core photographs captured as visual evidence. Server-only; no AI output is canonical geology.';
comment on table public.production_geology_core_image_analyses is 'CoreVision visual observations and analog suggestions. Confidence fields describe model/visual confidence, never geological probability.';
comment on table public.production_geology_core_image_reviews is 'Human geologist validation of CoreVision output. Only validated or edited reviews may be used as labeled historical exemplars.';
