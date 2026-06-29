export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type EquipmentRow = {
  id: string;
  name: string | null;
  type: string | null;
  status: string | null;
};

type MaintenanceAssetRow = {
  id: string;
  asset_name: string | null;
  asset_type: string | null;
  status: string | null;
};

type SensorRow = {
  id: string;
  equipment_id: string | null;
  sensor_type: string | null;
  unit: string | null;
  name: string | null;
};

type SensorReadingRow = {
  id: string;
  sensor_id: string | null;
  equipment_id: string | null;
  timestamp: string | null;
  created_at: string | null;
  received_at: string | null;
  value: number | string | null;
  temperature: number | string | null;
  pressure: number | string | null;
  vibration: number | string | null;
  rpm: number | string | null;
};

type AlarmRow = {
  id: string;
  equipment_id: string | null;
  severity: string | null;
  message: string | null;
  description: string | null;
  created_at: string | null;
  timestamp: string | null;
  acknowledged_at: string | null;
  status: string | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeTime(value: string | null) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeStatus(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['offline', 'inactive', 'inactivo', 'fuera_servicio', 'fuera_de_servicio'].includes(normalized)) return 'alert';
  if (['maintenance', 'mantenimiento', 'mantencion', 'en_mantenimiento', 'en_mantencion'].includes(normalized)) return 'alert';
  return 'normal';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const resolvedParams = await params;
    const equipmentId = resolvedParams.id || new URL(request.url).searchParams.get('equipment_id');
    if (!equipmentId) {
      return NextResponse.json({ error: 'equipment_id es requerido' }, { status: 400 });
    }

    const { data: equipment } = await context.supabase
      .from('equipment')
      .select('id, name, type, status')
      .eq('id', equipmentId)
      .maybeSingle();

    const { data: maintenanceAsset } = await context.supabase
      .from('maintenance_assets')
      .select('id, asset_name, asset_type, status')
      .eq('id', equipmentId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    const { data: sensors } = await context.supabase
      .from('sensors')
      .select('id, equipment_id, sensor_type, unit, name')
      .eq('equipment_id', equipmentId)
      .order('name', { ascending: true });

    const sensorRows = Array.isArray(sensors) ? (sensors as SensorRow[]) : [];
    const sensorIds = sensorRows.map((sensor) => sensor.id);
    const { data: directReadings } = await context.supabase
      .from('sensor_readings')
      .select('id, sensor_id, equipment_id, timestamp, created_at, received_at, value, temperature, pressure, vibration, rpm')
      .eq('equipment_id', equipmentId)
      .order('timestamp', { ascending: false })
      .limit(50);

    const readings =
      directReadings && directReadings.length > 0
        ? (directReadings as SensorReadingRow[])
        : sensorIds.length > 0
          ? (
              (await context.supabase
                .from('sensor_readings')
                .select('id, sensor_id, equipment_id, timestamp, created_at, received_at, value, temperature, pressure, vibration, rpm')
                .in('sensor_id', sensorIds)
                .order('timestamp', { ascending: false })
                .limit(50)).data || []
            )
          : [];

    const { data: alarms } = await context.supabase
      .from('alarms')
      .select('id, equipment_id, severity, message, description, created_at, timestamp, acknowledged_at, status')
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false })
      .limit(20);

    const latestReading = (readings || [])[0] || null;
    const temperature = toNumber(latestReading?.temperature ?? latestReading?.value);
    const pressure = toNumber(latestReading?.pressure);
    const vibration = toNumber(latestReading?.vibration);
    const rpm = toNumber(latestReading?.rpm);
    const alarmRows = Array.isArray(alarms) ? (alarms as AlarmRow[]) : [];
    const activeAlarms = alarmRows.filter(
      (alarm) => !['resolved', 'resuelta', 'cerrada', 'closed'].includes(String(alarm.status || '').toLowerCase())
    );

    const equipmentRow = equipment as EquipmentRow | null;
    const maintenanceAssetRow = maintenanceAsset as MaintenanceAssetRow | null;
    const status = activeAlarms.length > 0 ? 'alert' : normalizeStatus(equipmentRow?.status || maintenanceAssetRow?.status);
    const availability_percentage =
      status === 'alert' ? Math.max(60, 90 - activeAlarms.length * 5) : status === 'normal' ? 96 : 0;
    const mttr_hours = activeAlarms.length > 0 ? Math.min(24, 2 + activeAlarms.length * 1.5) : 0;

    return NextResponse.json({
      equipment_id: equipmentId,
      equipment_name: equipmentRow?.name || maintenanceAssetRow?.asset_name || 'Equipo',
      status,
      availability_percentage,
      mttr_hours,
      downtime_today: Math.max(0, Math.round(mttr_hours)),
      sensor_data: {
        asset_id: equipmentId,
        temperature,
        pressure,
        vibration,
        rpm,
        status,
        timestamp: safeTime(latestReading?.timestamp || latestReading?.created_at || latestReading?.received_at),
      },
      alarms: activeAlarms.map((alarm) => ({
        id: alarm.id,
        equipment_id: alarm.equipment_id,
        severity: alarm.severity || 'medium',
        message: alarm.message || alarm.description || 'Alerta operacional',
        description: alarm.description || alarm.message || '',
        created_at: alarm.created_at || alarm.timestamp || new Date().toISOString(),
      })),
      last_updated: safeTime(latestReading?.timestamp || latestReading?.created_at || latestReading?.received_at),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
