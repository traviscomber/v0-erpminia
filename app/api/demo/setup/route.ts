import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Use service role key for setup (bypass auth)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

    console.log('[Demo] Setting up Seguria Spa Demo organization...');

    // 1. Create demo organization
    const { error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: DEMO_ORG_ID,
        name: 'Seguria Spa Demo',
        rut: '76123456-7',
        address: 'Calle Demo 1234, Oficina 500',
        city: 'Santiago',
        region: 'Metropolitana',
        country: 'Chile',
        phone: '+56 2 2345 6789',
        email: 'demo@seguria.tech',
        industry: 'mining',
      })
      .select()
      .single();

    if (orgError && !orgError.message.includes('duplicate')) {
      console.error('Org error:', orgError);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    console.log('[Demo] ✓ Organization created');

    // 2. Create demo user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        email: 'demo@seguria.tech',
        full_name: 'Demo Admin Seguria',
        role: 'admin',
        cargo: 'Jefe de Operaciones',
        phone: '+56 9 8765 4321',
        organization_id: DEMO_ORG_ID,
        active: true,
      });

    if (profileError && !profileError.message.includes('duplicate')) {
      console.log('Profile error:', profileError);
    }

    console.log('[Demo] ✓ Admin user profile created');

    // 3. Create 8 demo technicians
    const technicianNames = [
      { email: 'tecnico1@seguria.tech', name: 'Carlos Rodríguez', cargo: 'Técnico Especialista Excavadoras' },
      { email: 'tecnico2@seguria.tech', name: 'Juan Martínez', cargo: 'Técnico Especialista Cargadores' },
      { email: 'tecnico3@seguria.tech', name: 'Miguel López', cargo: 'Técnico Electromecanico' },
      { email: 'tecnico4@seguria.tech', name: 'Roberto Flores', cargo: 'Técnico Hidráulica' },
      { email: 'tecnico5@seguria.tech', name: 'Antonio Sánchez', cargo: 'Técnico Motores Diésel' },
      { email: 'tecnico6@seguria.tech', name: 'David Torres', cargo: 'Técnico Equipos Menores' },
      { email: 'tecnico7@seguria.tech', name: 'Fernando García', cargo: 'Supervisor Mantenimiento' },
      { email: 'tecnico8@seguria.tech', name: 'Guillermo Ramírez', cargo: 'Jefe Taller' },
    ];

    const { error: techError } = await supabase
      .from('profiles')
      .insert(
        technicianNames.map((t) => ({
          email: t.email,
          full_name: t.name,
          role: t.email.includes('tecnico7') || t.email.includes('tecnico8') ? 'supervisor' : 'technician',
          cargo: t.cargo,
          phone: `+56 9 ${Math.floor(Math.random() * 10000000)}`,
          organization_id: DEMO_ORG_ID,
          active: true,
        }))
      );

    if (techError && !techError.message.includes('duplicate')) {
      console.log('Tech error:', techError);
    }

    console.log('[Demo] ✓ 8 technicians created');

    // 4. Create 20 demo equipment
    const equipmentData = [
      { code: 'EQ-001', name: 'Excavadora CAT 320', type: 'excavadora' },
      { code: 'EQ-002', name: 'Excavadora Volvo EC460', type: 'excavadora' },
      { code: 'EQ-003', name: 'Cargador frontal CAT 980', type: 'cargador_frontal' },
      { code: 'EQ-004', name: 'Cargador frontal Komatsu', type: 'cargador_frontal' },
      { code: 'EQ-005', name: 'Camión Tolva Volvo FH16', type: 'camion_tolva' },
      { code: 'EQ-006', name: 'Camión Tolva Scania R440', type: 'camion_tolva' },
      { code: 'EQ-007', name: 'Motoniveladora CAT 16', type: 'motoniveladora' },
      { code: 'EQ-008', name: 'Motoniveladora Volvo G990', type: 'motoniveladora' },
      { code: 'EQ-009', name: 'Perforadora Atlas Copco', type: 'perforadora' },
      { code: 'EQ-010', name: 'Compresor Sullair', type: 'compresor' },
      { code: 'EQ-011', name: 'Planta Chancadora Metso', type: 'planta_chancadora' },
      { code: 'EQ-012', name: 'Harnero Vibrador', type: 'harnero' },
      { code: 'EQ-013', name: 'Bomba de Agua LS', type: 'bomba_agua' },
      { code: 'EQ-014', name: 'Generador Diesel CAT', type: 'generador' },
      { code: 'EQ-015', name: 'Compresor Atlas Copco', type: 'compresor' },
      { code: 'EQ-016', name: 'Excavadora Hitachi', type: 'excavadora' },
      { code: 'EQ-017', name: 'Bulldozer CAT D10', type: 'bulldozer' },
      { code: 'EQ-018', name: 'Camión Tolva Hino', type: 'camion_tolva' },
      { code: 'EQ-019', name: 'Planta Trituradora', type: 'trituradora' },
      { code: 'EQ-020', name: 'Sistema Ventilación', type: 'ventilador' },
    ];

    const { error: eqError } = await supabase
      .from('equipment')
      .insert(
        equipmentData.map((eq) => ({
          organization_id: DEMO_ORG_ID,
          code: eq.code,
          name: eq.name,
          type: eq.type,
          status: Math.random() > 0.1 ? 'operational' : 'downtime',
          location: 'Demo Site',
          operational_hours: Math.random() * 8000,
        }))
      );

    if (eqError && !eqError.message.includes('duplicate')) {
      console.log('Equipment error:', eqError);
    }

    console.log('[Demo] ✓ 20 equipment items created');

    // Get equipment and technicians for WO and tire generation
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, code')
      .eq('organization_id', DEMO_ORG_ID);

    const { data: technicians } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID)
      .eq('role', 'technician');

    if (!equipment?.length || !technicians?.length) {
      console.log('[Demo] Missing setup data');
      return NextResponse.json({ error: 'Setup incomplete' }, { status: 500 });
    }

    // 5. Create 35 work orders
    const WO_TYPES = ['preventivo', 'correctivo', 'predictivo'];
    const WO_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
    const PRIORITIES = ['baja', 'normal', 'alta', 'critica'];

    const workOrders = [];
    const now = new Date();

    for (let i = 0; i < 35; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const eq = equipment[Math.floor(Math.random() * equipment.length)];
      const tech = technicians[Math.floor(Math.random() * technicians.length)];
      const status = WO_STATUSES[Math.floor(Math.random() * 4)];
      const type = WO_TYPES[Math.floor(Math.random() * 3)];
      const priority = PRIORITIES[Math.floor(Math.random() * 4)];

      let timerMinutes = 0;
      if (status === 'completed') timerMinutes = Math.floor(Math.random() * 480) + 120;
      else if (status === 'in_progress') timerMinutes = Math.floor(Math.random() * 240) + 60;

      workOrders.push({
        organization_id: DEMO_ORG_ID,
        equipment_id: eq.id,
        assigned_technician_id: tech.id,
        work_type: type,
        priority,
        title: `${type} - ${eq.code}`,
        description: `Mantenimiento ${type} programado`,
        status,
        scheduled_date: new Date(createdAt.getTime() + 86400000),
        total_timer_minutes: timerMinutes,
        timer_status: status === 'in_progress' ? 'running' : 'stopped',
      });
    }

    const { error: woError } = await supabase
      .from('maintenance_work_orders')
      .insert(workOrders);

    if (woError) console.log('WO error:', woError);
    else console.log('[Demo] ✓ 35 work orders created');

    // 6. Create 12 tires
    const tireStatuses = ['in_stock', 'installed', 'in_repair', 'waiting_repair'];
    const brands = ['Michelin', 'Bridgestone', 'Goodyear'];
    const tires = [];

    for (let i = 1; i <= 12; i++) {
      tires.push({
        organization_id: DEMO_ORG_ID,
        tire_code: `TIRE-${String(i).padStart(3, '0')}`,
        tire_name: `Neumatico Demo ${i}`,
        size: '23.5R25',
        brand: brands[Math.floor(Math.random() * 3)],
        model: 'XRD',
        current_lifecycle_status: tireStatuses[Math.floor(Math.random() * 4)],
        current_location: 'Demo',
        repair_count: Math.floor(Math.random() * 5),
        total_hours_used: Math.floor(Math.random() * 3000) + 1000,
      });
    }

    const { error: tireError } = await supabase
      .from('tire_master')
      .insert(tires);

    if (tireError) console.log('Tire error:', tireError);
    else console.log('[Demo] ✓ 12 tires created');

    console.log('[Demo] ✓ Setup complete!');

    return NextResponse.json({
      ok: true,
      message: 'Demo setup complete!',
      credentials: {
        email: 'demo@seguria.tech',
        password: 'seguria2026',
        organization: 'Seguria Spa Demo',
      },
    });
  } catch (error: any) {
    console.error('[Demo] Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
