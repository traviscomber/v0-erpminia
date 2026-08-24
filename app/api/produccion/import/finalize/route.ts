export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES, true);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json();
  const batchId = String(body?.batchId || '').trim();
  const expectedRows = Number(body?.expectedRows);

  if (!batchId || !Number.isInteger(expectedRows) || expectedRows < 0) return NextResponse.json({ error: 'batchId y expectedRows válidos son obligatorios' }, { status: 400 });

  const { data: batch, error: batchError } = await context.supabase.from('production_import_batches').select('id, source_type, source_file, status').eq('id', batchId).eq('organization_id', context.organizationId).maybeSingle();
  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });
  if (!batch) return NextResponse.json({ error: 'Batch no encontrado' }, { status: 404 });

  const table = batch.source_type === 'tm' ? 'production_material_movements' : null;
  if (!table) return NextResponse.json({ error: 'Este endpoint de cierre solo soporta batches TM' }, { status: 400 });

  const { count, error: countError } = await context.supabase.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('import_batch_id', batchId);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count || 0) !== expectedRows) return NextResponse.json({ error: 'El batch no puede cerrarse porque el conteo persistido no coincide con la evidencia esperada', expectedRows, persistedRows: count || 0 }, { status: 409 });

  const now = new Date().toISOString();
  const { error: updateError } = await context.supabase.from('production_import_batches').update({ status: 'imported', updated_at: now }).eq('id', batchId).eq('organization_id', context.organizationId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: sessionError } = await context.supabase.from('production_data_entry_sessions').update({ status: 'committed', validation_summary: { expectedRows, persistedRows: count || 0, finalizedAt: now }, updated_at: now }).eq('organization_id', context.organizationId).eq('import_batch_id', batchId).eq('entry_source', 'excel_import');
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  return NextResponse.json({ batchId, persistedRows: count || 0, status: 'imported' });
}
