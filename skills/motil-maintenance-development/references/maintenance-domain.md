# MOTIL Maintenance Domain

## Purpose

Mantenimiento must resolve work, protect assets, learn from validated history, and connect maintenance decisions to production, inventory, procurement, cost, and human execution.

## Primary product surfaces

Treat these as one connected operating system:

- **Resumen / Centro operacional:** prioritized attention from operational evidence, overdue preventive tasks, open work orders, closure readiness, and reliability context.
- **Ordenes de trabajo:** creation, assignment, execution, evidence, labor, materials, costs, and safe closure.
- **Imputacion:** labor/time/cost attribution with auditable actor and timestamps.
- **Planificar:** schedule work and preventive activities without confusing planned work with completed work.
- **Activos:** canonical asset master and asset-centered context.
- **Maestranza:** workshop execution and traceability where relevant.
- **Personal:** maintenance people and responsibility context, not a duplicate HR master.
- **Indicadores:** derived metrics from canonical work and asset history.
- **Preventivo por horas:** schedules derived from canonical meter evidence and maintenance plans.
- **Confiabilidad:** only validated, non-synthetic operational history.
- **Cierre:** explicit readiness blockers and human closure.
- **Inventario / Compras integration:** material requirements, reservations, issues, shortages, procurement, receipts, and cost traceability.
- **Senior Assistant:** explainable copilot grounded in canonical operational evidence.

## Current canonical maintenance sources used by the Senior Assistant

- `maintenance_canonical_assets_v1`
- `drilling_maintenance_review_queue_v1`
- `production_drilling_source_reports`
- `preventive_maintenance_hour_status_v1`
- `maintenance_work_orders`
- `maintenance_reliability_base_v1`
- `work_order_close_readiness_v2`

These are a working context, not a permanent guarantee. Reinspect the live schema before changing queries.

## Operational priorities

When deciding what to build next, prefer improvements that increase one or more of:

1. Clearer current asset condition.
2. Faster transition from evidence to reviewed work.
3. Better preventive compliance from trustworthy meter evidence.
4. Safer and more complete work-order closure.
5. Better material and procurement readiness.
6. Higher-quality root-cause and reliability history.
7. Less duplicated data entry.
8. Stronger traceability from source evidence to decision and action.
9. Better supervisor/planner visibility of contradictions and missing evidence.
10. Fewer manual reconciliation steps across modules.

## Anti-patterns

Do not build:

- duplicate asset masters;
- a second preventive engine beside the canonical one;
- KPI cards that repeat the same number without a distinct decision purpose;
- automatic failure-risk labels derived only from operational frequency;
- reliability metrics from synthetic/UAT work orders;
- closure shortcuts that bypass material, labor, evidence, runtime, or plan blockers;
- maintenance features that silently mutate inventory or procurement outside their canonical workflows.
