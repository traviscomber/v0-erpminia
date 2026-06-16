export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const asset_id = searchParams.get('asset_id');

    // Simulate sensor readings
    const temperature = 68 + Math.random() * 8; // 68-76°C
    const pressure = 45 + Math.random() * 5; // 45-50 PSI
    const vibration = 2.1 + Math.random() * 0.8; // 2.1-2.9 m/s²
    const rpm = 1200 + Math.random() * 50; // Normal operating range

    const sensor_data = {
      asset_id: asset_id || 'SIM-001',
      temperature: parseFloat(temperature.toFixed(2)),
      pressure: parseFloat(pressure.toFixed(2)),
      vibration: parseFloat(vibration.toFixed(2)),
      rpm: parseFloat(rpm.toFixed(0)),
      status: temperature > 75 || vibration > 2.8 ? 'alert' : 'normal',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ sensor_data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { asset_id, temperature, pressure, vibration, rpm } = await request.json();

    const { data, error } = await context.supabase
      .from('equipment_sensors')
      .insert([{
        organization_id: context.organizationId,
        asset_id,
        temperature,
        pressure,
        vibration,
        rpm,
        status: temperature > 75 || vibration > 2.8 ? 'alert' : 'normal',
        recorded_at: new Date().toISOString(),
      }])
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
