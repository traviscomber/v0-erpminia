export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getExecutivePortalForIdentity } from '@/lib/executive-portal-config';
import { GET as getProductionOverview } from '@/app/api/produccion/canonical-overview/route';

function num(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(value: unknown, digits = 1) {
  const parsed = num(value);
  return parsed == null ? '—' : `${parsed.toLocaleString('es-CL', { maximumFractionDigits: digits })}%`;
}

function formatNumber(value: number | null, digits = 1) {
  return value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits });
}

function formatCurrency(value: number | null) {
  return value == null
    ? '—'
    : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

function completeSum(rows: any[], key: string) {
  if (!rows.length) return 0;
  const values = rows.map((row) => num(row[key]));
  if (values.some((value) => value == null)) return null;
  return (values as number[]).reduce((sum, value) => sum + value, 0);
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

  let cargoName: string | null = null;
  if (profile?.cargo_id) {
    const { data: cargo, error: cargoError } = await context.supabase
      .from('cargos')
      .select('name')
      .eq('id', profile.cargo_id)
      .maybeSingle();
    if (cargoError) return NextResponse.json({ error: cargoError.message }, { status: 500 });
    cargoName = cargo?.name || null;
  }

  const portal = getExecutivePortalForIdentity(context.role, cargoName);
  if (!portal) {
    return NextResponse.json({ error: 'Portal ejecutivo no disponible para este cargo' }, { status: 403 });
  }

  if (portal.key === 'production') {
    const productionResponse = await getProductionOverview(request);
    if (!productionResponse.ok) return productionResponse;
    const production = await productionResponse.json();
    const current = production.currentPeriod;
    const plan = current?.plan || null;
    const daily = Array.isArray(production.daily) ? production.daily : [];
    const lastTwo = daily.filter((row: any) => row.operation_date).slice(-2);
    const previous = lastTwo.length === 2 ? lastTwo[0] : null;
    const latest = lastTwo.length === 2 ? lastTwo[1] : lastTwo[0] || null;
    const intelligence = Array.isArray(production.intelligence) ? production.intelligence : [];
    const alerts = intelligence.filter((item: any) => item.level === 'alert');
    const watches = intelligence.filter((item: any) => item.level === 'watch');
    const qualityHold = num(production.quality?.hold);
    const qualityPass = num(production.quality?.pass);

    const candidateChanges = latest && previous ? [
      { label: 'Tratamiento diario', current: num(latest.treated_wet_t), previous: num(previous.treated_wet_t), unit: 't' },
      { label: 'Cu fino recuperado', current: num(latest.recovered_fine_cu_t), previous: num(previous.recovered_fine_cu_t), unit: 't' },
      { label: 'Concentrado despachado', current: num(latest.dispatched_concentrate_t), previous: num(previous.dispatched_concentrate_t), unit: 't' },
    ] : [];
    const changes = candidateChanges
      .filter((item) => item.current != null && item.previous != null)
      .map((item) => ({ ...item, current: item.current as number, previous: item.previous as number }));

    const interpretation = [
      plan?.paceIndexPct != null ? (
        Number(plan.paceIndexPct) < 90
          ? { level: 'alert', title: 'El ritmo mensual requiere recuperación', detail: `Índice de ritmo ${pct(plan.paceIndexPct)} frente al calendario del mes.` }
          : Number(plan.paceIndexPct) < 97
            ? { level: 'watch', title: 'El ritmo está levemente bajo calendario', detail: `Índice de ritmo ${pct(plan.paceIndexPct)}. Conviene vigilar los próximos cortes.` }
            : { level: 'info', title: 'El tratamiento mantiene el ritmo del mes', detail: `Índice de ritmo ${pct(plan.paceIndexPct)}.` }
      ) : null,
      plan?.gradeDeltaPctPoints != null ? (
        Number(plan.gradeDeltaPctPoints) < -0.08
          ? { level: 'alert', title: 'La ley de cabeza está materialmente bajo objetivo', detail: `Brecha de ${Math.abs(Number(plan.gradeDeltaPctPoints)).toLocaleString('es-CL', { maximumFractionDigits: 3 })} pp bajo el objetivo activo.` }
          : Number(plan.gradeDeltaPctPoints) < 0
            ? { level: 'watch', title: 'La ley de cabeza está bajo objetivo', detail: `Brecha de ${Math.abs(Number(plan.gradeDeltaPctPoints)).toLocaleString('es-CL', { maximumFractionDigits: 3 })} pp bajo el objetivo.` }
            : { level: 'info', title: 'La ley de cabeza está en o sobre objetivo', detail: 'La ley ponderada no muestra brecha negativa contra el objetivo activo.' }
      ) : null,
      qualityHold != null && qualityHold > 0 ? { level: 'watch', title: 'Hay evidencia pendiente de revisión', detail: `${qualityHold} chequeo(s) de calidad permanecen en HOLD; los vacíos no se interpretan como cero.` } : null,
    ].filter(Boolean).slice(0, 4);

    const treatedTons = num(current?.treatedTons);
    const qualityLabel = qualityPass == null || qualityHold == null ? '—' : `${qualityPass} PASS · ${qualityHold} HOLD`;

    return NextResponse.json({
      portal,
      user: { id: context.userId, name: context.userName, role: context.role, cargo: cargoName },
      status: alerts.length || (qualityHold != null && qualityHold > 0) ? 'attention' : watches.length ? 'watch' : 'stable',
      metrics: [
        { label: 'Tratado', value: treatedTons == null ? '—' : `${formatNumber(treatedTons)} t` },
        { label: 'Ritmo', value: plan?.paceIndexPct == null ? '—' : Number(plan.paceIndexPct) >= 97 ? 'En ritmo' : Number(plan.paceIndexPct) >= 90 ? 'Leve desvío' : 'Bajo ritmo' },
        { label: 'Avance plan', value: pct(plan?.treatmentProgressPct) },
        { label: 'Ley cabeza Cu', value: pct(current?.avgHeadGradePct, 3) },
        { label: 'Recuperación', value: pct(current?.avgRecoveryPct, 2) },
        { label: 'Calidad', value: qualityLabel },
      ],
      signals: [...alerts, ...watches].slice(0, 5),
      interpretation,
      change: { available: changes.length > 0, note: changes.length ? 'Comparación contra el corte operacional inmediatamente anterior sólo para métricas presentes en ambos cortes.' : 'Aún no hay dos cortes operacionales comparables con valores presentes.', items: changes },
      source: 'production_flow_daily_fidelity_v1 + production_metallurgy_deterministic_v2 + production_monthly_plans',
    });
  }

  if (portal.key === 'sustainability') {
    const [kpisResult, ncResult] = await Promise.all([
      context.supabase
        .from('hse_role_kpi_snapshot_v1')
        .select('kpi_key,label,unit,measured_value,evaluation_state,measured_at')
        .eq('organization_id', context.organizationId)
        .eq('cargo_name', 'JEFE SOSTENIBILIDAD'),
      context.supabase
        .from('sostenibilidad_nonconformances')
        .select('id,nc_number,title,severity,status,target_closure_date')
        .eq('organization_id', context.organizationId),
    ]);

    if (kpisResult.error) return NextResponse.json({ error: kpisResult.error.message }, { status: 500 });
    if (ncResult.error) return NextResponse.json({ error: ncResult.error.message }, { status: 500 });

    const kpis = kpisResult.data || [];
    const kpiMap = new Map(kpis.map((row) => [row.kpi_key, row]));
    const ncRows = ncResult.data || [];
    const openNc = ncRows.filter((row) => !['cerrada', 'closed', 'completada', 'completed'].includes(String(row.status || '').toLowerCase()));
    const highNc = openNc.filter((row) => ['alta', 'high', 'critica', 'crítica', 'critical'].includes(String(row.severity || '').toLowerCase()));
    const ncIds = ncRows.map((row) => row.id);

    let correctiveActions: any[] = [];
    if (ncIds.length) {
      const { data, error } = await context.supabase
        .from('sostenibilidad_corrective_actions')
        .select('id,nc_id,ca_number,status,scheduled_completion_date,responsible_person_name')
        .in('nc_id', ncIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      correctiveActions = data || [];
    }

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const openActions = correctiveActions.filter((row) => !['cerrada', 'closed', 'completada', 'completed'].includes(String(row.status || '').toLowerCase()));
    const overdueActions = openActions.filter((row) => row.scheduled_completion_date && row.scheduled_completion_date < today);
    const kpiValue = (key: string) => num(kpiMap.get(key)?.measured_value);
    const injuries = kpiValue('incident_injuries');
    const openIncidentRate = kpiValue('incident_open_rate');
    const inspectionCompletion = kpiValue('inspection_completion_rate');
    const overdueRiskReviews = kpiValue('risk_review_overdue');
    const residualRisk = kpiValue('residual_risk_avg');
    const findings = kpiValue('inspection_findings');

    const signals = [
      highNc.length ? { level: 'alert', code: 'high_nonconformances', title: 'No conformidades de alta severidad abiertas', detail: `${highNc.length} no conformidad(es) alta/crítica permanecen abiertas.` } : null,
      overdueActions.length ? { level: 'alert', code: 'overdue_corrective_actions', title: 'Acciones correctivas vencidas', detail: `${overdueActions.length} acción(es) correctiva(s) siguen abiertas después de su fecha comprometida.` } : null,
      overdueRiskReviews != null && overdueRiskReviews > 0 ? { level: 'watch', code: 'risk_review_overdue', title: 'Revisiones de riesgo vencidas', detail: `${overdueRiskReviews.toLocaleString('es-CL')} riesgo(s) requieren actualización de revisión.` } : null,
      injuries != null && injuries > 0 ? { level: 'watch', code: 'incident_injuries', title: 'Hay lesiones registradas en la evidencia', detail: `${injuries.toLocaleString('es-CL')} lesión(es) aparecen en el corte HSE actual.` } : null,
      inspectionCompletion != null && inspectionCompletion < 100 ? { level: 'watch', code: 'inspection_completion', title: 'Inspecciones aún no completan cobertura total', detail: `Cumplimiento observado: ${pct(inspectionCompletion)}.` } : null,
    ].filter(Boolean) as Array<{ level: 'info' | 'watch' | 'alert'; code: string; title: string; detail: string }>;

    const interpretation = [
      highNc.length || overdueActions.length
        ? { level: 'alert', title: 'La prioridad es cerrar excepciones vencidas o severas', detail: `${highNc.length} NC alta/crítica y ${overdueActions.length} acción(es) correctiva(s) vencida(s) requieren seguimiento.` }
        : { level: 'info', title: 'No hay excepciones severas vencidas en la evidencia consultada', detail: 'No se detectan NC alta/crítica abiertas ni acciones correctivas vencidas.' },
      overdueRiskReviews != null && overdueRiskReviews > 0
        ? { level: 'watch', title: 'La matriz de riesgos requiere actualización', detail: `${overdueRiskReviews.toLocaleString('es-CL')} revisión(es) están vencidas.` }
        : null,
      inspectionCompletion != null
        ? { level: inspectionCompletion >= 95 ? 'info' : 'watch', title: 'Cobertura de inspecciones', detail: `Inspecciones completadas: ${pct(inspectionCompletion)}; hallazgos observados: ${formatNumber(findings, 0)}.` }
        : null,
    ].filter(Boolean).slice(0, 4);

    return NextResponse.json({
      portal,
      user: { id: context.userId, name: context.userName, role: context.role, cargo: cargoName },
      status: signals.some((item) => item.level === 'alert') ? 'attention' : signals.length ? 'watch' : 'stable',
      metrics: [
        { label: 'NC abiertas', value: String(openNc.length) },
        { label: 'Acciones vencidas', value: String(overdueActions.length) },
        { label: 'Inspecciones', value: pct(inspectionCompletion) },
        { label: 'Lesiones', value: formatNumber(injuries, 0) },
        { label: 'Riesgo residual', value: formatNumber(residualRisk, 2) },
        { label: 'Incidentes abiertos', value: pct(openIncidentRate) },
      ],
      signals: signals.slice(0, 5),
      interpretation,
      change: { available: false, note: 'El snapshot HSE actual no conserva dos cortes comparables para afirmar una variación temporal.', items: [] },
      source: 'hse_role_kpi_snapshot_v1 + sostenibilidad_nonconformances + sostenibilidad_corrective_actions',
    });
  }

  if (portal.key !== 'maintenance') {
    return NextResponse.json(
      { error: 'Este portal utiliza un endpoint especializado' },
      { status: 409 },
    );
  }

  const { data, error } = await context.supabase
    .from('maintenance_operational_work_order_flow_v1')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('scheduled_date', { ascending: false, nullsFirst: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const active = rows.filter((row) => row.flow_status !== 'completed');
  const waitingProcurement = active.filter((row) => row.flow_status === 'waiting_procurement');
  const waitingParts = active.filter((row) => row.flow_status === 'waiting_parts');
  const missingOwner = active.filter((row) => row.flow_status === 'missing_person');
  const missingAsset = active.filter((row) => row.flow_status === 'missing_asset');
  const critical = active.filter((row) => ['critical', 'critica', 'crítica'].includes(String(row.priority || '').toLowerCase()));
  const totalCost = completeSum(rows, 'total_cost');
  const purchaseCommitment = completeSum(rows, 'purchase_commitment');

  const signals = [
    critical.length ? { level: 'alert', code: 'critical_work_orders', title: 'Órdenes críticas abiertas', detail: `${critical.length} orden(es) crítica(s) siguen abiertas.` } : null,
    waitingProcurement.length ? { level: 'watch', code: 'waiting_procurement', title: 'Trabajos esperando compra', detail: `${waitingProcurement.length} orden(es) están detenidas o condicionadas por compra.` } : null,
    waitingParts.length ? { level: 'watch', code: 'waiting_parts', title: 'Trabajos esperando repuestos', detail: `${waitingParts.length} orden(es) esperan repuestos para continuar.` } : null,
    missingOwner.length ? { level: 'watch', code: 'missing_owner', title: 'Órdenes sin responsable', detail: `${missingOwner.length} orden(es) activas no tienen responsable asignado.` } : null,
    missingAsset.length ? { level: 'watch', code: 'missing_asset', title: 'Órdenes sin equipo trazable', detail: `${missingAsset.length} orden(es) activas no tienen equipo asociado.` } : null,
  ].filter(Boolean);

  return NextResponse.json({
    portal,
    user: { id: context.userId, name: context.userName, role: context.role, cargo: cargoName },
    status: critical.length ? 'attention' : signals.length ? 'watch' : 'stable',
    metrics: [
      { label: 'OT activas', value: String(active.length) },
      { label: 'OT críticas', value: String(critical.length) },
      { label: 'Esperando abastecimiento', value: String(waitingProcurement.length + waitingParts.length) },
      { label: 'Sin responsable', value: String(missingOwner.length) },
      { label: 'Costo ejecutado', value: formatCurrency(totalCost) },
      { label: 'Compras comprometidas', value: formatCurrency(purchaseCommitment) },
    ],
    signals: signals.slice(0, 5),
    interpretation: [
      critical.length ? { level: 'alert', title: 'La prioridad está en las OT críticas', detail: `${critical.length} orden(es) crítica(s) requieren seguimiento hasta cierre.` } : null,
      waitingProcurement.length + waitingParts.length ? { level: 'watch', title: 'Abastecimiento está condicionando mantenimiento', detail: `${waitingProcurement.length + waitingParts.length} orden(es) dependen de compra o repuestos.` } : null,
      missingOwner.length ? { level: 'watch', title: 'Hay trabajo sin dueño operativo', detail: `${missingOwner.length} orden(es) activas deben quedar asignadas antes de evaluar ejecución.` } : null,
      !critical.length && !(waitingProcurement.length + waitingParts.length) && !missingOwner.length ? { level: 'info', title: 'La cartera activa no muestra bloqueos críticos', detail: 'No hay OT críticas ni bloqueos de abastecimiento en la evidencia actual.' } : null,
    ].filter(Boolean).slice(0, 4),
    change: { available: false, note: 'Aún no existe un historial de estados comparable para afirmar qué cambió entre cortes.', items: [] },
    source: 'public.maintenance_operational_work_order_flow_v1',
  });
}