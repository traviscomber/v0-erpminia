export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [quality, sheetCoverage, supplemental, exceptions] = await Promise.all([
    context.supabase
      .from('production_master_normalization_quality_v1')
      .select('check_key,expected_value,actual_value,status')
      .order('check_key'),
    context.supabase
      .from('production_source_sheet_coverage_quality_v1')
      .select('check_key,expected_value,actual_value,status')
      .order('check_key'),
    context.supabase
      .from('production_source_normalized_records')
      .select('domain,semantic_status'),
    context.supabase
      .from('production_normalization_exceptions_v1')
      .select('domain,exception_type'),
  ]);

  const error = quality.error || sheetCoverage.error || supplemental.error || exceptions.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const qualityRows = quality.data || [];
  const sheetRows = sheetCoverage.data || [];
  const supplementalRows = supplemental.data || [];
  const exceptionRows = exceptions.data || [];

  const countBy = <T extends Record<string, unknown>>(rows: T[], key: keyof T) =>
    rows.reduce<Record<string, number>>((acc, row) => {
      const value = String(row[key] ?? 'unknown');
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});

  const masterPass = qualityRows.every((row) => row.status === 'PASS');
  const coveragePass = sheetRows.every((row) => row.status === 'PASS');

  return NextResponse.json({
    status: masterPass && coveragePass ? 'PASS' : 'HOLD',
    policy: {
      raw: 'La fuente se conserva literalmente y no se corrige de forma silenciosa.',
      normalization: 'Sólo se normaliza o promueve lo acreditado por la fuente; las ambigüedades permanecen como excepción trazable.',
      derived: 'Hojas derivadas o duplicadas no sustituyen una fuente granular de mayor precedencia.',
    },
    master: {
      checks: qualityRows.length,
      pass: qualityRows.filter((row) => row.status === 'PASS').length,
      hold: qualityRows.filter((row) => row.status !== 'PASS').length,
      rows: qualityRows,
    },
    sourceCoverage: {
      checks: sheetRows.length,
      pass: sheetRows.filter((row) => row.status === 'PASS').length,
      hold: sheetRows.filter((row) => row.status !== 'PASS').length,
      rows: sheetRows,
    },
    supplemental: {
      rows: supplementalRows.length,
      bySemanticStatus: countBy(supplementalRows, 'semantic_status'),
      byDomain: countBy(supplementalRows, 'domain'),
    },
    exceptions: {
      rows: exceptionRows.length,
      byDomain: countBy(exceptionRows, 'domain'),
      byType: countBy(exceptionRows, 'exception_type'),
    },
  });
}
