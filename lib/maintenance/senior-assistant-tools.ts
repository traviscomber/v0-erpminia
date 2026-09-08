export type MaintenanceSeniorToolMode = 'read' | 'prepare_only'

export type MaintenanceSeniorToolName =
  | 'get_asset_context'
  | 'get_open_work_orders'
  | 'get_maintenance_plan'
  | 'get_observed_condition_history'
  | 'get_closure_readiness'
  | 'prepare_maintenance_decision_case'

export type MaintenanceSeniorToolDefinition = {
  type: 'function'
  name: MaintenanceSeniorToolName
  description: string
  strict: true
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
    additionalProperties: false
  }
}

export type MaintenanceCanonicalToolContext = {
  assets?: any[]
  pending_operational_reviews?: any[]
  observed_conditions_90d?: any[]
  preventive_hour_status?: any[]
  operational_work_orders?: any[]
  audited_non_synthetic_reliability?: any[]
  closure_readiness?: any[]
}

export type MaintenancePreparedDecisionCase = {
  mode: 'prepare_only'
  decision_state: 'awaiting_human_review'
  execution_policy: 'human_only'
  canonical_asset_id: string | null
  title: string
  canonical_fact: string
  professional_interpretation: string
  hypothesis_to_review: string | null
  evidence_for: string[]
  evidence_against: string[]
  missing_evidence: string[]
  next_best_action: string
  human_checkpoint: string
  impact: {
    expected: null
    observed: null
    status: 'not_measured'
  }
}

const toolModes: Record<MaintenanceSeniorToolName, MaintenanceSeniorToolMode> = {
  get_asset_context: 'read',
  get_open_work_orders: 'read',
  get_maintenance_plan: 'read',
  get_observed_condition_history: 'read',
  get_closure_readiness: 'read',
  prepare_maintenance_decision_case: 'prepare_only',
}

const assetIdSchema = {
  type: 'string',
  description: 'ID canónico del activo dentro de la organización ya autorizada.',
}

export const maintenanceSeniorTools: MaintenanceSeniorToolDefinition[] = [
  {
    type: 'function',
    name: 'get_asset_context',
    description: 'READ. Recupera el activo canónico y la evidencia operacional disponible en el contexto autorizado. No modifica datos.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_open_work_orders',
    description: 'READ. Recupera órdenes de trabajo operacionales del activo. No crea, prioriza, modifica ni cierra OT.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_maintenance_plan',
    description: 'READ. Recupera estado preventivo calculado desde pauta y evidencia de horómetro. No genera trabajo automáticamente.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_observed_condition_history',
    description: 'READ. Recupera frecuencia observada en reportes operacionales. Nunca representa probabilidad de falla.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_closure_readiness',
    description: 'READ. Recupera evidencia de preparación de cierre de OT. No autoriza ni cierra una orden.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { canonical_asset_id: assetIdSchema },
      required: ['canonical_asset_id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'prepare_maintenance_decision_case',
    description: 'PREPARE_ONLY. Estructura un caso derivado para revisión humana. No persiste verdad operacional, no aprueba y no ejecuta.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        canonical_asset_id: { ...assetIdSchema, description: 'ID canónico del activo o cadena vacía si el caso no está asociado a un activo.' },
        title: { type: 'string' },
        canonical_fact: { type: 'string' },
        professional_interpretation: { type: 'string' },
        hypothesis_to_review: { type: 'string' },
        evidence_for: { type: 'array', items: { type: 'string' } },
        evidence_against: { type: 'array', items: { type: 'string' } },
        missing_evidence: { type: 'array', items: { type: 'string' } },
        next_best_action: { type: 'string' },
        human_checkpoint: { type: 'string' },
      },
      required: [
        'canonical_asset_id',
        'title',
        'canonical_fact',
        'professional_interpretation',
        'hypothesis_to_review',
        'evidence_for',
        'evidence_against',
        'missing_evidence',
        'next_best_action',
        'human_checkpoint',
      ],
      additionalProperties: false,
    },
  },
]

export function getMaintenanceSeniorToolMode(name: string): MaintenanceSeniorToolMode | null {
  return Object.prototype.hasOwnProperty.call(toolModes, name)
    ? toolModes[name as MaintenanceSeniorToolName]
    : null
}

