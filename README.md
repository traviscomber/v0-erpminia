# MOTIL

> **Mining Operations OS**

[MOTIL](https://motil.app) is a vertical operating system for mining operations. It connects production, maintenance, warehouse, HSE, documents, purchasing, finance and management intelligence in one traceable operational model.

MOTIL is not positioned as a generic ERP. It models the operation itself and connects alerts, people, work, resources, evidence and management outcomes around a shared canonical context.

<p align="center"><strong>Operational signal → Human decision → Work → Evidence → Closure → Next action</strong></p>

---

## What MOTIL connects

| Operational layer | Purpose |
|---|---|
| **Production** | Daily operational records, plant and mine execution context |
| **Geology** | Canonical geological evidence, drilling context and human-reviewed interpretation |
| **Maintenance** | Preventive planning, work orders, equipment execution, horometers and audited closure |
| **Warehouse** | Inventory, movements, stock controls and operational availability |
| **HSE** | Safety, incidents, controls and compliance evidence |
| **Documents** | Controlled operational documentation and traceability |
| **Purchasing** | Requests, approvals, quotations and procurement workflow |
| **Finance** | Operational cost context and management visibility |
| **Management Intelligence** | KPIs, alerts, exceptions and explainable operational signals |

The value comes from these areas sharing the same operating context instead of behaving like disconnected modules.

---

## Maintenance operating loop

Maintenance is designed as an operational workflow, not as a collection of dashboards.

```text
Evidence / condition / due plan
            │
            ▼
      Human planning
            │
            ▼
        Work order
            │
            ▼
   Assigned maintainer
            │
            ▼
Start → Pause → Resume → Finish
            │
            ▼
 Controlled closure evidence
            │
            ▼
 Supervisor validation / next plan
```

Field execution is intentionally simple. Execution profiles see the assigned job, equipment, instructions, timer and the next required action. Administrative, financial and planning detail stays outside the terrain workflow.

A work order cannot enter active execution without a canonical operational assignee. Closure preserves human authority and requires the evidence applicable to the work, including runtime or horometer evidence when required.

---

## Intelligence Core

MOTIL uses a shared Intelligence Core with specialist operational contexts.

```text
MOTIL Intelligence Core
        │
        ├── Maintenance specialist
        ├── Geology specialist
        ├── Production specialist
        ├── Inventory / Warehouse specialist
        ├── Purchasing specialist
        ├── Finance specialist
        └── Executive context
```

The assistant is evidence-first and permission-aware. It can retrieve, explain, compare and prepare decision context, but it does not silently convert observations into operational truth or replace the authorized human decision maker.

Conversation memory is kept separate from canonical operational data. Stable user preferences or working context may help continuity, but current operational evidence remains the source of truth.

---

## Product principles

- Canonical operational data before AI.
- Human authority for diagnosis, prioritization, execution and closure.
- Missing information is never silently converted to zero.
- Historical, derived, imported and operational records remain distinguishable.
- Safety and authorization rules stay deterministic.
- AI may explain and surface evidence; it does not fabricate operational facts.
- Every operational action should remain attributable and auditable.
- Alerts should lead to a useful next action, not merely decorate dashboards.
- One operational entity should have one canonical source of truth.
- Interfaces should reduce before adding: one screen, one primary intent, one primary action.

---

## Role-aware experience

MOTIL adapts navigation, data density and actions to the user role.

Examples:

- **Executors / maintainers:** assigned work and evidence capture.
- **Planning:** preventive plans, work-order scheduling, resources and operational blockers.
- **Maintenance leadership:** workload, equipment state, closure quality and management visibility.
- **Read-only or support roles:** relevant evidence without mutation controls.

Authorization is enforced server-side; hiding a control in the UI is never treated as the security boundary.

---

## Architecture

MOTIL is implemented as a modern web application using:

- **Next.js / React / TypeScript** for the application layer;
- **PostgreSQL / Supabase** for operational and canonical data;
- server-side APIs for privileged operational workflows;
- role-based authorization and tenant-scoped data access;
- row-level security and backend-only boundaries where required;
- responsive management and field-facing interfaces;
- Vercel for application deployment.

Deployment credentials, user passwords, customer exports and private operational evidence are intentionally excluded from repository documentation.

---

## Data trust model

MOTIL separates four concepts that must not be mixed:

1. **Canonical data** — current operational truth accepted by the system.
2. **Evidence** — source observations, documents, readings or historical records.
3. **Derived information** — calculated status, summaries or prioritization built from known inputs.
4. **Interpretation** — professional or AI-supported context that still requires human authority where applicable.

This distinction is especially important for maintenance reliability, geology, costs, horometers and operational exceptions.

---

## Development and release standard

Changes should be released only after the relevant gates are satisfied:

```text
Regression tests
      ↓
Production build
      ↓
Exact deployment / commit verification
      ↓
Runtime check
      ↓
Authenticated production QA when required
```

Use **PASS**, **HOLD** and **BLOCK** based on evidence rather than assumptions.

Never commit production credentials, user passwords, customer exports or private operational evidence. Use environment configuration excluded from version control.

---

## Product

**MOTIL — Mining Operations OS**  
[motil.app](https://motil.app)
