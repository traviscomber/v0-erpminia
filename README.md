# MOTIL

> **Mining Operations OS**

[MOTIL](https://motil.app) is a vertical operating system for mining operations. It connects production, maintenance, warehouse, HSE, documents, purchasing, finance and management intelligence in one traceable operational model.

It is not positioned as a generic ERP. The product models the operation itself and links alerts, work, resources, evidence and management outcomes.

<p align="center"><strong>Alert → Work Order → Resource → HSE → Evidence → KPI</strong></p>

---

## What MOTIL connects

| Operational layer | Purpose |
|---|---|
| **Production** | Daily operational records, output and execution context |
| **Maintenance** | Plans, work orders, equipment activity and closure evidence |
| **Warehouse** | Inventory, movements, stock controls and operational availability |
| **HSE** | Safety, incidents, controls and compliance evidence |
| **Documents** | Controlled operational documentation and traceability |
| **Purchasing** | Requests, approvals and procurement workflow |
| **Finance** | Operational cost context and management visibility |
| **Management Intelligence** | KPIs, alerts, exceptions and explainable operational signals |

The value comes from these areas sharing the same canonical operating context instead of behaving like disconnected modules.

---

## Operating model

```text
REAL OPERATION
      │
      ▼
Operational event / alert
      │
      ▼
Work order / responsible owner
      │
      ▼
Resource + inventory + HSE context
      │
      ▼
Execution evidence
      │
      ▼
Closure + KPI + next action
```

This allows the system to preserve the relationship between what happened, who acted, what resources were used, what evidence exists and how the result affects management decisions.

---

## Product principles

- Canonical operational data before AI.
- Missing information is never silently converted to zero.
- Safety and authorization rules remain deterministic.
- AI can explain, classify and surface exceptions; it does not replace business authority.
- Operational actions remain attributable and auditable.
- Alerts should point to executable work, not just decorate dashboards.
- The system should reduce fragmented spreadsheets and duplicated operational truth.

---

## Architecture

MOTIL is implemented as a modern web application using:

- Next.js / React / TypeScript;
- PostgreSQL / Supabase;
- role-based authorization and row-level data boundaries;
- server-side APIs and operational workflows;
- responsive management and field-facing surfaces.

Deployment-specific credentials and production configuration are intentionally excluded from the public repository documentation.

---

## Development

Install dependencies and run the local development server using the package scripts defined in the repository.

Never commit production credentials, user passwords, customer exports or private operational evidence. Use local environment files excluded from version control.

---

## Product

**MOTIL — Mining Operations OS**  
[motil.app](https://motil.app)
