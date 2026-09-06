# MOTIL Maintenance Intelligence — target architecture

## Objective
Make Maintenance a decision-intelligence system, not only a CMMS. The operating model is:

Canonical maintenance data -> operational/condition evidence -> failure hypotheses -> prioritized next action -> human validation -> outcome learning.

## Current production baseline
- Canonical assets, work orders, preventive schedules, runtime evidence, materials, external services, costs, reliability and drilling-origin maintenance reviews already exist.
- Imported historical work orders are explicitly read-only and separated from Motil operations.
- The control center already prioritizes out-of-service reviews, overdue preventive work, operational blockers, pending procedures, closure evidence and reliability recurrence.

## Product standard
Maintenance must compete with leading CMMS/APM products by adding a stronger operational reasoning layer on top of the transactional core.

### 1. Maintenance Evidence Graph
Every recommendation must expose the source evidence: asset, operating state, runtime/horometer, work-order history, failure/root cause, preventive schedule, standard job plan, materials, procurement, labor, external services, costs and relevant production/drilling observations.

### 2. Failure & Reliability Hypotheses
A hypothesis is a review object, never a fact. Lifecycle:
`detected -> in_review -> supported/rejected -> closed`.
Store evidence for, evidence against, missing evidence, owner, reviewer comment and full audit trail.

### 3. Next Best Maintenance Action
Prioritize the action that most reduces operational risk or unlocks execution. Priority must be explainable and based on evidence such as out-of-service state, overdue maintenance, criticality, recurring cause, pending material/service dependency and closure readiness.
The priority score is an operational heuristic, not a probability of failure and not an autonomous maintenance decision.

### 4. Condition Intelligence
Progress from calendar/hour preventive work toward condition-informed maintenance when evidence exists. Accept vibration, temperature, current, pressure, oil analysis, alarms and other telemetry through explicit source adapters. Missing telemetry must remain missing; never synthesize condition signals.

### 5. Senior Maintenance Assistant
The assistant must answer from tenant-scoped canonical data and clearly separate:
- DATO CANONICO
- INTERPRETACION PROFESIONAL
- HIPOTESIS A REVISAR
- EVIDENCIA A FAVOR / EN CONTRA
- DATO FALTANTE
- RECOMENDACION / PROXIMA ACCION

The assistant may propose work, but operational mutations remain explicit user actions with existing role checks.

### 6. Learning Loop
Capture `suggestion -> human decision -> executed action -> result` so Motil can learn which interventions actually reduced recurrence, downtime, cost or repeat failure. Human correction remains authoritative.

## Immediate implementation order
1. Maintenance Decision Matrix over existing canonical evidence.
2. Senior Maintenance Assistant grounded in that matrix and existing operational sources.
3. Failure/reliability hypothesis review workflow.
4. Next Best Maintenance Action with explainable prioritization.
5. Condition/telemetry adapters and anomaly/condition evidence.
6. Outcome-learning loop and strategy feedback.

## Guardrails
- AI never closes, approves, cancels or creates operational work silently.
- Historical imported records remain read-only evidence.
- Model confidence is never displayed as physical probability of failure unless a validated statistical model explicitly supports that interpretation.
- Predictions must expose provenance, contrary evidence and missing evidence.
- Safety-critical and high-cost interventions require human validation.
