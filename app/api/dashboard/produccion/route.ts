import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all equipment with their sensors
    const { data: equipment, error: eqError } = await supabase
      .from('equipment')
      .select('*')
      .order('created_at', { ascending: false });

    if (eqError) {
      console.error('[v0] Error fetching equipment:', eqError);
      return NextResponse.json({ error: eqError.message }, { status: 500 });
    }

    // Get sensors for each equipment
    const { data: sensors, error: sError } = await supabase
      .from('sensors')
      .select('*');

    if (sError) {
      console.error('[v0] Error fetching sensors:', sError);
      return NextResponse.json({ error: sError.message }, { status: 500 });
    }

    // Get latest readings
    const { data: readings, error: rError } = await supabase
      .from('sensor_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);

    if (rError) {
      console.error('[v0] Error fetching readings:', rError);
      return NextResponse.json({ error: rError.message }, { status: 500 });
    }

    // Get alarms
    const { data: alarms, error: aError } = await supabase
      .from('alarms')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (aError) {
      console.error('[v0] Error fetching alarms:', aError);
      return NextResponse.json({ error: aError.message }, { status: 500 });
    }

    return NextResponse.json({
      equipment: equipment || [],
      sensors: sensors || [],
      readings: readings || [],
      alarms: alarms || [],
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/produccion error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
