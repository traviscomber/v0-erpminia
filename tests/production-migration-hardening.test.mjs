import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/20260824001000_scope_production_quality_by_organization.sql',
  import.meta.url,
);

const backendViews = [
  'production_canonical_package_quality_v1',
  'production_chemistry_fidelity_quality_v1',
  'production_chemistry_lineage_quality_v1',
  'production_chemistry_lineage_v1',
  'production_chemistry_mine_intelligence_v1',
  'production_chemistry_sector_source_summary_v1',
  'production_chemistry_source_quality_v1',
  'production_concentrate_fidelity_quality_v1',
  'production_copper_plan_v1',
  'production_drill_hole_location_resolution_v1',
  'production_drill_hole_location_review_queue_v1',
  'production_drilling_reconciliation_v1',
  'production_drilling_source_fidelity_v1',
  'production_fine_copper_daily_v1',
  'production_fine_copper_v1',
  'production_fine_flow_daily_v1',
  'production_flow_daily_fidelity_v1',
  'production_flow_fidelity_quality_v1',
  'production_geology_context_quality_v1',
  'production_master_normalization_quality_v1',
  'production_mine_sector_resolution_v1',
  'production_normalization_exceptions_v1',
  'production_source_fidelity_exceptions_v1',
  'production_source_sheet_coverage_quality_v1',
  'production_transport_identity_quality_v1',
  'production_transport_identity_resolution_v1',
];

test('all production release views use security_invoker', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  for (const view of backendViews) {
    assert.match(
      sql,
      new RegExp(`alter view public\\.${view} set \\(security_invoker = true\\);`),
      `${view} must use security_invoker`,
    );
  }
});

test('source identity uniqueness includes organization ownership', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /unique \(organization_id, source_file_sha256, source_sheet\);/);
  assert.match(
    sql,
    /unique \(organization_id, source_file_sha256, source_sheet, source_row, record_type\);/,
  );
});
