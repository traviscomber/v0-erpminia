export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const equipment_id = searchParams.get('equipment_id');

    // Mock sensor simulation data
    const alarms = [
      { id: '1', equipment_id, severity: 'warning', message: 'Temperature rising', value: 78, threshold: 80 },
      { id: '2', equipment_id, severity: 'critical', message: 'Pressure exceeded', value: 95, threshold: 90 },
    ];

    // Mock availability calculation
    const availability = Math.floor(Math.random() * 20) + 80; // 80-100%
    const mttr = Math.floor(Math.random() * 4) + 2; // 2-6 hours

    return NextResponse.json({
      equipment_id,
      availability_percentage: availability,
      mttr_hours: mttr,
      downtime_today: 24 - mttr,
      alarms: alarms.filter(a => a.equipment_id === equipment_id),
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch production data' }, { status: 500 });
  }
}
