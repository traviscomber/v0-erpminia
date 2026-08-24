export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const EXPECTED = {
  batches: 10,
  movements: 35744,
  exceptions: 3165,
  plantShifts: 11171,
  metallurgy: 11171,
};

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES, true);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data: batches, error: batchError } = await context.supabase
    .from('production_import_batches')
    .select('id, source_file, source_file_sha256')
    .eq('organization_id', context.organizationId)
    .eq('project_key', 'motil')
    .eq('domain_key', 'production');

  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });
  if ((batches || []).length !== EXPECTED.batches) {
    return NextResponse.json({ error: `Se esperaban ${EXPECTED.batches} batches Motil y existen ${(batches || []).length}` }, { status: 409 });
  }

  const batchIds = (batches || []).map((row) => row.id);
  const [movementsResult, exceptionsResult, shiftsResult, metallurgyResult] = await Promise.all([
    context.supabase.from('production_material_movements').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).in('import_batch_id', batchIds),
    context.supabase.from('production_import_exceptions').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).in('import_batch_id', batchIds),
    context.supabase.from('production_plant_shifts').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).in('import_batch_id', batchIds),
    context.supabase.from('production_metallurgy_results').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
  ]);

  const firstError = movementsResult.error || exceptionsResult.error || shiftsResult.error || metallurgyResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const actual = {
    batches: batchIds.length,
    movements: movementsResult.count || 0,
    exceptions: exceptionsResult.count || 0,
    plantShifts: shiftsResult.count || 0,
    metallurgy: metallurgyResult.count || 0,
  };

  const reconciled = Object.entries(EXPECTED).every(([key, value]) => actual[key as keyof typeof actual] === value);
  if (!reconciled) {
    return NextResponse.json({
      error: 'La carga no reconcilia todavía con el master canónico; los batches no se marcaron como importados.',
      expected: EXPECTED,
      actual,
    }, { status: 409 });
  }

  const { error: updateError } = await context.supabase
    .from('production_import_batches')
    .update({ status: 'imported', updated_at: new Date().toISOString() })
    .eq('organization_id', context.organizationId)
    .eq('project_key', 'motil')
    .eq('domain_key', 'production');

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ reconciled: true, expected: EXPECTED, actual });
}
