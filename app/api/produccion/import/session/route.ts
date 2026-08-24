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
  const mode = String(body?.mode || '').trim();
  const sourceFile = String(body?.sourceFile || '').trim();
  const sourceFileSha256 = String(body?.sourceFileSha256 || '').trim().toLowerCase();
  const periodStart = String(body?.periodStart || '').trim() || null;
  const periodEnd = String(body?.periodEnd || '').trim() || null;
  const templateVersion = String(body?.templateVersion || '').trim();

  if (!['mineral_transport', 'plant_metallurgy'].includes(mode)) return NextResponse.json({ error: 'Modo de importación inválido' }, { status: 400 });
  if (!sourceFile || !/^[a-f0-9]{64}$/.test(sourceFileSha256) || !templateVersion) return NextResponse.json({ error: 'Archivo, SHA-256 y templateVersion son obligatorios' }, { status: 400 });

  const sourceType = mode === 'mineral_transport' ? 'tm' : 'ley';
  const { data: existing, error: existingError } = await context.supabase.from('production_import_batches').select('id, status, source_file').eq('organization_id', context.organizationId).eq('source_file_sha256', sourceFileSha256).maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  let batchId = existing?.id as string | undefined;
  if (!batchId) {
    const { data: batch, error: batchError } = await context.supabase.from('production_import_batches').insert({ organization_id: context.organizationId, source_type: sourceType, source_file: sourceFile, source_file_sha256: sourceFileSha256, period_start: periodStart, period_end: periodEnd, status: 'approved_for_import', normalization_rule_version: templateVersion, notes: `Carga Excel validada en cliente contra ${templateVersion}.`, created_by: context.userId }).select('id').single();
    if (batchError || !batch) return NextResponse.json({ error: batchError?.message || 'No fue posible crear batch' }, { status: 500 });
    batchId = batch.id;
  }

  const { data: currentSession } = await context.supabase.from('production_data_entry_sessions').select('id, status').eq('organization_id', context.organizationId).eq('import_batch_id', batchId).eq('entry_source', 'excel_import').order('created_at', { ascending: false }).limit(1).maybeSingle();
  let sessionId = currentSession?.id as string | undefined;
  if (!sessionId) {
    const { data: session, error: sessionError } = await context.supabase.from('production_data_entry_sessions').insert({ organization_id: context.organizationId, entry_mode: mode, entry_source: 'excel_import', import_batch_id: batchId, template_version: templateVersion, status: existing?.status === 'imported' ? 'committed' : 'validated', validation_summary: { file: sourceFile, sha256: sourceFileSha256, periodStart, periodEnd, schema: templateVersion }, created_by: context.userId }).select('id').single();
    if (sessionError || !session) return NextResponse.json({ error: sessionError?.message || 'No fue posible crear sesión' }, { status: 500 });
    sessionId = session.id;
  }

  return NextResponse.json({ batchId, sessionId, alreadyImported: existing?.status === 'imported', batchStatus: existing?.status || 'approved_for_import' });
}
