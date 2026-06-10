# MOTIL MVP - 5 MINUTE DEMO SCENARIO

## Demo Walkthrough: Equipment Breakdown → Complete Resolution

### SETUP (30 seconds)
**Real Equipment**: Compressor Unit #1 (Asset SIM-001)
- Current status: Operational
- Expected run time: 2 hours continuous
- Temperature: 72°C (normal)
- Vibration: 2.1 m/s² (normal)

---

## MINUTE 1: ALERT TRIGGERED (Equipment Emergency)

**Step 1**: Open `/dashboard/production` → **Sensor Alerts** widget shows:
- Equipment: SIM-001
- Temperature: **78°C** (CRITICAL - threshold exceeded)
- Vibration: **2.9 m/s²** (CRITICAL)
- Status: **🔴 ALERT**

**What happened**:
- Sensor API (`/api/production/sensors`) detected temp spike
- Auto-threshold triggered at 75°C
- System flagged as critical

---

## MINUTE 2: WORK ORDER AUTO-CREATED (Immediate Response)

**Step 2**: Trigger workflow at `/api/workflows/sensor-alert-to-ot` with:
```json
{
  "asset_id": "SIM-001",
  "alert_type": "high_temperature_alert",
  "sensor_data": { "temperature": 78, "vibration": 2.9 }
}
```

**System Response**:
- HSE alert created in database
- Work Order **WO-2026-0847** auto-generated
- Priority: HIGH
- Status: OPEN

**Visible in `/dashboard/mantenimiento`**:
- WO-2026-0847 appears in "New Work Orders"
- Red priority badge
- "Alert: high_temperature_alert"

---

## MINUTE 3: TECHNICIAN ASSIGNMENT + PARTS RESERVATION (Execution)

**Step 3A**: Assign technician in Mantención UI:
- Click WO-2026-0847
- Select "Assign to: Carlos (Tech Lead)"
- Status changes: OPEN → ASSIGNED

**Step 3B**: Reserve parts from Bodega:
1. Open `/dashboard/bodega` → **Inventory Dashboard**
2. Check available parts: Cooling Fan (5 units), Oil Filter (3 units)
3. In WO-2026-0847, click "Reserve Parts"
4. Select: Cooling Fan (1), Oil Filter (1)
5. Bodega stock updates: Cooling Fan 5→4 (reserved), Oil Filter 3→2 (reserved)

---

## MINUTE 4: MAINTENANCE + HSE CHECKLIST (In-Field Work)

**Step 4A**: Tech starts work:
- Status: ASSIGNED → IN_PROGRESS
- Actual duration starts: 0 min

**Step 4B**: HSE Checklist (Auto-loaded from equipment requirements):
- ✓ Safety goggles worn
- ✓ Gloves on
- ✓ Area secured
- **INCIDENT FOUND**: Oil spill detected (minor)

**Step 4C**: Log incident in HSE:
- POST `/api/hse/investigations`
- Type: Oil spill during maintenance
- Severity: MEDIUM
- Root cause: "Loose drain plug"
- Corrective action: "Tighten drain plug, replace seals"

---

## MINUTE 5: CLOSURE + KPI UPDATE (Resolution)

**Step 5A**: Mark work complete:
- Actual duration: 45 minutes
- Actual cost: $150 (parts + labor)
- Root cause: Thermostat malfunction
- Click "Close Work Order"

**Step 5B**: System auto-updates:
- Equipment status: OPERATIONAL
- MTTR recorded: 45 minutes
- Equipment availability: 98% (was 95%)
- KPI endpoint shows: Latest MTTR in dashboard

**Step 5C**: Audit trail complete:
- `/api/audit/log` shows full trail:
  1. Alert created
  2. OT generated
  3. Parts reserved (stock movement logged)
  4. HSE incident recorded
  5. Investigation documented
  6. Work completed (MTTR logged)

---

## POST-DEMO: COMPLIANCE VERIFICATION

**Step 6**: Auditor checks compliance:
- Go to `/dashboard/reportes`
- Export period: Last 24 hours
- Report type: "Audit Trail"
- Download CSV with full trail for equipment SIM-001

**CSV includes**:
- Alert timestamp
- OT number + technician
- Parts movement (from/to/quantity)
- HSE incident details
- Investigation RCA
- Closure timestamp
- KPI impact

---

## SUCCESS METRICS

✓ **Responsiveness**: Alert → OT in <5 seconds
✓ **Visibility**: Complete trail from alert to closure
✓ **Traceability**: All actions logged for compliance
✓ **Integration**: 5 modules working together (Sensor → Alert → OT → Bodega → HSE → Audit)
✓ **KPI Impact**: Equipment availability updated in real-time

---

## DEMO DATA POINTS

- Total pages: 80 (production-ready)
- Endpoints live: 25+ (CRUD + workflows)
- Database tables: 74 (all with RLS)
- User auth: Working (test@empresa.cl)
- Real integrations: Supabase + Vercel Blob

**Ready for Piloto Deployment** ✅
