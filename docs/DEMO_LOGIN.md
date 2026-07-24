# Demo Organization Login Guide - Seguria Spa Demo

## Quick Start

### Demo Credentials
```
Email: demo@seguria.tech
Password: seguria2026
Organization: Seguria Spa Demo
```

### Setup Demo Data
If demo data hasn't been created yet, run:
```bash
curl -X POST http://localhost:3000/demo/setup
```

**Response:**
```json
{
  "ok": true,
  "message": "Demo setup complete",
  "credentials": {
    "email": "demo@seguria.tech",
    "password": "seguria2026"
  }
}
```

---

## What's Included in the Demo

### Demo Organization: "Seguria Spa Demo"
A complete fictional mining operation with realistic data suitable for client presentations.

### Demo Admin Account
- **Email**: demo@seguria.tech
- **Password**: seguria2026
- **Role**: Admin (full system access)
- **Access**: All modules, all features, all dashboards

### Demo Assets

#### 20 Mining Equipment
- Excavadoras (CAT 320, Volvo EC460, Hitachi)
- Cargadores Frontales (CAT 980, Komatsu)
- Camiones Tolva (Volvo, Scania, Hino)
- Motoniveladoras (CAT, Volvo)
- Perforadoras, Compresores, Generadores
- Plantas Chancadoras, Harneadores, Equipos Menores

**Status Distribution:**
- Operational: 18 equipment
- Downtime: 2 equipment

#### 8 Technicians
- Carlos Rodríguez - Especialista Excavadoras
- Juan Martínez - Especialista Cargadores
- Miguel López - Técnico Electromecanico
- Roberto Flores - Técnico Hidráulica
- Antonio Sánchez - Técnico Motores Diésel
- David Torres - Técnico Equipos Menores
- Fernando García - Supervisor Mantenimiento
- Guillermo Ramírez - Jefe Taller

#### 35 Work Orders (90-day history)
- Preventivo: 12 OT
- Correctivo: 10 OT
- Predictivo: 8 OT
- Neumatico Dañado: 5 OT

**Status Distribution:**
- Pending: 8 OT
- In Progress: 7 OT
- Completed: 15 OT
- Cancelled: 5 OT

**Priority Distribution:**
- Baja: 9 OT
- Normal: 12 OT
- Alta: 9 OT
- Crítica: 5 OT

#### 12 Tires (Neumaticos)
- Tire Code: TIRE-001 to TIRE-012
- Brand Mix: Michelin, Bridgestone, Goodyear
- Size: 23.5R25 (standard mining)
- Condition: Used (realistic wear patterns)

**Lifecycle Status:**
- In Stock: 3 tires
- Installed: 5 tires
- In Repair: 2 tires
- Waiting Repair: 2 tires

---

## FASE 1-4 Features Demonstrated

### FASE 1: Work Order Management
Login and visit:
- `/dashboard/mantenimiento/planificacion` - Create and manage work orders
- All 35 demo work orders are fully searchable, filterable
- Create new work orders, assign to demo technicians

### FASE 2: Equipment Alerts & Dashboard
- `/dashboard/mantenimiento/dashboard` - Equipment status overview
- Risk scoring for 20 equipment items
- Alert system showing downtime and critical equipment

### FASE 3: Tire Tracking & Generic Timer
- `/dashboard/mantenimiento/neumaticos/trazabilidad` - Tire inventory
- `/dashboard/mantenimiento/neumaticos/detalle/[id]` - Tire detail with history
- Play/Pause/Terminate timer on any work order (not just tires)
- Timer automatically tracks hours spent

### FASE 4: Analytics & Reporting
- `/dashboard/mantenimiento/reportes/general` - Main analytics dashboard
  - KPI Cards with live calculations
  - 30-day work order trends
  - Work type distribution

- `/dashboard/mantenimiento/reportes/equipos-criticos` - Equipment risk analysis
  - Top 20 at-risk equipment
  - Risk scoring visualization

- `/dashboard/mantenimiento/reportes/tecnicos` - Technician performance
  - Ranking and efficiency metrics
  - Leaderboard with top performers

- `/dashboard/mantenimiento/reportes/neumaticos` - Tire lifecycle analysis
  - Utilization metrics
  - Repair statistics
  - Most repaired tires

---

## Demo Workflow Example

### Scenario: Present equipment maintenance tracking to prospect

1. **Login** as `demo@seguria.tech / seguria2026`

2. **Show Work Order Management**
   - Navigate to Planning dashboard
   - Show 35 existing work orders
   - Create sample preventivo work order
   - Assign to "Carlos Rodríguez"

3. **Show Timer Functionality**
   - Open newly created WO
   - Click Play button
   - Show real-time timer counting
   - Pause to simulate lunch break
   - Resume to show accumulation
   - Terminate and show total hours logged

4. **Show Equipment Analytics**
   - Go to Equipment Risk dashboard
   - Show which equipment has most failures
   - Point out downtime equipment (EQ-006, EQ-013)
   - Show trend of when equipment needs maintenance

5. **Show Tire Tracking**
   - Navigate to Tire Traceability
   - Show 12 tires with different lifecycle states
   - Open a tire to see history
   - Point out installed vs waiting for repair

6. **Show Reports**
   - General dashboard: "Here's the health of the operation"
   - Equipment Critical: "Equipment at risk and priorities"
   - Technician Performance: "Team efficiency and ranking"
   - Tires: "Fleet utilization and repair cycles"

---

## Data Notes

- **All dates are realistic**: Work orders created over 90-day window
- **Technicians are properly assigned**: Each WO has a technician
- **Equipment is properly linked**: Each WO has equipment
- **No data is hardcoded**: All generated from database, not UI mock data
- **Fully functional**: All buttons work, all dashboards are live, all filters work

---

## Resetting Demo Data

To reset demo organization and start fresh:

1. In Supabase:
   - Go to SQL Editor
   - Run: `DELETE FROM organizations WHERE id = '550e8400-e29b-41d4-a716-446655440000'`
   - This cascades and deletes all related data

2. Then run setup again:
   ```bash
   curl -X POST http://localhost:3000/demo/setup
   ```

---

## Presentation Tips

1. **Keep it high-level**: Focus on the workflow, not the data details
2. **Use real scenarios**: "Your technicians can track time like this..."
3. **Show responsiveness**: "Works on desktop and mobile"
4. **Highlight integrations**: "All data flows to analytics automatically"
5. **Ask questions**: "Does your team need this feature?" or "How would you use this?"

---

## For Developers

All demo setup code is in:
- `/app/demo/setup/route.ts` - Setup endpoint
- `/migrations/20260724_demo_organization.sql` - Manual SQL migration (if needed)

The setup is idempotent - you can run it multiple times without duplicating data.
