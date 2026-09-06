---
name: motil-maintenance-development
description: Develop, audit, improve, and release the MOTIL Maintenance area as a production-grade mining maintenance OS. Use for work on maintenance UI/UX, canonical asset and maintenance data, preventive maintenance, work orders, planning, workshop, personnel, reliability, indicators, inventory/procurement integration, the Senior Maintenance Assistant, database migrations, authenticated QA, release gates, or any request to make Mantenimiento safer, simpler, more complete, or more competitive while preserving MOTIL canonical truth and DESIGN.md.
---

# MOTIL Maintenance Development

## Mission

Develop Mantenimiento as an operational system, not a collection of screens. Preserve canonical truth, human authority, traceability, and the MOTIL design system while continuously reducing friction, duplication, ambiguity, and unsupported inference.

## Required context

Before changing code or data:

1. Read the relevant repository files, especially `DESIGN.md`, the current maintenance route/component/API, existing migrations, and tests.
2. Inspect the current canonical database schema and live data before assuming fields, states, relationships, or volumes.
3. Inspect the current production behavior when the task concerns a live bug, UX regression, or release.
4. Prefer connected GitHub, Supabase, Vercel, and authenticated browser evidence over guesses.
5. Never reconstruct missing operational facts from memory when the database or source evidence can answer them.

Read these references as needed:

- `references/maintenance-domain.md` for the product surface and domain priorities.
- `references/canonical-data.md` for truth, evidence, inference, and database rules.
- `references/ui-design.md` for MOTIL interface rules.
- `references/ai-assistant.md` for the Senior Maintenance Assistant.
- `references/release-workflow.md` for implementation and release gates.
- `references/quality-standard.md` for scoring and continuous improvement.

## Core workflow

Apply this sequence to every meaningful change:

1. **Frame the operational question.** State what user decision or maintenance outcome the change improves.
2. **Locate the canonical source.** Identify the master entity, process records, and supporting evidence.
3. **Reduce before adding.** Search for an existing route, component, table, query, workflow, or action that should be reused, merged, moved, or derived.
4. **Classify the change.** Mark affected elements as conserve, merge, move, derive, rename, archive, or remove.
5. **Implement the smallest complete change.** Keep organization/user scoping, authorization, human decision points, and auditability intact.
6. **Add or update regression tests.** Lock the behavior, source semantics, and any trust boundary introduced by the change.
7. **Validate database behavior.** Use migrations for DDL. Avoid destructive data changes unless explicitly authorized and proven safe.
8. **Run release gates.** Tests, build, deployment, runtime, and authenticated production QA must all be considered.
9. **Report evidence, not optimism.** Use PASS, HOLD, or BLOCK and cite exact failing or passing gates.

## Decision rules

### Canonical data

- Treat entity, process, and evidence as separate concepts.
- Keep one canonical master for each entity.
- Derive repeated metrics and statuses instead of copying them.
- Label reconstructed, derived, historical, or evidence-only records explicitly.
- Do not promote observations to diagnoses, diagnoses to causes, or frequencies to probabilities without validated evidence.
- Do not fabricate horometers, downtime, MTBF, MTTR, failure probabilities, root causes, parts, costs, procedures, OEM tolerances, or work performed.
- Never use UAT, simulated, test, or synthetic records as evidence of real reliability or physical intervention.

### Human authority

- Keep the supervisor, planner, maintainer, or authorized role as final authority for diagnosis, priority, work execution, and closure.
- Do not create, close, authorize, or irreversibly reprioritize work orders automatically unless an explicitly approved workflow requires it.
- AI recommendations must explain evidence, contradictions, missing data, and the next useful human action.

### Security and tenancy

- Require the correct module access before loading tenant data.
- Scope operational reads and writes to `organization_id`; scope user-specific assistant state to both organization and user.
- Keep service-role-only tables behind server routes; do not expose them directly to browser clients.
- Enable RLS for private assistant/history tables and revoke direct `anon`/`authenticated` access when the server role is the intended access path.
- Never weaken RLS or grants merely to make a query pass.

### Product simplicity

- Each screen must answer one primary operational question.
- One primary visible action; at most one secondary action beside it.
- Prefer contextual views within Assets, Work Orders, Planning, etc. over parallel modules.
- Remove duplicate navigation and duplicate KPI representations.
- Every new feature must justify why it cannot be derived or placed inside an existing workflow.

## Development modes

### Feature or workflow development

1. Identify the operator/persona and desired outcome.
2. Trace the current path through routes, API, DB, and permissions.
3. Reuse the canonical entity and existing workflow where possible.
4. Implement loading, empty, error, partial-data, and no-permission states.
5. Add an explicit next action, not merely more information.
6. Verify both desktop and responsive behavior.

### Canonical data improvement

1. Inspect source coverage and conflicts before schema changes.
2. Separate materialized/canonical, recoverable-from-evidence, and absent data.
3. Preserve source lineage and raw evidence.
4. Add constraints/indexes/views only when they improve correctness or operational clarity.
5. Never merge identity collisions automatically without deterministic evidence or human validation.

### UI/UX improvement

Use `references/ui-design.md`. Do not invent a parallel visual system. If a requested visual contradicts `DESIGN.md`, adapt it to MOTIL tokens and interaction rules rather than bypassing the design system.

### Senior Assistant improvement

Use `references/ai-assistant.md`. Treat the assistant as a retrieval/context copilot, not an autonomous maintenance authority or a model that silently learns new truth.

### Bug fixing

1. Reproduce or inspect the actual failing request/state.
2. Distinguish browser warnings from backend failures.
3. Read runtime logs and the exact query/API contract.
4. Fix root cause rather than masking the user-facing error.
5. Add a regression test or health/probe contract when the failure mode can recur.
6. Re-test in production after deployment.

## Output standard

For implementation work, keep status concise and evidence-based:

- What changed.
- Canonical source or trust boundary affected.
- Tests/build/deployment status.
- Production/runtime/authenticated QA status.
- Exact remaining blocker, if any.
- Current quality score only when evidence supports it.

Do not claim completion while a required gate is still pending.
