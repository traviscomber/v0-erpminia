# Canonical data map

Snapshot date: 2026-08-04.

## Organization and identity

| Entity | Canonical table | Notes |
|---|---|---|
| Organizations | `organizations` | Root tenant record. Current count: 2. |
| User profiles | `profiles` | User identity enrichment, organization, cargo and profile role. Current count: 26. |
| User role assignment | `user_roles` | Current direct role assignment source. Current count: 4; all recorded assignments are `admin`. |
| Cargo/module matrix | `role_matrix` | Current module access matrix keyed by `cargo_id` and `module_key`. Current count: 272. |
| Permission catalogue | `permissions` | Resource/action catalogue. Current count: 80. |

## Maintenance

| Entity | Canonical table | Current count | Notes |
|---|---|---:|---|
| Equipment registry | `equipment` | 123 | Plant/area-oriented equipment master. |
| Maintenance assets | `maintenance_assets` | 17 | Organization-oriented asset model used by maintenance work orders. |
| Work orders | `maintenance_work_orders` | 36 | Preferred detailed work-order model with organization, asset, status, priority, duration and cost center. |
| Maintenance orders | `maintenance_orders` | 5 | Secondary order model; do not add new dependencies without confirming purpose. |
| Legacy Spanish orders | `mantenimiento_ordenes` | 5 | Compatibility model. New development should prefer `maintenance_work_orders` unless a migration decision says otherwise. |
| Analytics | `maintenance_analytics_daily` and related analytics tables | varies | Derived data; never the original source of operational records. |

## Procurement and warehouse

| Entity | Canonical table | Current count | Notes |
|---|---|---:|---|
| Purchase orders | `purchase_orders` | 23,337 | Canonical imported purchasing history with organization and cost-center context. |
| Warehouse inventory | `bodega_inventory` | 4,918 | Current operational inventory source used by the Bodega APIs. |
| Stock movements | `bodega_movements`, `stock_movements`, `stock_transfers` | varies | Transactional history. Confirm owning workflow before consolidation. |
| Suppliers | `suppliers` | varies | Supplier master. |

## Documents and compliance

| Entity | Canonical table | Current count | Notes |
|---|---|---:|---|
| Module documents | `module_documents` | 89 | Main cross-module document registry. Includes module, category, status, versioning, review fields, `canonical_section` and extracted JSON. |
| Contracts | `contracts` | 6 | Contract master. |
| Document approvals | `document_approvals` | varies | Approval history and state. |
| Audit history | `document_audit_log`, `audit_log` | varies | Append-only audit sources. |

## Finance

| Entity | Canonical table | Current count | Notes |
|---|---|---:|---|
| Finance movements | `finanzas_movements` | 5 | Current financial movement source. |
| Purchase-order finance model | `finanzas_ordenes_compra` and lines | varies | Separate finance workflow; not automatically equivalent to `purchase_orders`. |
| Budgets | `finanzas_presupuestos` | varies | Budget source. |
| Requisitions | `finanzas_requisiciones` | varies | Requisition source. |

## Sustainability and HSE

The database contains both general HSE tables and `sostenibilidad_*` tables. These are separate functional families and must not be merged implicitly.

Examples:

- General HSE: `incidents`, `hse_alerts`, `hse_inspections`, `hse_metrics`, `kpi_prevencion`, `epp_*`.
- Sustainability: `sostenibilidad_incidentes`, `sostenibilidad_kpis`, `sostenibilidad_medio_ambiente`, `sostenibilidad_comunidades`, `sostenibilidad_no_conformidades`.

Current confirmed counts:

- `hse_alerts`: 0.
- `sostenibilidad_medio_ambiente`: 0.
- `sostenibilidad_comunidades`: 0.

A zero in these tables may be valid. It must not be used to infer that all canonical data is absent.

## Duplicate-model policy

The following areas currently have overlapping models:

- `equipment` vs `maintenance_assets`.
- `maintenance_work_orders` vs `maintenance_orders` vs `mantenimiento_ordenes`.
- `purchase_orders` vs `finanzas_ordenes_compra`.
- General HSE tables vs `sostenibilidad_*` tables.
- `bodega_inventory` vs warehouse-location/stock tables.

Until a formal migration is completed:

1. Existing APIs keep their documented canonical source.
2. New APIs must state which source they use.
3. No table is deleted or bulk-copied merely to make dashboards appear populated.
4. Consolidation requires mapping keys, ownership, deduplication rules and rollback.
