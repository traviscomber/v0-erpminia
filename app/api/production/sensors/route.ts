export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type SensorRow = {
  id: string;
  equipment_id: string | null;
  sensor_type: string | null;
  unit: string | null;
  name: string | null;
};

type ReadingRow = {
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

type EquipmentSensorPayload = {
  asset_id?: string | null;
  temperature?: number | string | null;
  pressure?: number | string | null;
  vibration?: number | string | null;
  rpm?: number | string | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatusFromReadings(
  temperature: number | null,
  vibration: number | null,
  activeAlarmCount: number,
  equipmentStatus?: string | null
) {
  const status = String(equipmentStatus || '').toLowerCase();

  if (['offline', 'inactive', 'inactivo', 'fuera_servicio', 'fuera_de_servicio'].includes(status)) {
    return 'alert';
  }

  if ((temperature !== null && temperature > 75) || (vibration !== null && vibration > 2.8)) {
    return 'alert';
  }

  if (activeAlarmCount > 0) {
    return 'alert';
  }

  return 'normal';
}

function safeTime(value: string | null) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function buildSensorSummary(readings: ReadingRow[], sensorsById: Map<string, SensorRow>) {
  let temperature: number | null = null;
  let pressure: number | null = null;
  let vibration: number | null = null;
  let rpm: number | null = null;
  let lastTimestamp: string | null = null;

  for (const reading of readings) {
    const sensor = reading.sensor_id ? sensorsById.get(reading.sensor_id) : undefined;
    const sensorType = String(sensor?.sensor_type || '').toLowerCase();
    const timestamp = reading.timestamp || reading.created_at || reading.received_at;
    if (!lastTimestamp || (timestamp && new Date(timestamp).getTime() > new Date(lastTimestamp).getTime())) {
      lastTimestamp = timestamp || lastTimestamp;
    }

    const directTemperature = toNumber(reading.temperature);
    const directPressure = toNumber(reading.pressure);
    const directVibration = toNumber(reading.vibration);
    const directRpm = toNumber(reading.rpm);

    if (directTemperature !== null) temperature = directTemperature;
    if (directPressure !== null) pressure = directPressure;
    if (directVibration !== null) vibration = directVibration;
    if (directRpm !== null) rpm = directRpm;

    if (sensorType.includes('temp') && toNumber(reading.value) !== null) temperature = toNumber(reading.value);
    if (sensorType.includes('press') && toNumber(reading.value) !== null) pressure = toNumber(reading.value);
    if (sensorType.includes('vib') && toNumber(reading.value) !== null) vibration = toNumber(reading.value);
    if (sensorType.includes('rpm') && toNumber(reading.value) !== null) rpm = toNumber(reading.value);
  }

  return {
    temperature,
    pressure,
    vibration,
    rpm,
    timestamp: safeTime(lastTimestamp),
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const equipmentId =
      searchParams.get('equipment_id') ||
      searchParams.get('asset_id') ||
      searchParams.get('equipmentId');

    if (!equipmentId) {
      return NextResponse.json({ error: 'equipment_id es requerido', sensor_data: null, alarms: [] }, { status: 400 });
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

    const sensorRows = (sensors || []) as SensorRow[];
    const sensorIds = sensorRows.map((sensor) => sensor.id);

    const { data: directReadings } = await context.supabase
      .from('sensor_readings')
      .select('id, sensor_id, equipment_id, timestamp, created_at, received_at, value, temperature, pressure, vibration, rpm')
      .eq('equipment_id', equipmentId)
      .order('timestamp', { ascending: false })
      .limit(50);

    const readings = (directReadings || []) as ReadingRow[];

    const sensorReadings =
      readings.length > 0
        ? readings
        : sensorIds.length > 0
        ? ((await context.supabase
            .from('sensor_readings')
            .select('id, sensor_id, equipment_id, timestamp, created_at, received_at, value, temperature, pressure, vibration, rpm')
            .in('sensor_id', sensorIds)
            .order('timestamp', { ascending: false })
            .limit(50)).data || []) as ReadingRow[]
        : [];

    const sensorsById = new Map(sensorRows.map((sensor) => [sensor.id, sensor] as const));
    const sensorSummary = buildSensorSummary(sensorReadings, sensorsById);

    const { data: alarms } = await context.supabase
      .from('alarms')
      .select('id, equipment_id, severity, message, description, created_at, timestamp, acknowledged_at, status')
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false })
      .limit(20);

    const alarmRows = Array.isArray(alarms) ? (alarms as AlarmRow[]) : [];
    const activeAlarms = alarmRows.filter(
      (alarm) => !['resolved', 'resuelta', 'cerrada', 'closed'].includes(String(alarm.status || '').toLowerCase())
    );

    const currentStatus = normalizeStatusFromReadings(
      sensorSummary.temperature,
      sensorSummary.vibration,
      activeAlarms.length,
      equipment?.status || maintenanceAsset?.status
    );

    const availability =
      currentStatus === 'alert'
        ? Math.max(60, 90 - activeAlarms.length * 5)
        : currentStatus === 'normal'
        ? 96
        : 0;

    return NextResponse.json({
      equipment_id: equipmentId,
      equipment_name: equipment?.name || maintenanceAsset?.asset_name || 'Equipo',
      sensor_data: {
        asset_id: equipmentId,
        temperature: sensorSummary.temperature,
        pressure: sensorSummary.pressure,
        vibration: sensorSummary.vibration,
        rpm: sensorSummary.rpm,
        status: currentStatus,
        timestamp: sensorSummary.timestamp,
      },
      availability_percentage: availability,
      alarms: activeAlarms.map((alarm) => ({
        id: alarm.id,
        equipment_id: alarm.equipment_id,
        severity: alarm.severity || 'medium',
        message: alarm.message || alarm.description || 'Alerta operacional',
        description: alarm.description || alarm.message || '',
        created_at: alarm.created_at || alarm.timestamp || new Date().toISOString(),
      })),
      last_updated: sensorSummary.timestamp,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = (await request.json()) as EquipmentSensorPayload;
    const assetId = body.asset_id || null;
    const temperature = toNumber(body.temperature);
    const pressure = toNumber(body.pressure);
    const vibration = toNumber(body.vibration);
    const rpm = toNumber(body.rpm);

    const { data, error } = await context.supabase
      .from('equipment_sensors')
      .insert([
        {
          organization_id: context.organizationId,
          asset_id: assetId,
          temperature,
          pressure,
          vibration,
          rpm,
          status: (temperature !== null && temperature > 75) || (vibration !== null && vibration > 2.8) ? 'alert' : 'normal',
          recorded_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