function byAsset(rows: any[] | undefined, canonicalAssetId: string) {
  return (rows || []).filter((row) => String(row?.canonical_asset_id || '') === canonicalAssetId)
}

function requireAssetId(args: Record<string, unknown>) {
  const canonicalAssetId = String(args.canonical_asset_id || '').trim()
  if (!canonicalAssetId) throw new Error('canonical_asset_id es obligatorio para esta herramienta')
  return canonicalAssetId
}

export function executeMaintenanceSeniorTool(
  name: string,
  rawArgs: unknown,
  context: MaintenanceCanonicalToolContext,
) {
  const mode = getMaintenanceSeniorToolMode(name)
  if (!mode) throw new Error(`Herramienta no permitida: ${name}`)

  const args = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
    ? rawArgs as Record<string, unknown>
    : {}

  if (name === 'get_asset_context') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      asset: (context.assets || []).find((row) => String(row?.id || '') === canonicalAssetId) || null,
      pending_reviews: byAsset(context.pending_operational_reviews, canonicalAssetId),
      observed_conditions: byAsset(context.observed_conditions_90d, canonicalAssetId),
      preventive_status: byAsset(context.preventive_hour_status, canonicalAssetId),
      work_orders: byAsset(context.operational_work_orders, canonicalAssetId),
      closure_readiness: byAsset(context.closure_readiness, canonicalAssetId),
      semantics: 'La evidencia observada describe hechos/frecuencias registradas; no probabilidad de falla ni causa raíz automática.',
    }
  }

  if (name === 'get_open_work_orders') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      rows: byAsset(context.operational_work_orders, canonicalAssetId).filter((row) =>
        !['closed', 'cerrada', 'cerrado', 'cancelled', 'cancelada', 'cancelado'].includes(String(row?.status || '').trim().toLowerCase())
      ),
      authority: 'La herramienta no crea, modifica, prioriza ni cierra OT.',
    }
  }

  if (name === 'get_maintenance_plan') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      rows: byAsset(context.preventive_hour_status, canonicalAssetId),
      semantics: 'Estado derivado desde pauta y evidencia de horómetro; no implica ejecución automática.',
    }
  }

  if (name === 'get_observed_condition_history') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      rows: byAsset(context.observed_conditions_90d, canonicalAssetId),
      pending_reviews: byAsset(context.pending_operational_reviews, canonicalAssetId),
      semantics: 'Frecuencia observada en reportes; NO es probabilidad de falla ni diagnóstico confirmado.',
    }
  }

  if (name === 'get_closure_readiness') {
    const canonicalAssetId = requireAssetId(args)
    return {
      mode,
      rows: byAsset(context.closure_readiness, canonicalAssetId),
      authority: 'La preparación de cierre no autoriza ni ejecuta el cierre; la decisión final es humana.',
    }
  }

  const canonicalAssetId = String(args.canonical_asset_id || '').trim() || null
  const decisionCase: MaintenancePreparedDecisionCase = {
    mode: 'prepare_only',
    decision_state: 'awaiting_human_review',
    execution_policy: 'human_only',
    canonical_asset_id: canonicalAssetId,
    title: String(args.title || '').trim(),
    canonical_fact: String(args.canonical_fact || '').trim(),
    professional_interpretation: String(args.professional_interpretation || '').trim(),
    hypothesis_to_review: String(args.hypothesis_to_review || '').trim() || null,
    evidence_for: Array.isArray(args.evidence_for) ? args.evidence_for.map(String) : [],
    evidence_against: Array.isArray(args.evidence_against) ? args.evidence_against.map(String) : [],
    missing_evidence: Array.isArray(args.missing_evidence) ? args.missing_evidence.map(String) : [],
    next_best_action: String(args.next_best_action || '').trim(),
    human_checkpoint: String(args.human_checkpoint || '').trim(),
    impact: { expected: null, observed: null, status: 'not_measured' },
  }

  if (!decisionCase.title || !decisionCase.canonical_fact || !decisionCase.professional_interpretation || !decisionCase.next_best_action || !decisionCase.human_checkpoint) {
    throw new Error('El caso preparado requiere hecho canónico, interpretación, próxima acción y checkpoint humano')
  }

  return decisionCase
}
