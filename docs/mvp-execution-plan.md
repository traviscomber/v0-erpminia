# Motil MVP Execution Plan

This is the autonomous execution plan for continuing Motil toward production readiness.
It prioritizes operable module flows over cosmetic polish and keeps `docs/route-backlog.md` as the route-level source of truth.

## Autonomous Objective

Continue developing the Motil MVP module by module until the app is production-ready enough for daily operational use: preserve work orders as the canonical task creation flow, stabilize authenticated dashboard rendering, consolidate sostenibilidad and prevencion-riesgos as the primary growth area, clarify documentos-gestion as a navigation hub into dedicated document workflows, and remove broken links, placeholders, inconsistent empty states, and untracked route risk.

## Priority Order

| Priority | Area | Outcome | Gate |
| --- | --- | --- | --- |
| 1 | Auth and route entrypoints | Public and legacy entrypoints route users into the app without 404s | `/login` redirects to `/auth/login`; authenticated `/dashboard` renders |
| 2 | Work orders | One canonical flow creates and manages operational tasks | `/dashboard/work-orders`, `/dashboard/work-orders/create`, and one real detail route render cleanly |
| 3 | Sostenibilidad and prevencion-riesgos | Growth modules feel connected, navigable, and production-shaped | Main hub plus prevention submodules render without placeholders or fallback errors |
| 4 | Documentos gestion | The module acts as a clear hub, not a duplicate dumping ground | Hub CTAs point to dedicated contracts, reports, procedures, security, and category routes |
| 5 | Intermittent stability | Previously flaky first-load routes behave consistently | Bodega documents, maintenance costs, and approval queue render on first authenticated attempt |
| 6 | Auxiliary modules | Supporting dashboards do not leak broken states | Medium-risk auxiliary routes are verified and downgraded only with live evidence |

## Working Loop

1. Pick the highest-risk route still marked High or Medium in `docs/route-backlog.md`.
2. Verify live behavior when browser access is available; use public HTTP checks only for unauthenticated routes.
3. If the route fails, inspect the owning page, shared component, and API route before editing.
4. Patch the smallest production issue that makes the route more operable.
5. Run the narrowest useful validation available in the current environment.
6. Update `docs/route-backlog.md` with route, state, risk, and next action.
7. Commit and push only when the change is verified enough to deploy.

## Current Next Actions

| Route | Severity | Action |
| --- | --- | --- |
| `/dashboard/work-orders/[id]` | Medium | Verify a real detail route from the work-order list after deploy. |
| `/dashboard/mantenimiento/costos` | Medium | Re-check first-load behavior after the organization-scoped query hardening. |
| `/dashboard/bodega/documentos` | Medium | Re-check first-load behavior after defensive document normalization. |
| `/dashboard/sostenibilidad/mis-aprobaciones` | Medium | Re-check approval queue rendering without reload/retry. |
| `/dashboard/documentos-gestion` | Medium | Confirm the hub stays focused on dedicated subroutes and does not duplicate workflows. |

## Done Criteria

The MVP hardening pass is complete only when all critical and medium-risk routes have current evidence, no known 404s remain in primary navigation, no primary route depends on placeholder content, work-order creation remains canonical, and every remaining low-risk issue has a concrete route-level action in `docs/route-backlog.md`.
