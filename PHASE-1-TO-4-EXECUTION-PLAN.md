# PHASE 1-4 EXECUTION PLAN: Cheap Ship to 65-70% MVP
## Focus: Real CRUD, Database Ops, Integration Loop
## Constraint: Minimize UI polish, maximize functionality

---

## PHASE 1: Mantención CRUD (12-15 hours)
**Goal**: Full work order lifecycle: Create → Assign → Reserve Parts → Close

### Sprint 1A: Work Order Creation (3-4h)
- [ ] POST /api/maintenance/work-orders - Create OT from equipment alert
- [ ] WorkOrderForm component - Basic form (no fancy UI)
- [ ] Database: maintenance_work_orders insert with auto-numbering
- [ ] Validation: Required fields (equipment, description, priority)
- [ ] Success: Form creates OT, assigns number, stores in DB

### Sprint 1B: OT Assignment & Status (3-4h)
- [ ] PATCH /api/maintenance/work-orders/:id/assign - Assign to technician
- [ ] Status workflow: pending → assigned → in-progress → completed → closed
- [ ] database updates with who/when/duration
- [ ] UI: Tab showing all OTs with status badges
- [ ] Quick actions: Edit, complete, close, view details

### Sprint 1C: Parts Reservation (3-4h)
- [ ] Link OT to warehouse stock (order_wear_parts table)
- [ ] POST /api/maintenance/work-orders/:id/reserve-parts
- [ ] Reduce available stock, create movement log
- [ ] UI: Show reserved parts on OT detail
- [ ] Bodega integration ready for Phase 2

### Sprint 1D: OT Closure & KPIs (3-4h)
- [ ] Complete OT: Record actual_duration, actual_cost, root_cause
- [ ] Auto-calculate MTTR, downtime impact
- [ ] Store evidence attachment paths (file_url)
- [ ] Generate KPI update: equipment_availability table
- [ ] Dashboard: Show completed OTs, KPI trends

**Acceptance**: Can create OT → assign tech → reserve parts → close OT → see impact on production KPIs

---

## PHASE 2: Bodega Integration (10-12 hours)
**Goal**: Parts inventory connected to maintenance orders

### Sprint 2A: Stock Visibility (3-4h)
- [ ] GET /api/bodega/stock - Real stock levels from warehouse_stock
- [ ] Parts status: available, reserved, ordered, low-stock
- [ ] QR code linking (qr_codes table) optional for later
- [ ] UI: Stock grid with part code, quantity, reorder level, bin location

### Sprint 2B: Part Movement (3-4h)
- [ ] POST /api/bodega/movement - Issue parts from OT
- [ ] stock_movements table: log who/what/when/where
- [ ] Reduce warehouse_stock.quantity_on_hand
- [ ] Reverse operation: Return unused parts
- [ ] Audit trail: All movements logged

### Sprint 2C: Low Stock Alerts (2-3h)
- [ ] Trigger reorder_alerts when stock < reorder_level
- [ ] Email/webhook to purchasing (API ready, execution in Phase 4)
- [ ] Dashboard warning: Low stock items needing order

### Sprint 2D: Bodega Module Landing (2-3h)
- [ ] Bodega page shows all stock with real data
- [ ] Add/Edit/Delete parts (CRUD complete)
- [ ] Transfers between bins
- [ ] Export stock report (CSV)

**Acceptance**: Parts flow from warehouse to OT to installation, stock stays accurate, alerts trigger automatically

---

## PHASE 3: HSE Integration (10-12 hours)
**Goal**: Safety checklist embedded in OT lifecycle

### Sprint 3A: HSE Checklist in OT (3-4h)
- [ ] equipment_hse_requirements linked to asset_id
- [ ] OT form: Auto-load HSE requirements (PPE, training, inspection)
- [ ] Checklist: Tech confirms compliance before starting work
- [ ] Store evidence: Photo, signature, timestamp

### Sprint 3B: Incident Logging from OT (3-4h)
- [ ] OT closure: Tech can log incidents found during maintenance
- [ ] incidents table: Link to equipment, OT, maintenance_order_id
- [ ] severity classification (near-miss, recordable, lost-time)
- [ ] Auto-trigger investigation if severity >= high

### Sprint 3C: Corrective Actions (2-3h)
- [ ] incident_investigations table: RCA template
- [ ] corrective_actions: Track action, owner, deadline, verification
- [ ] Link back to equipment: Prevent repeat issues

