export type MaintenanceDecisionUrgency = 'critical' | 'high' | 'medium' | 'low'

export type MaintenanceDecisionKind =
  | 'operational_signal'
  | 'observed_condition_pattern'
  | 'preventive_due'
  | 'closure'
  | 'reliability'

export type MaintenanceDecisionSignal = {
  id: string
  kind: MaintenanceDecisionKind | string
  asset_code: string | null
  asset_name: string | null
  urgency: MaintenanceDecisionUrgency
  canonical_fact: string
  professional_interpretation: string
  hypothesis_to_review: string | null
  evidence_for: string[]
  evidence_against: string[]
  missing_evidence: string[]
  next_best_action: string
  href: string
  human_checkpoint: string
}

export type MaintenanceDecisionCase = MaintenanceDecisionSignal & {
  case_key: string
  decision_state: 'awaiting_human_review'
  accountable_role: string
  evidence_status: 'complete_for_review' | 'evidence_gap'
  evidence_count: number
  execution_policy: 'human_only'
  impact: {
    baseline: string
    expected: null
    observed: null
    status: 'not_measured'
  }
}

const accountableRoleByKind: Record<string, string> = {
  operational_signal: 'Supervisor / mantenedor',
  observed_condition_pattern: 'Ingeniería de mantenimiento',
  preventive_due: 'Planificación de mantenimiento',
  closure: 'Responsable de OT',
  reliability: 'Ingeniería de mantenimiento',
}

export function buildMaintenanceDecisionCase(signal: MaintenanceDecisionSignal): MaintenanceDecisionCase {
  return {
    ...signal,
    case_key: `maintenance:${signal.id}`,
    decision_state: 'awaiting_human_review',
    accountable_role: accountableRoleByKind[signal.kind] || 'Mantenimiento',
    evidence_status: signal.missing_evidence.length > 0 ? 'evidence_gap' : 'complete_for_review',
    evidence_count: signal.evidence_for.length + signal.evidence_against.length,
    execution_policy: 'human_only',
    impact: {
      baseline: signal.canonical_fact,
      expected: null,
      observed: null,
      status: 'not_measured',
    },
  }
}
