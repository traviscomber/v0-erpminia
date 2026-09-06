# Canonical Data and Evidence Rules

## Truth hierarchy

Use this hierarchy whenever maintenance data disagrees:

1. **Canonical entity/process state:** validated structured records used operationally.
2. **Validated evidence:** source reports, measurements, documents, observations, or reviewed records that support canonical state.
3. **Derived state:** deterministic calculation from canonical records.
4. **Recoverable evidence:** enough source evidence exists to support a recovery/reconciliation task, but the canonical value is not yet materialized.
5. **Exploratory interpretation:** professional or AI interpretation pending human validation.
6. **Missing:** no defensible value in current sources.

Never collapse these levels into one label.

## Entity, process, evidence

- Asset = entity.
- Work order / preventive schedule / reservation = process.
- Drilling report / technician observation / document / photo = evidence.
- Reliability KPI = derived output.

Do not use an evidence row as a replacement master entity.

## Maintenance semantics

- `FUERA DE SERVICIO` is an observed/status signal, not automatically a validated root cause.
- `OPERATIVO CON OBSERVACIONES` is evidence requiring interpretation, not failure probability.
- Counts over 90 days are observed frequencies, never probabilities unless a validated statistical model explicitly supports that claim.
- External constraints such as lack of water, power outage, or no crew must remain separate from mechanical causes.
- Preventive overdue status must derive from the current trusted meter basis and schedule definition.
- A completed work order is not automatically trustworthy reliability evidence; synthetic/UAT/test content must be excluded.
- Closure readiness is a gate derived from explicit blockers, not a visual convenience.

## Database change rules

- Inspect actual columns, constraints, indexes, RLS, grants, and row counts before DDL.
- Apply DDL with migrations.
- Add indexes for real query patterns, not speculative optimization.
- Prefer server-side aggregation when a complex view is too slow, but retain clear lineage to canonical source rows.
- Do not weaken tenant scoping to work around a timeout or permission error.
- Do not infer data from free text into canonical columns without a deterministic parser plus human validation path where ambiguity exists.

## Identity reconciliation

When codes/names collide:

1. Normalize for comparison only.
2. Gather source lineage and stable identifiers.
3. Mark collision candidates.
4. Require deterministic evidence or human review before merge.
5. Preserve aliases/history after promotion.

Never delete or merge merely because normalized strings match.
