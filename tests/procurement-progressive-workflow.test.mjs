import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('components/procurement/progressive-procurement-workflow.tsx', 'utf8');
const page = fs.readFileSync('app/dashboard/compras/flujo/page.tsx', 'utf8');

test('procurement workflow exposes one explicit next action', () => {
  assert.match(ui, /Siguiente acción/);
  assert.match(ui, /nextActionControl/);
  assert.match(ui, /Adjudicar cotización/);
  assert.match(ui, /Registrar recepción/);
  assert.match(ui, /Solicitar cotización/);
  assert.match(ui, /Continuar a factura/);
});

test('procurement progression continues into invoice and payment controls', () => {
  assert.match(ui, /Solicitud → Cotización → OC → Recepción → Factura → Pago/);
  assert.match(ui, /\/dashboard\/compras\/facturas/);
  assert.match(ui, /\/dashboard\/finanzas\/pagos/);
  assert.match(ui, /three-way match/);
});

test('workflow actions still use the existing operational API', () => {
  assert.match(ui, /action: 'create_request'/);
  assert.match(ui, /action: 'create_quotation'/);
  assert.match(ui, /action: 'award_quotation'/);
  assert.match(ui, /action: 'receive_purchase_order'/);
  assert.match(page, /ProgressiveProcurementWorkflow/);
});
