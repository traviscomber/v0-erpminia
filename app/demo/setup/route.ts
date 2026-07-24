import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

    console.log('[Demo] Setting up Seguria Spa Demo...');

    // 1. Create organization
    const { error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: DEMO_ORG_ID,
        name: 'Seguria Spa Demo',
        slug: 'seguria-spa-demo',
      });

    if (orgError && !orgError.message.includes('duplicate')) {
      console.log('Org error:', orgError);
    }

    console.log('[Demo] ✓ Organization created');

    // 2. Create admin profile
    await supabase.from('profiles').insert({
      email: 'demo@seguria.tech',
      full_name: 'Demo Admin',
      role: 'admin',
      cargo: 'Jefe de Operaciones',
      organization_id: DEMO_ORG_ID,
      active: true,
    });

    // 3. Create technicians
    const techs = [
      { email: 'tech1@demo.tech', name: 'Técnico 1', cargo: 'Especialista' },
      { email: 'tech2@demo.tech', name: 'Técnico 2', cargo: 'Especialista' },
    ];

    await supabase.from('profiles').insert(
      techs.map(t => ({
        email: t.email,
        full_name: t.name,
        role: 'technician',
        cargo: t.cargo,
        organization_id: DEMO_ORG_ID,
        active: true,
      }))
    );

    // 4. Create equipment
    const equipmentNames = [
      'EX-001: Excavadora CAT 320',
      'EX-002: Cargador Frontal',
      'TR-001: Camión Tolva',
      'GN-001: Generador',
      'CP-001: Compresor',
    ];

    const { data: eqData } = await supabase
      .from('equipment')
      .insert(
        equipmentNames.map((name, i) => ({
          organization_id: DEMO_ORG_ID,
          code: name.split(':')[0],
          name: name,
          type: 'general',
          status: 'operational',
          location: 'Demo Site',
        }))
      )
      .select();

    console.log('[Demo] ✓ Equipment and all base data created');

    return NextResponse.json({
      ok: true,
      message: 'Demo setup complete',
      credentials: {
        email: 'demo@seguria.tech',
        password: 'seguria2026',
      },
    });
  } catch (error: any) {
    console.error('[Demo] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
