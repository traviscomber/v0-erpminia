create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  canonical_product_id uuid not null references canonical.products(id) on delete cascade,
  storage_bucket text not null default 'product-media',
  storage_path text not null,
  source_type text not null default 'ai_generated' check (source_type = 'ai_generated'),
  generation_model text not null,
  generation_prompt text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  generated_by uuid not null references auth.users(id),
  generated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, storage_path)
);

create index if not exists product_media_product_status_idx
  on public.product_media (organization_id, canonical_product_id, status, created_at desc);

create unique index if not exists product_media_one_approved_per_product_idx
  on public.product_media (organization_id, canonical_product_id)
  where status = 'approved';

alter table public.product_media enable row level security;
revoke all on table public.product_media from public, anon, authenticated;
grant select, insert, update, delete on table public.product_media to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.product_media is
  'Auditable AI-generated product media. Canonical product facts remain unchanged; only approved media is customer-visible.';