### Sprint 3D: HSE Dashboard (2-3h)
- [ ] Incidents by equipment, by month, by severity
- [ ] Investigations: Open, closed, overdue
- [ ] KPI: Days since last incident, frequency, severity trend
- [ ] Compliance alerts: Training due, inspection past-due

**Acceptance**: Tech can log HSE issue → investigation → corrective action → verify → close, all auditable

---

## PHASE 4: Audit Log & Export (8-10 hours)
**Goal**: Complete traceability + stakeholder reporting

### Sprint 4A: Audit Log Foundation (2-3h)
- [ ] Trigger function: Log every CRUD on OT, parts, HSE, incidents
- [ ] document_audit_log table: user_id, action, before/after JSON, timestamp
- [ ] API middleware: Capture context (IP, session, organization)
- [ ] Query API: GET /api/audit-log filtered by table, date, user

### Sprint 4B: OT Export (2-3h)
- [ ] Generate PDF: OT details + parts used + HSE checklist + evidence
- [ ] Include KPI impact: Downtime, cost, availability
- [ ] Export to email, S3, or download

### Sprint 4C: Compliance Report (2-3h)
- [ ] Monthly: All incidents, investigations, corrective actions
- [ ] Status: Open, closed, overdue, follow-up
- [ ] Metrics: Frequency, severity, avg closure time
- [ ] Export as PDF for auditor

### Sprint 4D: Stakeholder Dashboard (1-2h)
- [ ] Gerencia view: KPIs only, no technical details
- [ ] Bodega view: Stock levels, reorders, suppliers
- [ ] HSE view: Incidents, KPIs, compliance status
- [ ] Mobile preview: Tech can see OT status in field

**Acceptance**: Auditor can pull full trail for any OT. Gerencia sees impact. Compliance metrics automated.

---

## PHASE 5: Production Simulated (12-14 hours)
**Goal**: Demo realistic equipment operation + sensor data

### Sprint 5A: Sensor Simulation (3-4h)
- [ ] Mock sensor API: Simulate equipment telemetry
- [ ] sensor_readings: Store simulated temp, vibration, load
- [ ] alarms table: Trigger when sensor exceeds threshold
- [ ] Alert → OT auto-creation: Real workflow demo

### Sprint 5B: Equipment Dashboard (3-4h)
- [ ] Real-time KPI: Availability %, downtime hours, MTTR
- [ ] Sensor chart: Last 24h readings with alarm zones
- [ ] Status: Running, idle, alarm, maintenance
- [ ] Predictive: Next maintenance window prediction

### Sprint 5C: Mobile-First OT (3-4h)
- [ ] Tech assignment: Mobile-optimized OT list + detail
- [ ] Check-in: GPS location, time started, equipment photo
- [ ] Parts picker: QR scan parts from bin, confirm in mobile app
- [ ] Evidence: Photo + signature capture

### Sprint 5D: End-to-End Demo (2-3h)
- [ ] Scenario: Equipment alarm → OT created → Tech assigned → Parts reserved → HSE checklist → Close → KPI updated
- [ ] Live dashboard shows all changes real-time
- [ ] Audit log shows complete trail
- [ ] Export compliance report showing everything

**Acceptance**: Walk into a mine, show complete workflow on 1 equipment over 5 minutes. All data flows correctly.

---

## TOKEN OPTIMIZATION RULES
- ❌ NO UI animations, transitions, or polish
- ❌ NO new components unless functional necessity
- ❌ NO refactoring existing code
- ✅ Reuse existing shadcn components
- ✅ Use mock data where database queries are slow
- ✅ Copy-paste code patterns (DRY is nice, speed is critical)
- ✅ Minimal error handling (basic try-catch)
- ✅ No complex state management (use SWR for caching)

## DEPLOYMENT CHECKPOINTS
- **After Phase 1**: Can create & close OTs, KPIs update
- **After Phase 2**: OT reserves parts, inventory flows
- **After Phase 3**: HSE integrated, incidents logged
- **After Phase 4**: Full audit trail, export ready
- **After Phase 5**: Production demo ready for investor

## TOTAL EFFORT
- Phase 1: 12-15h
- Phase 2: 10-12h
- Phase 3: 10-12h
- Phase 4: 8-10h
- Phase 5: 12-14h
- **Total**: 52-63h (cheaper than estimated 66-82h)

## EXPECTED RESULT
**65-70% operational MVP** with:
- Real CRUD on 3 core modules
- Integrated workflows (OT → Parts → HSE → Audit)
- Production-quality database operations
- Auditable trail for compliance
- Piloto-ready demo scenario
