alter table public.production_import_batches
  add column if not exists project_key text not null default 'motil',
  add column if not exists domain_key text not null default 'production';

update public.production_import_batches
set project_key = 'motil', domain_key = 'production'
where project_key is distinct from 'motil' or domain_key is distinct from 'production';

alter table public.production_import_batches
  drop constraint if exists production_import_batches_project_key_check,
  add constraint production_import_batches_project_key_check check (project_key = 'motil');

alter table public.production_import_batches
  drop constraint if exists production_import_batches_domain_key_check,
  add constraint production_import_batches_domain_key_check check (domain_key = 'production');

alter table public.production_import_batches
  drop constraint if exists production_import_batches_motil_source_allowlist_check;

alter table public.production_import_batches
  add constraint production_import_batches_motil_source_allowlist_check check (
    (source_file = 'TM - 2019.xlsx' and source_file_sha256 = '43ff4fbc3dc85d349641aa054932b410daff1fdab57cb39addf9dab9d11f0b32') or
    (source_file = 'TM - 2020.xlsx' and source_file_sha256 = '0c0f716c2d3aa1bd1c156cb3058a47f014b79a756352a228105eb2e30b476452') or
    (source_file = 'TM - 2021.xlsx' and source_file_sha256 = '8fc92e17d020b755b0db20667ffd41e161e74408127d7fb438ea0d409ea47139') or
    (source_file = 'TM - 2022.xlsx' and source_file_sha256 = '6c0312cf30e3e0252641eb2bc18a6ac571f8403459f82f4cebe45290249d0010') or
    (source_file = 'TM-2023.xlsx' and source_file_sha256 = 'a88c87e088a91160bbe78164c9324e6aa8f59cc8ca8a1e9d6f22c0ae757429c9') or
    (source_file = 'TM-2024 actualizado.xlsx' and source_file_sha256 = 'fd51c112e23a30ea4c614073f7ceaaf88d6e6de50337d02a6bca35772aaa7aa9') or
    (source_file = 'TM 2025 actualizado (31-12-2025).xlsx' and source_file_sha256 = '2129860d6ce77469289d95f76fded63f5dbf2212e0deaecc4ed243c5fc237ff4') or
    (source_file = 'TM 2026 actualizado (06-08-2026).xlsx' and source_file_sha256 = 'dbc1b28a68f0faa269fca43dfc127823ef3d1f4155274a152cad7a3c166f6b00') or
    (source_file = 'LEY.xlsx' and source_file_sha256 = '9235bc3b4b379bc131187cf2b255ce5584f64623c3b5d14c75630a9a2ddf8618') or
    (source_file = 'LEYES.xlsx' and source_file_sha256 = 'dc7d5a35a55bb117ae8bb4e512d3c2be99b87b3ea981ec0fc43ba2f764043a3f')
  );

create index if not exists production_import_batches_scope_idx
  on public.production_import_batches (organization_id, project_key, domain_key, source_type);

create or replace function public.enforce_motil_production_batch_source()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  b record;
  payload_sha text;
begin
  select source_file, source_file_sha256, project_key, domain_key
    into b
  from public.production_import_batches
  where id = new.import_batch_id;

  if not found then
    raise exception 'Unknown production import batch %', new.import_batch_id;
  end if;

  if b.project_key <> 'motil' or b.domain_key <> 'production' then
    raise exception 'Invalid production scope for batch %', new.import_batch_id;
  end if;

  if new.source_file is distinct from b.source_file then
    raise exception 'Source file mismatch for production batch %', new.import_batch_id;
  end if;

  if to_jsonb(new) ? 'source_payload' then
    payload_sha := nullif(to_jsonb(new)->'source_payload'->>'SHA256 ARCHIVO', '');
    if payload_sha is not null and payload_sha is distinct from b.source_file_sha256 then
      raise exception 'Source SHA mismatch for production batch %', new.import_batch_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_motil_source_guard_movements on public.production_material_movements;
create trigger trg_motil_source_guard_movements
before insert or update of import_batch_id, source_file, source_payload
on public.production_material_movements
for each row execute function public.enforce_motil_production_batch_source();

drop trigger if exists trg_motil_source_guard_shifts on public.production_plant_shifts;
create trigger trg_motil_source_guard_shifts
before insert or update of import_batch_id, source_file, source_payload
on public.production_plant_shifts
for each row execute function public.enforce_motil_production_batch_source();

drop trigger if exists trg_motil_source_guard_exceptions on public.production_import_exceptions;
create trigger trg_motil_source_guard_exceptions
before insert or update of import_batch_id, source_file, source_payload
on public.production_import_exceptions
for each row execute function public.enforce_motil_production_batch_source();