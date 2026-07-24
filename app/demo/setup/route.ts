import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

    console.log('[Demo] Setting up Seguria Spa Demo...');

    const DEMO_PASSWORD_HASH = await bcrypt.hash('seguria2026', 12);

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

    // 2. Create admin user in Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'demo@seguria.tech',
      password: 'seguria2026',
      email_confirm: true,
    });

    if (authError) {
      console.log('[Demo] Auth user might exist already:', authError.message);
    } else {
      console.log('[Demo] ✓ Auth user created');
    }

    const userId = authUser?.user?.id || 'demo-user-id';

    // 3. Create admin profile with password_hash
    await supabase.from('profiles').upsert({
      id: userId,
      email: 'demo@seguria.tech',
      full_name: 'Demo Admin - Seguria Spa Demo',
      role: 'admin',
      status: 'active',
      organization_id: DEMO_ORG_ID,
      password_hash: DEMO_PASSWORD_HASH,
    }, { onConflict: 'email' });

    // 4. Create technicians in Auth and Profiles
    const techs = [
      { email: 'tech1@demo.tech', name: 'Técnico 1', cargo: 'Especialista' },
      { email: 'tech2@demo.tech', name: 'Técnico 2', cargo: 'Especialista' },
    ];

    const techProfiles = [];
    for (const t of techs) {
      const { data: techUser } = await supabase.auth.admin.createUser({
        email: t.email,
        password: 'seguria2026',
        email_confirm: true,
      });

      if (techUser?.user?.id) {
        techProfiles.push({
          id: techUser.user.id,
          email: t.email,
          full_name: t.name,
          role: 'technician',
          cargo: t.cargo,
          organization_id: DEMO_ORG_ID,
          active: true,
        });
      }
    }

    if (techProfiles.length > 0) {
      await supabase.from('profiles').insert(techProfiles);
    }

    // 5. Create equipment
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
