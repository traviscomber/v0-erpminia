-- Direct FK indexes for the drill-hole location evidence table.
-- These complement the organization-scoped operational indexes and satisfy
-- FK lookup/delete/update access paths as evidence volume grows.

create index if not exists production_drill_hole_location_evidence_drill_hole_fk_idx
  on public.production_drill_hole_location_evidence (drill_hole_id);

create index if not exists production_drill_hole_location_evidence_mine_source_fk_idx
  on public.production_drill_hole_location_evidence (mine_source_id)
  where mine_source_id is not null;

create index if not exists production_drill_hole_location_evidence_mine_sector_fk_idx
  on public.production_drill_hole_location_evidence (mine_sector_id)
  where mine_sector_id is not null;

create index if not exists production_drill_hole_location_evidence_reviewed_by_fk_idx
  on public.production_drill_hole_location_evidence (reviewed_by)
  where reviewed_by is not null;
