-- Clean transient canonical-import infrastructure after reconciliation work.
-- Canonical data tables are intentionally untouched.

-- Staging payloads and temporary credentials must not survive outside an active controlled import.
delete from public.production_canonical_transfer_chunks;
delete from public.production_internal_stage_auth;

-- Legacy transfer helpers are retained only for migration history / forensic traceability,
-- but cannot be executed through PostgREST by client roles.
revoke all on function public.invoke_motil_gzip_batch_v7(text, integer) from public, anon, authenticated;
revoke all on function public.invoke_motil_xz_smoke_v8() from public, anon, authenticated;
revoke all on function public.store_production_transfer_chunk(text, integer, text) from public, anon, authenticated;

comment on table public.production_canonical_transfer_chunks is
  'Private transient transport for canonical production payloads. Must remain empty outside an active controlled import.';

comment on table public.production_internal_stage_auth is
  'Temporary internal import authorization only. Must remain empty outside an active controlled import.';
