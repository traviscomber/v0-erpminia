# Motil route backlog

Current audit status for authenticated live routes. This backlog only records confirmed states from live verification and code inspection.

## Resolved in this pass

| ruta | estado | riesgo | acción sugerida |
|---|---|---:|---|
| `/dashboard/documentos-gestion/reportes` | resolved | medium | Keep the empty-state fallback; monitor `/api/dashboard/documentos-gestion` for data quality |
| `/dashboard/documentos-gestion/contratos/reportes` | resolved | medium | Keep the timeout fallback; optimize the contracts report API if latency stays high |
| `/dashboard/telemetria` | resolved | medium | Keep the safe timestamp formatter in `SensorAlerts` so alarm rows never render `Invalid Date` |

## Confirmed healthy

| ruta | estado | riesgo | acción sugerida |
|---|---|---:|---|
| `/dashboard/work-orders/create` | healthy | low | Keep as canonical task creation flow |
| `/dashboard/documentos-gestion/contratos` | healthy | low | Maintain current links and document coverage |
| `/dashboard/documentos-gestion/procedimientos` | healthy | low | Keep as operational procedures view |
| `/dashboard/documentos-gestion/seguridad` | healthy | low | Keep as live security document view |
| `/dashboard/documentos-gestion/adquisiciones` | healthy | low | Keep as read-only OC traceability view |
| `/dashboard/documentos` | broken in live, fixed in code pending deploy refresh | high | Keep the null-safe document defaults and refresh the deployment until production serves the patched bundle |
| `/dashboard/sostenibilidad/prevencion-riesgos/kpi` | healthy | low | Keep empty-state messaging and data binding |
| `/dashboard/sostenibilidad/prevencion-riesgos/epp` | healthy | low | Keep the EPP matrix and cargo coverage intact |
| `/dashboard/sostenibilidad/documentos-reportes` | healthy | low | Keep the report view and empty states intact |
| `/dashboard/mantenimiento` | healthy | low | Keep the executive dashboard and cross-module links intact |
| `/dashboard/mantenimiento/gerencial` | healthy | low | Keep the gerencial dashboard tied to real maintenance KPIs |
| `/dashboard/mantenimiento/movil` | healthy | low | Keep the mobile maintenance view aligned with field workflows |
| `/dashboard/mantenimiento/vehiculos/[id]/ficha` | healthy | low | Keep the vehicle detail view tied to real asset records |
| `/dashboard/mantenimiento/vehiculos/[id]/arbol` | healthy | low | Keep the fault tree and diagnostic flow stable |
| `/dashboard/mantenimiento/vehiculos/[id]/qr` | healthy | low | Keep the QR card flow gracefully handling missing asset data |
| `/dashboard/telemetria` | healthy | low | Keep the API-stable telemetria shell and live sections intact |
| `/dashboard/legal` | healthy | low | Keep legal as the connected compliance hub |
| `/dashboard/inventario` | healthy | low | Keep the stock and reordering dashboard aligned with real inventory data |
| `/dashboard/alertas` | healthy | low | Keep the alert center tied to live operational states |
| `/dashboard/hse` | healthy | low | Keep HSE as the primary operational safety hub |
| `/dashboard/hse/incidentes` | healthy | low | Keep the incident import and tracking flow stable |
| `/dashboard/hse/investigaciones` | healthy | low | Keep the investigation workflow stable and data-backed |
| `/dashboard/hse/riesgos` | healthy | low | Keep the risk matrix tied to real HSE records |
| `/dashboard/hse/kpis` | healthy | low | Keep the KPI view tied to incident history and trends |
| `/dashboard/hse/documentos` | healthy | low | Keep the HSE document registry stable |
| `/dashboard/hse/epp` | healthy | low | Keep the EPP matrix stable and importable |
| `/dashboard/admin/users` | healthy | low | Keep user management tied to real roles and states |
| `/dashboard/admin/permissions` | healthy | low | Keep permission assignment stable and auditable |
| `/dashboard/ia-operacional` | healthy | low | Keep the operational AI view aligned with live inputs |
| `/dashboard/roles` | healthy | low | Keep the role/access matrix consistent with the live app |

## Watchlist

No additional broken routes were confirmed in the current sweep.

Next audit targets:
1. broader tail routes under `mantenimiento` and `hse` if you want a final exhaustive pass
