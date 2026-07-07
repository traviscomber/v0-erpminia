# Route Backlog

This backlog tracks route-level production risk for `www.motil.app`.
Status reflects the latest current-worktree audit plus live verification on July 6, 2026.

## Highest Priority

| Route | State | Risk | Action |
| --- | --- | --- | --- |
| `/auth/login` | Live verified `200` on July 6, 2026 and currently acts as the production login entrypoint | High | Keep this as the current public auth route unless a deliberate migration replaces it everywhere. |
| `/login` | Live verified public `307` redirect to `/auth/login`, followed by `200` on July 7, 2026 | Low | Keep this compatibility shim so legacy login links resolve cleanly to the proven auth entrypoint. |
| `/dashboard` | Live verified authenticated `200` on July 6, 2026 | Medium | Re-check during the next authenticated MVP route pass after the login compatibility deploy. |
| `/dashboard/work-orders` | Live verified authenticated render with real work-order data on July 7, 2026; canonical task-creation path remains intact | High | Keep this route as the single operational entry for creating and managing work orders. |
| `/dashboard/work-orders/create` | Live verified authenticated `200` on July 6, 2026 | High | Preserve as the canonical task-creation destination and link target. |
| `/dashboard/work-orders/[id]` | Live verified authenticated render on July 7, 2026 from a real list item; detail route shows status, priority, actions, and parts without console errors | Low | Keep the detail route linked from the list and preserve the separated loading/error/missing-order states. |
| `/dashboard/crear-tarea` | Live verified authenticated redirect on July 6, 2026 to `/dashboard/work-orders/create` | Medium | Preserve this compatibility route only as a redirect shim into the canonical work-order creation flow. |

## Core Growth Area

