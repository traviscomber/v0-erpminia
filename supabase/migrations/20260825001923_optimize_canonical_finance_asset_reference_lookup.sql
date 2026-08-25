create index if not exists canonical_assets_org_name_idx
  on canonical.assets (organization_id, name);
