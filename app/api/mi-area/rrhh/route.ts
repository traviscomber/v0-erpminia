export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function countValue(value: number | null) {
  return value == null ? '—' : value.toLocaleString('es-CL');
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('cargo_id')
    .eq('id', context.userId)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { data: cargo, error: cargoError } = profile?.cargo_id
    ? await context.supabase.from('cargos').select('name').eq('id', profile.cargo_id).maybeSingle()
    : { data: null, error: null };
  if (cargoError) return NextResponse.json({ error: cargoError.message }, { status: 500 });

  const cargoName = String(cargo?.name || '').trim();
  if (cargoName.toUpperCase() !== 'JEFE RRHH') {
    return NextResponse.json({ error: 'Portal disponible sólo para JEFE RRHH' }, { status: 403 });
  }

  const [peopleResult, assignmentsResult, credentialsResult, competenciesResult, eppResult, casesResult] = await Promise.all([
    context.supabase
      .from('people')
      .select('id,source_type,employment_status', { count: 'exact' })
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('people_employment_assignments')
      .select('id,end_date', { count: 'exact' })
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('person_credentials')
      .select('id,expires_at,status', { count: 'exact' })
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('person_competencies')
      .select('id,expires_at,status', { count: 'exact' })
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('person_epp_assignments')
      .select('id', { count: 'exact' })
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('people_case_events')
      .select('id,review_status', { count: 'exact' })
      .eq('organization_id', context.organizationId),
  ]);

  const firstError = [peopleResult, assignmentsResult, credentialsResult, competenciesResult, eppResult, casesResult]
    .find((result) => result.error)?.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const people = peopleResult.data || [];
  const assignments = assignmentsResult.data || [];
  const credentials = credentialsResult.data || [];
  const competencies = competenciesResult.data || [];
  const cases = casesResult.data || [];
  const today = new Date().toISOString().slice(0, 10);
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const peopleCount = peopleResult.count;
  const assignmentCount = assignmentsResult.count;
  const credentialCount = credentialsResult.count;
  const competencyCount = competenciesResult.count;
  const eppCount = eppResult.count;
  const caseCount = casesResult.count;

  const activeAssignments = assignments.filter((row) => !row.end_date || row.end_date >= today).length;
  const expiredCredentials = credentials.filter((row) => row.expires_at && row.expires_at < today).length;
  const expiringCredentials = credentials.filter((row) => row.expires_at && row.expires_at >= today && row.expires_at <= in30Days).length;
  const expiredCompetencies = competencies.filter((row) => row.expires_at && row.expires_at < today).length;
  const openCases = cases.filter((row) => !['closed', 'cerrado', 'cerrada', 'resolved', 'resuelto', 'resuelta', 'completed', 'completado', 'completada'].includes(String(row.review_status || '').toLowerCase())).length;
  const workOrderEvidencePeople = people.filter((row) => String(row.source_type || '').toLowerCase() === 'work_order_evidence').length;
  const evidenceOnly = Boolean(peopleCount && workOrderEvidencePeople === peopleCount);
  const masterCoverageMissing = peopleCount == null || peopleCount === 0 || evidenceOnly || assignmentCount === 0;

  const signals = [
    expiredCredentials > 0
      ? { level: 'alert' as const, code: 'expired_credentials', title: 'Credenciales vencidas registradas', detail: `${expiredCredentials.toLocaleString('es-CL')} credencial(es) registradas tienen fecha de expiración vencida.` }
      : null,
    expiringCredentials > 0
      ? { level: 'watch' as const, code: 'credentials_expiring', title: 'Credenciales próximas a vencer', detail: `${expiringCredentials.toLocaleString('es-CL')} credencial(es) registradas vencen dentro de 30 días.` }
      : null,
    expiredCompetencies > 0
      ? { level: 'watch' as const, code: 'expired_competencies', title: 'Competencias vencidas registradas', detail: `${expiredCompetencies.toLocaleString('es-CL')} competencia(s) registradas aparecen vencidas.` }
      : null,
    openCases > 0
      ? { level: 'watch' as const, code: 'open_people_cases', title: 'Casos de personas pendientes de revisión', detail: `${openCases.toLocaleString('es-CL')} caso(s) registrados no aparecen cerrados o resueltos.` }
      : null,
  ].filter(Boolean);

  const interpretation = [
    masterCoverageMissing
      ? { level: 'watch', title: 'El portal es de cobertura RRHH, no de dotación total', detail: 'La brecha de nómina maestra se muestra en Calidad de datos. Los conteos describen evidencia registrada en Motil y no el universo completo de trabajadores.' }
      : { level: 'info', title: 'La base de personas tiene asignaciones laborales registradas', detail: `${activeAssignments.toLocaleString('es-CL')} asignación(es) vigentes aparecen en el corte actual.` },
    evidenceOnly
      ? { level: 'watch', title: 'La evidencia de personas proviene de órdenes de trabajo', detail: `${workOrderEvidencePeople.toLocaleString('es-CL')} persona(s) fueron identificadas desde evidencia operacional; no se trata como nómina maestra.` }
      : null,
    credentialCount === 0
      ? { level: 'info', title: 'No hay credenciales cargadas en la base RRHH', detail: 'Este cero describe cobertura del sistema; no significa que las personas reales carezcan de credenciales.' }
      : null,
    competencyCount === 0
      ? { level: 'info', title: 'No hay competencias cargadas en la base RRHH', detail: 'Este cero describe cobertura del sistema; no significa ausencia real de competencias.' }
      : null,
  ].filter(Boolean).slice(0, 4);

  return NextResponse.json({
    portal: { key: 'hr', label: 'Mi área', title: 'Mi RRHH', areaPath: '/dashboard/rrhh', actionLabel: 'Abrir RRHH' },
    user: { id: context.userId, name: context.userName, role: context.role, cargo: cargoName },
    status: signals.some((item) => item?.level === 'alert') ? 'attention' : signals.length ? 'watch' : 'stable',
    metrics: [
      { label: 'Personas evidenciadas', value: countValue(peopleCount) },
      { label: 'Asignaciones registradas', value: countValue(assignmentCount) },
      { label: 'Credenciales registradas', value: countValue(credentialCount) },
      { label: 'Competencias registradas', value: countValue(competencyCount) },
      { label: 'EPP registrados', value: countValue(eppCount) },
      { label: 'Casos registrados', value: countValue(caseCount) },
    ],
    signals: signals.slice(0, 5),
    interpretation,
    change: { available: false, note: 'La capa RRHH aún no conserva snapshots históricos comparables para afirmar evolución temporal.', items: [] },
    source: 'people + people_employment_assignments + person_credentials + person_competencies + person_epp_assignments + people_case_events',
  });
}