| Route | State | Risk | Action |
| --- | --- | --- | --- |
| `/dashboard/sostenibilidad` | Live verified authenticated `200` on July 6, 2026 | Medium | Keep this as the primary growth area and maintain consistent navigation into its submodules. |
| `/dashboard/sostenibilidad/prevencion-riesgos` | Live verified authenticated `200` on July 6, 2026 | Medium | Continue consolidating prevention flows here and keep labels aligned with the rest of the app. |
| `/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Medium | Keep training management under prevention and verify create/import flows remain stable after deploy. |
| `/dashboard/sostenibilidad/compliance` | Previously verified live | Medium | Preserve the compliance/auditoria flow and avoid reintroducing placeholder states. |
| `/dashboard/sostenibilidad/compliance/importar` | Live verified authenticated render on July 6, 2026; source cleaned and encoding-normalized | Medium | Validate the import experience after deploy and ensure copy, templates, and upload states are clear. |
| `/dashboard/sostenibilidad/calendario` | Live verified authenticated render on July 6, 2026; source cleaned and encoding-normalized | Low | Confirm the schedule copy and event labels remain consistent after deployment. |
| `/dashboard/sostenibilidad/documentos-flujo` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep document-approval stages and search states aligned with the sustainability document workflow. |
| `/dashboard/sostenibilidad/documentos-reportes` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Preserve the sustainability document reporting summaries and empty states without degraded wording. |
| `/dashboard/sostenibilidad/mis-aprobaciones` | Live verified authenticated first-attempt render on July 7, 2026; no fallback error or console errors observed | Low | Keep the approval queue linked back into document flow and monitor only if the intermittent load issue returns. |
| `/dashboard/sostenibilidad/reportes` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep sustainability reporting accessible without drifting into placeholder dashboards. |

## Document Management

| Route | State | Risk | Action |
| --- | --- | --- | --- |
| `/dashboard/documentos-gestion` | Live verified authenticated `200` on July 6, 2026; source also cleaned and encoding-normalized | Medium | Keep the module clarifying navigation into the dedicated subroutes instead of turning it into a dumping ground. |
| `/dashboard/documentos-gestion/reportes` | Live verified authenticated render on July 6, 2026; source cleaned and encoding-normalized | Low | Confirm the report entry labels and search states after deploy. |
| `/dashboard/documentos-gestion/contratos` | Live verified authenticated render on July 6, 2026; source cleaned and encoding-normalized | Low | Verify the remaining metadata fields and ensure contract copy is fully localized. |
| `/dashboard/documentos-gestion/contratos/reportes` | Live verified authenticated render on July 6, 2026; source also cleaned and copy normalized | Low | Keep contract-payment/reporting terminology explicit and aligned with the contratos workflow. |
| `/dashboard/documentos-gestion/adquisiciones` | Live verified authenticated render on July 6, 2026; source cleaned | Low | Keep OC creation owned by Compras and do not duplicate the flow here. |
| `/dashboard/documentos-gestion/seguridad` | Live verified authenticated render on July 6, 2026; source cleaned | Low | Confirm the empty state is explicit and does not regress into placeholder content. |
| `/dashboard/documentos-gestion/[id]` | Live verified authenticated render on July 6, 2026 via `/dashboard/documentos-gestion/ambiental`; source cleaned | Low | Ensure category detail routes keep their wording and don't expose broken metadata. |
| `/dashboard/documentos-gestion/procedimientos` | Live verified authenticated `200` on July 6, 2026; source also cleaned and encoding-normalized | Low | Confirm after deploy that the live copy reflects the normalized source wording. |

## Auxiliary Modules

| Route | State | Risk | Action |
| --- | --- | --- | --- |
| `/dashboard/mantenimiento` | Previously verified live | Medium | Keep the operational flow stable and avoid pushing import UI into the main page. |
| `/dashboard/mantenimiento/combustible` | Live verified authenticated render on July 6, 2026; source also cleaned and copy normalized | Low | Keep the fuel-stock summary aligned with its dedicated import route and free of degraded operational copy. |
| `/dashboard/mantenimiento/bitacora` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep the maintenance log naming aligned with the rest of the maintenance workflow cluster. |
| `/dashboard/mantenimiento/centro-costo` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep maintenance-by-cost-center wording explicit and aligned with work-order reporting. |
| `/dashboard/mantenimiento/componentes-mayores` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep major-component wording aligned with vehicle and maintenance asset surfaces. |
| `/dashboard/mantenimiento/gerencial` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep the executive maintenance dashboard naming aligned with the rest of the maintenance module. |
| `/dashboard/mantenimiento/costos` | Live verified authenticated render on July 7, 2026 after deploying defensive query limits; no console errors or navigation timeout, but first-load still measured about 31s | Medium | Profile remaining first-load latency and consider splitting the cost endpoint into summary-first plus detail rows before downgrading risk. |
| `/dashboard/mantenimiento/documentos` | Live verified authenticated render on July 6, 2026; source also cleaned and copy normalized | Low | Keep maintenance document review/upload states aligned with the rest of the document modules. |
| `/dashboard/mantenimiento/equipos` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Preserve the dedicated equipment import path and keep search/result states free of degraded labels. |
| `/dashboard/mantenimiento/movil` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep the mobile maintenance panel naming aligned with the rest of the maintenance module. |
| `/dashboard/mantenimiento/neumaticos` | Live verified authenticated render on July 6, 2026; source already normalized in the current worktree | Low | Preserve the tire-management entrypoint and keep it consistent with the maintenance navigation cluster. |
| `/dashboard/mantenimiento/planificacion` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep preventive-planning wording explicit and aligned with the scheduled maintenance workflow. |
| `/dashboard/mantenimiento/personal` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep personnel module naming aligned with the rest of maintenance and avoid metadata/copy drift. |
| `/dashboard/mantenimiento/indicadores` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep maintenance KPI naming explicit and aligned with the executive/dashboard surfaces. |
| `/dashboard/mantenimiento/vehiculos` | Live verified authenticated render on July 6, 2026; source also cleaned and copy normalized | Low | Preserve vehicle and fault-tree navigation wording and keep the vehicle management entrypoint production-ready. |
| `/dashboard/maquinaria` | Previously verified live; source copy normalized in the current worktree | Medium | Re-check the live route after deploy and preserve the dedicated import workflow plus cleaned vehicle/equipment labels. |
| `/dashboard/legal` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Medium | Verify the executive legal dashboard after deploy and keep it aligned with document and contract flows. |
| `/dashboard/legal/documentos` | Live verified authenticated render on July 6, 2026; source also cleaned and copy normalized | Low | Keep the legal document workflow aligned with contratos and reportes without degraded review/import labels. |
| `/dashboard/legal/permisos-licencias` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Verify permit and license expiration labels after deploy and keep this route focused on legal authorizations. |
| `/dashboard/admin/permissions` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep the permissions form labels explicit and ensure admin access remains operable without placeholder states. |
| `/dashboard/admin/users` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep user-management role explanations explicit and ensure admin onboarding remains operable. |
| `/dashboard/roles` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Preserve the roles-permissions matrix as an explicit admin reference without degraded module labels. |
| `/dashboard/centros-costos` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep cost-center navigation explicit and aligned with maintenance and inventory grouping. |
| `/dashboard/telemetria` | Previously verified live; source copy normalized in the current worktree | Medium | Keep the LAN/auth integration discoverable and avoid regressing the operational CTA. |
| `/dashboard/telemetria/integracion` | Live verified authenticated render on July 6, 2026; source also cleaned and copy normalized | Low | Preserve the LAN onboarding instructions and keep token/payload guidance explicit after deploy. |
| `/dashboard/hse` | Previously verified live | Medium | Keep the surface reachable and aligned with the prevention/documentation structure. |
| `/dashboard/hse/capacitaciones` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep training labels and filters explicit and avoid drift between HSE and prevención de riesgos training flows. |
| `/dashboard/hse/documentos` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep HSE document review/upload states aligned with the other document modules. |
| `/dashboard/hse/epp` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep EPP catalog wording and cargo/elemento filters explicit and free of degraded labels. |
| `/dashboard/hse/incidentes` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep incident cards and empty states explicit and avoid degraded fallback labels. |
| `/dashboard/hse/investigaciones` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep investigation creation/search labels consistent and preserve the import flow. |
| `/dashboard/hse/kpis` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep KPI visibility aligned with the rest of HSE and avoid empty-state regressions. |
| `/dashboard/kpi-dashboard` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep the cross-module KPI dashboard readable and avoid degraded operations/maintenance wording. |
| `/dashboard/hse/riesgos` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Preserve the risk-matrix search and empty states without degraded copy or placeholder wording. |
| `/dashboard/ia-operacional` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep operational-intelligence summaries explicit and avoid degraded maintenance/document wording. |
| `/dashboard/inventario` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep inventory labels consistent across table and detail views and avoid category/code wording drift. |
| `/dashboard/guias` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep educational guidance readable and avoid degraded accenting in operational instructions. |
| `/dashboard/alertas` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep alert-routing labels explicit and preserve the operational shortcuts into maintenance, documents, and legal. |
| `/dashboard/reportes` | Live verified authenticated render on July 6, 2026; source also cleaned and copy normalized | Low | Keep the reporting hub wording clear and avoid regressions in operational/export framing. |
| `/dashboard/produccion` | Live verified authenticated render on July 6, 2026; source review delegated to the production dashboard component | Low | Keep the production entry surface reachable and aligned with the rest of the operational dashboards. |
| `/dashboard/finanzas/documentos` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Preserve the explicit correction state and keep the module from drifting into placeholders. |
| `/dashboard/bodega/documentos` | Live verified authenticated first-attempt render on July 7, 2026; defensive document normalization deployed and no fallback or console errors observed | Low | Preserve the import/upload CTAs and keep defensive row normalization in place. |
| `/dashboard/bodega/importar-datos` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Preserve bodega import terminology and keep this route clearly scoped to data loading, not day-to-day operations. |
| `/dashboard/compras/documentos` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Maintain the correction queue and link it back to the buying workflow. |
| `/dashboard/compras/importar-existencias` | Live verified authenticated render on July 6, 2026; source cleaned and copy normalized | Low | Keep stock/provider import wording explicit and aligned with the compras data-ingestion workflow. |
| `/dashboard/sostenibilidad/comunidades` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep community relationship records and import flow aligned with the sustainability cluster. |
| `/dashboard/sostenibilidad/medio-ambiente` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep environmental records and review states aligned with the sustainability workflow. |
| `/dashboard/sostenibilidad/no-conformidades` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Preserve corrective-follow-up visibility and avoid regressions in non-conformity tracking. |
| `/dashboard/sostenibilidad/prevencion-riesgos/acciones-correctivas` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep corrective-action tracking aligned with non-conformities and prevention reporting. |
| `/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque` | Live verified authenticated render on July 6, 2026; source also cleaned and copy normalized | Low | Preserve contractor onboarding document validation wording and reviewer states. |
| `/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse` | Live verified authenticated render on July 6, 2026; source also cleaned and copy normalized | Low | Keep HSE document review/upload states explicit and aligned with prevention workflows. |
| `/dashboard/sostenibilidad/prevencion-riesgos/epp` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep prevention-side EPP management aligned with worker delivery and replacement tracking. |
| `/dashboard/sostenibilidad/prevencion-riesgos/inspecciones` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep internal inspection search and empty states aligned with prevention operations. |
| `/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-externas` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep external inspection tracking explicit and avoid degraded result states. |
| `/dashboard/sostenibilidad/prevencion-riesgos/kpi` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Preserve prevention KPI visibility and avoid empty-state regressions. |
| `/dashboard/sostenibilidad/prevencion-riesgos/no-conformidades` | Live verified authenticated render on July 6, 2026; source reviewed and currently consistent | Low | Keep prevention non-conformity tracking aligned with corrective-action workflows. |

## Remaining Work Order

1. Profile remaining `/dashboard/mantenimiento/costos` first-load latency; the route now renders without timeout, but still loads too slowly for production polish.
2. Re-check `/dashboard/documentos-gestion`, `/dashboard/documentos-gestion/procedimientos`, and the main `sostenibilidad` surfaces after deploy to confirm the normalized copy is live.
3. Promote the source-clean auxiliary routes to live-confirmed status route by route using authenticated verification after deploy.
4. Treat the remaining untracked dashboard pages as utility/import/detail routes unless they prove broken or misleading in live verification.
5. Keep the backlog updated by route, severity, and action until there are no broken links, broken labels, or missing entrypoints left.
