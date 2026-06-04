type SupabaseClientLike = any;

type Filter =
  | { type: 'eq'; column: string; value: string | number | boolean }
  | { type: 'in'; column: string; values: Array<string | number> }
  | { type: 'notNull'; column: string }
  | { type: 'gte'; column: string; value: string | number }
  | { type: 'lte'; column: string; value: string | number };

type SelectOptions = {
  organizationId?: string;
  organizationScoped?: boolean;
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  filters?: Filter[];
};

function normalizeText(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthKey(dateValue?: string | null) {
  const date = new Date(dateValue || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  return new Date(`${key}-01`).toLocaleDateString('es-CL', {
    month: 'short',
  }).replace('.', '');
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function severityWeight(severity?: string | null) {
  const value = normalizeText(severity);
  if (['critica', 'critical'].includes(value)) return 8;
  if (['grave', 'alto', 'high'].includes(value)) return 5;
  if (['medio', 'media', 'medium'].includes(value)) return 3;
  return 1;
}

function normalizeIncidentSeverity(severity?: string | null) {
  const value = normalizeText(severity);
  if (['critica', 'critical', 'grave', 'alto', 'high'].includes(value)) return 'high';
  if (['medio', 'media', 'medium'].includes(value)) return 'medium';
  return 'low';
}

function normalizeIncidentStatus(status?: string | null) {
  const value = normalizeText(status);
  if (['cerrado', 'closed'].includes(value)) return 'closed';
  if (['en_investigacion', 'investigating', 'investigacion'].includes(value)) return 'investigating';
  return 'pending_action';
}

function normalizeTrainingStatus(status?: string | null) {
  const value = normalizeText(status);
  if (['realizada', 'realizado', 'completed', 'completada'].includes(value)) return 'realizada';
  if (['cancelada', 'cancelado'].includes(value)) return 'cancelada';
  return 'programada';
}

function normalizeDocumentStatus(status?: string | null) {
  const value = normalizeText(status);
  if (['obsoleto', 'obsolete', 'inactive', 'archived'].includes(value)) return 'obsoleto';
  if (['en_revision', 'review', 'draft', 'borrador'].includes(value)) return 'en_revision';
  return 'vigente';
}

async function runSelect(
  supabase: SupabaseClientLike,
  table: string,
  select: string,
  options: SelectOptions,
  withOrganizationFilter: boolean
) {
  let query = supabase.from(table).select(select);

  if (withOrganizationFilter && options.organizationId) {
    query = query.eq('organization_id', options.organizationId);
  }

  for (const filter of options.filters || []) {
    if (filter.type === 'eq') query = query.eq(filter.column, filter.value);
    if (filter.type === 'in') query = query.in(filter.column, filter.values);
    if (filter.type === 'notNull') query = query.not(filter.column, 'is', null);
    if (filter.type === 'gte') query = query.gte(filter.column, filter.value);
    if (filter.type === 'lte') query = query.lte(filter.column, filter.value);
  }

  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query;
}

async function safeSelectRows(
  supabase: SupabaseClientLike,
  table: string,
  select: string,
  options: SelectOptions = {}
) {
  try {
    const scoped = await runSelect(
      supabase,
      table,
      select,
      options,
      Boolean(options.organizationScoped && options.organizationId)
    );

    if (!scoped.error) {
      return scoped.data || [];
    }

    if (options.organizationScoped && options.organizationId) {
      const fallback = await runSelect(supabase, table, select, options, false);
      if (!fallback.error) return fallback.data || [];
    }
  } catch {
    // Fallback below.
  }

  return [];
}

export function mapHseDocument(row: any) {
  return {
    id: row.id,
    nombre: row.nombre_documento || row.title || 'Documento HSE',
    tipo: normalizeText(row.tipo || row.document_type || 'procedimiento'),
    version: row.version_actual || row.version || '1.0',
    fecha_actualizacion:
      row.fecha_actualizacion ||
      row.updated_at ||
      row.created_at ||
      new Date().toISOString(),
    estado: normalizeDocumentStatus(row.estado),
    descripcion: row.descripcion || row.description || '',
    url_documento: row.url_documento || row.file_url || row.storage_url || '',
  };
}

export function mapHseTraining(row: any) {
  return {
    id: row.id,
    nombre: row.nombre_capacitacion || row.tema || 'Capacitacion HSE',
    tipo: row.tipo || row.programa_hse || 'HSE',
    fecha_programada: row.fecha_programada || row.created_at || new Date().toISOString(),
    duracion_horas: toNumber(row.duracion_horas),
    proveedor: row.proveedor_instructor || null,
    estado: normalizeTrainingStatus(row.estado),
    asistentes_count: toNumber(row.cantidad_asistentes),
    cargos_aplica: row.programa_hse || null,
  };
}

export function mapHseEpp(row: any) {
  return {
    id: row.id,
    cargo: row.cargo_puesto || 'Cargo sin definir',
    personal_nombre: row.cargo_puesto || 'Cargo sin definir',
    epp_elemento: row.elemento_epp || 'Elemento EPP',
    cantidad: toNumber(row.cantidad_elemento || row.cantidad),
    fecha_entrega: row.updated_at || row.created_at || new Date().toISOString(),
    estado_anterior: 'nuevo' as const,
    devolucion_requerida: false,
    fecha_devolucion: null,
    frecuencia_reemplazo: row.frecuencia_reemplazo || null,
    marca_modelo: row.marca_modelo || null,
    activo: row.activo !== false,
  };
}

export function mapHseIncident(row: any) {
  return {
    id: row.id,
    type: row.incident_type || 'Incidente',
    severity: normalizeIncidentSeverity(row.severity),
    description: row.description || '',
    equipment: row.location || row.process_or_area || 'Sin ubicacion',
    date: new Date(row.date_reported || row.date_occurred || row.created_at || Date.now()).toLocaleDateString('es-CL'),
    status: normalizeIncidentStatus(row.status),
    date_reported: row.date_reported || row.date_occurred || row.created_at || null,
    injuries_count: toNumber(row.injuries_count),
    people_involved: toNumber(row.people_involved || 1),
  };
}

function buildKpiSeries(incidents: any[]) {
  const now = new Date();
  const seriesKeys = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return monthKey(date.toISOString());
  });

  return seriesKeys.map((key) => {
    const monthStart = new Date(`${key}-01T00:00:00`);
    const monthEnd = endOfMonth(monthStart);
    const monthIncidents = incidents.filter((incident) => monthKey(incident.date_reported) === key);
    const totalInjuries = monthIncidents.reduce(
      (sum, incident) => sum + toNumber(incident.injuries_count),
      0
    );
    const totalPeople = monthIncidents.reduce(
      (sum, incident) => sum + Math.max(1, toNumber(incident.people_involved)),
      0
    );
    const totalSeverity = monthIncidents.reduce(
      (sum, incident) => sum + severityWeight(incident.severity),
      0
    );
    const latestBeforeMonthEnd = incidents
      .filter((incident) => new Date(incident.date_reported || Date.now()).getTime() <= monthEnd.getTime())
      .sort(
        (a, b) =>
          new Date(b.date_reported || Date.now()).getTime() -
          new Date(a.date_reported || Date.now()).getTime()
      )[0];

    const daysSinceLastIncident = latestBeforeMonthEnd
      ? Math.max(
          0,
          Math.floor(
            (monthEnd.getTime() - new Date(latestBeforeMonthEnd.date_reported || Date.now()).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : monthEnd.getDate();

    const incidentCount = monthIncidents.length;
    const iirl =
      totalPeople > 0 ? Number(((totalInjuries * 100) / totalPeople).toFixed(2)) : 0;
    const tasaFrecuencia = incidentCount;
    const tasaGravedad =
      incidentCount > 0 ? Number((totalSeverity / incidentCount).toFixed(2)) : 0;

    return {
      mes: monthLabel(key),
      tasa_accidentabilidad: totalInjuries,
      tasa_frecuencia: tasaFrecuencia,
      tasa_gravedad: tasaGravedad,
      iirl,
      odi: Number((totalSeverity || 0).toFixed(2)),
      dias_sin_accidentes: daysSinceLastIncident,
    };
  });
}

export async function getHseModuleData(
  organizationId: string,
  supabase: SupabaseClientLike
) {
  const now = new Date();
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [
    incidentsRaw,
    riskMatrixRaw,
    documentsRaw,
    trainingsRaw,
    eppRaw,
    frameworksRaw,
    requirementsRaw,
    nonconformancesRaw,
  ] = await Promise.all([
    safeSelectRows(
      supabase,
      'incidents',
      'id, incident_type, severity, description, location, date_reported, date_occurred, status, injuries_count, people_involved',
      { orderBy: 'date_reported', ascending: false, limit: 100 }
    ),
    safeSelectRows(
      supabase,
      'risk_matrix',
      'id, hazard_description, process_or_area, risk_level, residual_risk_level, next_review_date, status',
      { orderBy: 'risk_level', ascending: false, limit: 100 }
    ),
    safeSelectRows(
      supabase,
      'hse_master_documents',
      'id, nombre_documento, tipo, descripcion, version_actual, estado, fecha_actualizacion, url_documento, created_at, updated_at',
      { organizationId, organizationScoped: true, orderBy: 'fecha_actualizacion', ascending: false, limit: 50 }
    ),
    safeSelectRows(
      supabase,
      'sostenibilidad_capacitaciones',
      'id, nombre_capacitacion, tipo, tema, programa_hse, proveedor_instructor, fecha_programada, duracion_horas, cantidad_asistentes, estado, created_at',
      { organizationId, organizationScoped: true, orderBy: 'fecha_programada', ascending: false, limit: 100 }
    ),
    safeSelectRows(
      supabase,
      'sostenibilidad_epp',
      'id, cargo_puesto, elemento_epp, cantidad_elemento, marca_modelo, frecuencia_reemplazo, activo, created_at, updated_at',
      { organizationId, organizationScoped: true, orderBy: 'cargo_puesto', ascending: true, limit: 100 }
    ),
    safeSelectRows(
      supabase,
      'normative_frameworks',
      'id, code, name, category, status',
      { orderBy: 'name', ascending: true, limit: 50 }
    ),
    safeSelectRows(
      supabase,
      'normative_requirements',
      'id, framework_id, title, status, deadline, frequency, document_required, audit_required, training_required',
      { orderBy: 'deadline', ascending: true, limit: 200 }
    ),
    safeSelectRows(
      supabase,
      'sostenibilidad_nonconformances',
      'id, status, target_closure_date, category, severity',
      { organizationId, organizationScoped: true, orderBy: 'created_at', ascending: false, limit: 200 }
    ),
  ]);

  const ncIds = nonconformancesRaw.map((row: any) => row.id).filter(Boolean);
  const correctiveActionsRaw = ncIds.length
    ? await safeSelectRows(
        supabase,
        'sostenibilidad_corrective_actions',
        'id, nc_id, status, scheduled_completion_date, actual_completion_date',
        {
          filters: [{ type: 'in', column: 'nc_id', values: ncIds }],
          orderBy: 'scheduled_completion_date',
          ascending: true,
          limit: 200,
        }
      )
    : [];

  const incidents = incidentsRaw.map(mapHseIncident);
  const documents = documentsRaw.map(mapHseDocument);
  const trainings = trainingsRaw.map(mapHseTraining);
  const epp = eppRaw.map(mapHseEpp);

  const kpis = buildKpiSeries(incidents);
  const currentMonthKey = monthKey(now.toISOString());
  const incidentsThisMonth = incidents.filter((incident) => monthKey(incident.date_reported) === currentMonthKey);
  const openCorrectiveActions = correctiveActionsRaw.filter((row: any) =>
    !['completed', 'verified', 'closed', 'cerrada'].includes(normalizeText(row.status))
  );
  const closedCorrectiveActions = correctiveActionsRaw.length - openCorrectiveActions.length;

  const documentCompliance =
    documents.length > 0
      ? Math.round(
          (documents.filter((doc) => doc.estado === 'vigente').length / documents.length) * 100
        )
      : 100;
  const trainingCompliance =
    trainings.length > 0
      ? Math.round(
          (trainings.filter((training) => training.estado === 'realizada').length / trainings.length) * 100
        )
      : 100;
  const eppCompliance =
    epp.length > 0
      ? Math.round((epp.filter((item) => item.activo).length / epp.length) * 100)
      : 100;
  const riskItems = riskMatrixRaw.filter((row: any) => normalizeText(row.status) !== 'mitigado');
  const riskCompliance =
    riskMatrixRaw.length > 0
      ? Math.round(
          ((riskMatrixRaw.length - riskItems.filter((row: any) => toNumber(row.risk_level) >= 15).length) /
            riskMatrixRaw.length) *
            100
        )
      : 100;

  const complianceByArea = [
    { area: 'Documentos HSE', compliance: documentCompliance, target: 100 },
    { area: 'Capacitaciones', compliance: trainingCompliance, target: 100 },
    { area: 'EPP', compliance: eppCompliance, target: 100 },
    { area: 'Riesgos', compliance: riskCompliance, target: 100 },
  ];

  const complianceScore = Math.round(
    complianceByArea.reduce((sum, item) => sum + item.compliance, 0) /
      Math.max(complianceByArea.length, 1)
  );

  const dueRequirements = [
    ...requirementsRaw
      .filter((row: any) => row.deadline && String(row.deadline) <= thirtyDaysOut)
      .map((row: any) => ({
        id: row.id,
        name: row.title,
        count: 1,
        status:
          String(row.deadline) < now.toISOString().slice(0, 10) ? 'critical' : 'warning',
        source: 'Normativa',
        dueDate: row.deadline,
      })),
    ...documents
      .filter((doc) => {
        const days = Math.floor(
          (Date.now() - new Date(doc.fecha_actualizacion).getTime()) / (1000 * 60 * 60 * 24)
        );
        return days > 300;
      })
      .slice(0, 4)
      .map((doc) => ({
        id: doc.id,
        name: doc.nombre,
        count: 1,
        status: 'warning',
        source: 'Documento HSE',
        dueDate: doc.fecha_actualizacion,
      })),
    ...riskMatrixRaw
      .filter((row: any) => row.next_review_date && String(row.next_review_date) <= thirtyDaysOut)
      .slice(0, 4)
      .map((row: any) => ({
        id: row.id,
        name: row.hazard_description || 'Revision de riesgo',
        count: 1,
        status:
          String(row.next_review_date) < now.toISOString().slice(0, 10) ? 'critical' : 'warning',
        source: 'Matriz de riesgos',
        dueDate: row.next_review_date,
      })),
  ]
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
    .slice(0, 8);

  const frameworkCards =
    frameworksRaw.length > 0
      ? frameworksRaw.map((framework: any) => {
          const relatedRequirements = requirementsRaw.filter(
            (requirement: any) => requirement.framework_id === framework.id
          );
          const compliantRequirements = relatedRequirements.filter((requirement: any) =>
            ['compliant', 'vigente', 'completed'].includes(normalizeText(requirement.status))
          ).length;
          const compliance = relatedRequirements.length
            ? Math.round((compliantRequirements / relatedRequirements.length) * 100)
            : 100;

          return {
            id: framework.id,
            name: framework.name,
            requirements: relatedRequirements.length,
            incidents: incidentsThisMonth.length,
            compliance,
          };
        })
      : [
          {
            id: 'seguridad',
            name: 'Seguridad Operacional',
            requirements: requirementsRaw.length || riskMatrixRaw.length,
            incidents: incidentsThisMonth.length,
            compliance: clamp(Math.round((riskCompliance + trainingCompliance) / 2)),
          },
          {
            id: 'documentos',
            name: 'Documentos y Evidencia',
            requirements: documents.length,
            incidents: documents.filter((doc) => doc.estado !== 'vigente').length,
            compliance: documentCompliance,
          },
          {
            id: 'personas',
            name: 'Personas y EPP',
            requirements: trainings.length + epp.length,
            incidents: openCorrectiveActions.length,
            compliance: clamp(Math.round((trainingCompliance + eppCompliance) / 2)),
          },
        ];

  const riskDistribution = [
    {
      name: 'Critico',
      value: riskMatrixRaw.filter((row: any) => toNumber(row.risk_level) >= 20).length,
    },
    {
      name: 'Alto',
      value: riskMatrixRaw.filter((row: any) => {
        const level = toNumber(row.risk_level);
        return level >= 15 && level < 20;
      }).length,
    },
    {
      name: 'Medio',
      value: riskMatrixRaw.filter((row: any) => {
        const level = toNumber(row.risk_level);
        return level >= 8 && level < 15;
      }).length,
    },
    {
      name: 'Bajo',
      value: riskMatrixRaw.filter((row: any) => toNumber(row.risk_level) < 8).length,
    },
  ].filter((item) => item.value > 0);

  return {
    summary: {
      complianceScore,
      incidentsThisMonth: incidentsThisMonth.length,
      openInvestigations: incidents.filter((incident) => incident.status === 'investigating').length,
      dueRequirements: dueRequirements.length,
      openCorrectiveActions: openCorrectiveActions.length,
      closedCorrectiveActions,
    },
    incidents: incidents.slice(0, 8),
    documents: documents.slice(0, 8),
    trainings: trainings.slice(0, 8),
    epp: epp.slice(0, 12),
    frameworks: frameworkCards,
    requirementsDueData: dueRequirements,
    complianceByArea,
    complianceByFramework: frameworkCards.map((framework) => ({
      name: framework.name,
      compliance: framework.compliance,
    })),
    riskDistribution,
    kpis,
  };
}
