import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

// Work order types and statuses
const WO_TYPES = ['preventivo', 'correctivo', 'predictivo', 'neumatico_dañado'];
const WO_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES = ['baja', 'normal', 'alta', 'critica'];

async function seedDemoData() {
  console.log('[Demo] Starting demo data seed for Seguria Spa Demo...\n');

  try {
    // Get all equipment and technicians
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, equipment_code')
      .eq('organization_id', DEMO_ORG_ID);

    const { data: technicians } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', DEMO_ORG_ID)
      .eq('role', 'technician');

    console.log(`[Demo] Found ${equipment?.length} equipment items`);
    console.log(`[Demo] Found ${technicians?.length} technicians\n`);

    // Generate 35 work orders with 90-day history
    console.log('[Demo] Generating 35 work orders (90-day history)...');
    const workOrders = [];
    const now = new Date();

    for (let i = 0; i < 35; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const eq = equipment![Math.floor(Math.random() * equipment!.length)];
      const tech = technicians![Math.floor(Math.random() * technicians!.length)];
      const status = WO_STATUSES[Math.floor(Math.random() * WO_STATUSES.length)];
      const type = WO_TYPES[Math.floor(Math.random() * WO_TYPES.length)];
      const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];

      let completionDate = null;
      let timerMinutes = 0;

      if (status === 'completed') {
        completionDate = new Date(createdAt);
        completionDate.setHours(completionDate.getHours() + Math.floor(Math.random() * 48));
        timerMinutes = Math.floor(Math.random() * 480) + 120; // 2-10 hours
      } else if (status === 'in_progress') {
        timerMinutes = Math.floor(Math.random() * 240) + 60; // 1-5 hours
      }

      const wo = {
        id: uuidv4(),
        organization_id: DEMO_ORG_ID,
        equipment_id: eq.id,
        assigned_technician_id: tech.id,
        work_type: type,
        priority,
        title: `${type.toUpperCase()} - ${eq.equipment_code}`,
        description: `Mantenimiento ${type} programado para equipo ${eq.equipment_code}. Inspección rutinaria y ajustes necesarios.`,
        status,
        scheduled_date: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
        completion_date: completionDate,
        total_timer_minutes: timerMinutes,
        timer_status: status === 'in_progress' ? 'running' : 'stopped',
        created_at: createdAt,
        updated_at: completionDate || createdAt,
      };

      workOrders.push(wo);
    }

    const { error: woError } = await supabase
      .from('maintenance_work_orders')
      .insert(workOrders);

    if (woError) {
      console.error('[Demo] Error inserting work orders:', woError);
    } else {
      console.log(`[Demo] ✓ Created 35 work orders`);
    }

    // Generate 12 tires
    console.log('[Demo] Generating 12 tires with lifecycle...');
    const tires = [];
    const tireStatuses = ['in_stock', 'installed', 'in_repair', 'waiting_repair'];

    for (let i = 1; i <= 12; i++) {
      const tireStatus = tireStatuses[Math.floor(Math.random() * tireStatuses.length)];
      const tire = {
        id: uuidv4(),
        organization_id: DEMO_ORG_ID,
        tire_code: `TIRE-${String(i).padStart(3, '0')}`,
        tire_name: `Neumatico ${i}`,
        size: '23.5R25',
        brand: ['Michelin', 'Bridgestone', 'Goodyear'][Math.floor(Math.random() * 3)],
        model: 'XRD',
        serial_number: `SN${Date.now()}${i}`,
        condition: 'used',
        purchase_date: new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
        purchase_price: 2500,
        supplier: 'Proveedora Neumaticos Chile',
        expected_lifespan_hours: 5000,
        current_lifecycle_status: tireStatus,
        current_location: tireStatus === 'in_stock' ? 'Bodega' : 'Cancha',
        installed_on_equipment: tireStatus === 'installed' ? `EQ-${String(i % 20 + 1).padStart(3, '0')}` : null,
        repair_count: Math.floor(Math.random() * 5),
        total_hours_used: Math.floor(Math.random() * 3000) + 1000,
        created_at: new Date(),
        updated_at: new Date(),
      };
      tires.push(tire);
    }

    const { error: tireError } = await supabase
      .from('tire_master')
      .insert(tires);

    if (tireError) {
      console.error('[Demo] Error inserting tires:', tireError);
    } else {
      console.log(`[Demo] ✓ Created 12 tires with realistic lifecycle`);
    }

    // Generate tire events
    console.log('[Demo] Generating tire events (50 total)...');
    const { data: createdTires } = await supabase
      .from('tire_master')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID);

    const tireEvents = [];
    const eventTypes = ['registered', 'installed', 'damaged', 'repaired', 'reinstalled', 'transferred'];

    for (let i = 0; i < 50; i++) {
      const tire = createdTires![Math.floor(Math.random() * createdTires!.length)];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const daysAgo = Math.floor(Math.random() * 90);

      const event = {
        id: uuidv4(),
        organization_id: DEMO_ORG_ID,
        tire_id: tire.id,
        event_type: eventType,
        event_timestamp: new Date(new Date().setDate(new Date().getDate() - daysAgo)),
        created_by: technicians![Math.floor(Math.random() * technicians!.length)].full_name,
        location: ['Bodega', 'Faena', 'Taller', 'Transporte'][Math.floor(Math.random() * 4)],
        notes: `Evento de ${eventType} registrado`,
        status_before: tireStatuses[Math.floor(Math.random() * tireStatuses.length)],
        status_after: tireStatuses[Math.floor(Math.random() * tireStatuses.length)],
        created_at: new Date(),
      };
      tireEvents.push(event);
    }

    const { error: eventError } = await supabase
      .from('tire_events')
      .insert(tireEvents);

    if (eventError) {
      console.error('[Demo] Error inserting tire events:', eventError);
    } else {
      console.log(`[Demo] ✓ Created 50 tire events with complete history`);
    }

    console.log('\n[Demo] ✓ Demo data seed completed successfully!');
    console.log('[Demo] All FASE 1-4 features are now operational with realistic demo data.');
    console.log('[Demo] Login with: demo@seguria.tech / seguria2026');
  } catch (error) {
    console.error('[Demo] Fatal error:', error);
    process.exit(1);
  }
}

seedDemoData();
