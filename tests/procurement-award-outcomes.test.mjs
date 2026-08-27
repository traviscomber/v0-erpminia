import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827212500_procurement_award_outcome_intelligence_v1.sql', 'utf8');
const api = fs.readFileSync('app/api/procurement/award-outcomes/route.ts', 'utf8');
const panel = fs.readFileSync('components/procurement/award-outcome-learning.tsx', 'utf8');
const page = fs.readFileSync('app/dashboard/compras/flujo/page.tsx', 'utf8');

test('award outcomes keep decision factors and operational outcomes separate', () => {
  assert.match(migration, /is_lowest_price/i);
  assert.match(migration, /is_fastest_delivery/i);
  assert.match(migration, /delivered_on_time/i);
  assert.match(migration, /acceptance_rate_pct/i);
  assert.match(migration, /clean_invoice_rate_pct/i);
  assert.doesNotMatch(migration, /success_score|decision_score|weighted_score/i);
});

test('award outcome intelligence is backend only and tenant scoped', () => {
  assert.match(migration, /security_invoker\s*=\s*true/i);
  assert.match(migration, /revoke all on public\.procurement_award_outcomes_v1 from public,anon,authenticated/i);
  assert.match(api, /\.eq\('organization_id', context\.organizationId\)/);
});

test('award learning UI uses honest empty state and no hidden accuracy score', () => {
  assert.match(panel, /Aún no hay adjudicaciones operativas con resultado para analizar/i);
  assert.match(panel, /no convierte estos resultados en un score de “acierto”/i);
  assert.match(panel, /No fue el menor/i);
  assert.match(panel, /A tiempo/i);
});

test('procurement workflow surfaces outcome learning beside award evidence', () => {
  assert.match(page, /AwardEvidencePanel/);
  assert.match(page, /AwardOutcomeLearning/);
  assert.match(page, /ProgressiveProcurementWorkflow/);
});
