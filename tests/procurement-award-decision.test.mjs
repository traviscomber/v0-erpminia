import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827212000_record_procurement_award_decision_v1.sql','utf8');
const route = fs.readFileSync('app/api/procurement/award-evidence/route.ts','utf8');
const panel = fs.readFileSync('components/procurement/award-evidence-panel.tsx','utf8');

test('award decision persists reason actor and evidence snapshot',()=>{
  assert.match(migration,/create table if not exists public\.procurement_award_decisions/);
  assert.match(migration,/primary_reason/);
  assert.match(migration,/supplier_operational_score/);
  assert.match(migration,/evidence_dimensions/);
  assert.match(migration,/is_lowest_price/);
  assert.match(migration,/is_fastest_delivery/);
  assert.match(migration,/decided_by/);
});

test('workflow order cannot bypass explicit award decision',()=>{
  assert.match(migration,/trg_enforce_procurement_award_decision_context_v1/);
  assert.match(migration,/Motivo de adjudicación requerido/);
  assert.match(migration,/set_config\('motil\.award_decision_authorized','1',true\)/);
});

test('award decision rpc is tenant safe and backend only',()=>{
  assert.match(migration,/user_roles ur where ur\.user_id=p_actor_id and ur\.organization_id=v_quote\.organization_id/);
  assert.match(migration,/revoke all on function public\.award_supplier_quotation_with_decision_v1/);
  assert.match(migration,/grant execute on function public\.award_supplier_quotation_with_decision_v1\(uuid,text,text,uuid\) to service_role/);
  assert.match(route,/\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route,/p_actor_id: context\.userId/);
});

test('award panel requires a human reason and records through decision rpc endpoint',()=>{
  assert.match(panel,/Motivo principal/);
  assert.match(panel,/Adjudicar y emitir OC/);
  assert.match(panel,/primaryReason/);
  assert.match(panel,/decisionNotes/);
  assert.match(route,/award_supplier_quotation_with_decision_v1/);
  assert.match(route,/primaryReason === 'other'/);
});
