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
| `/dashboard/sostenibilidad/prevencion-riesgos/kpi` | healthy | low | Keep empty-state messaging and data binding |
| `/dashboard/sostenibilidad/prevencion-riesgos/epp` | healthy | low | Keep the EPP matrix and cargo coverage intact |
| `/dashboard/sostenibilidad/documentos-reportes` | healthy | low | Keep the report view and empty states intact |
| `/dashboard/mantenimiento` | healthy | low | Keep the executive dashboard and cross-module links intact |
| `/dashboard/telemetria` | healthy | low | Keep the API-stable telemetria shell and live sections intact |
| `/dashboard/legal` | healthy | low | Keep legal as the connected compliance hub |

## Watchlist

No additional broken routes were confirmed in the current sweep.

Next audit targets:
1. `mantenimiento/vehiculos/[id]/qr`
2. `inventario`
3. `alertas`
4. `hse` subroutes not yet rechecked in live mode

