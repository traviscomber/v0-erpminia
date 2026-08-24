export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type CanonicalAssetRow = {
  id: string;
  name: string | null;
  asset_type: string | null;
  operational_status: string | null;
};

type SensorRow = {
  id: string;
  sensor_type: string | null;
  unit: string | null;
  name: string | null;
};

type SensorReadingRow = {
  id: string;
  sensor_id: string | null;
  value: number | string | null;
  unit: string | null;
  status: string | null;
  timestamp: string | null;
  received_at: string | null;
};

type AlarmRow = {
  id: string;
  sensor_id: string | null;
  severity: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['offline', 'inactive', 'inactivo', 'fuera_servicio', 'fuera_de_servicio'].includes(normalized)) return 'alert';
  if (['maintenance', 'mantenimiento', 'mantencion', 'en_mantenimiento', 'en_mantencion'].includes(normalized)) return 'alert';
  return normalized ? 'normal' : 'unknown';
}

function latestBySensor(readings: SensorReadingRow[]) {
  const latest = new Map<string, SensorReadingRow>();
  for (const reading of readings) {
    if (reading.sensor_id && !latest.has(reading.sensor_id)) latest.set(reading.sensor_id, reading);
  }
  return latest;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES, false);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const resolvedParams = await params;
    const assetId = resolvedParams.id || new URL(request.url).searchParams.get('equipment_id');
    if (!assetId) return NextResponse.json({ error: 'equipment_id es requerido' }, { status: 400 });

    const { data: canonicalAsset, error: assetError } = await context.supabase
      .from('canonical_assets_current')
      .select('id,name,asset_type,operational_status')
      .eq('id', assetId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    if (assetError) return NextResponse.json({ error: assetError.message }, { status: 500 });
    if (!canonicalAsset) return NextResponse.json({ error: 'Equipo no encontrado para la organización' }, { status: 404 });

    const { data: sensors, error: sensorsError } = await context.supabase
      .from('sensors')
      .select('id, sensor_type, unit, name')
      .eq('organization_id', context.organizationId)
      .eq('canonical_asset_id', assetId)
      .order('name', { ascending: true });

    if (sensorsError) return NextResponse.json({ error: sensorsError.message }, { status: 500 });

    const sensorRows = Array.isArray(sensors) ? (sensors as SensorRow[]) : [];
    const sensorIds = sensorRows.map((sensor) => sensor.id);

    let readings: SensorReadingRow[] = [];
    let alarms: AlarmRow[] = [];

    if (sensorIds.length > 0) {
      const [readingResult, alarmResult] = await Promise.all([
        context.supabase
          .from('sensor_readings')
          .select('id, sensor_id, value, unit, status, timestamp, received_at')
          .eq('organization_id', context.organizationId)
          .in('sensor_id', sensorIds)
          .order('timestamp', { ascending: false })
          .limit(200),
        context.supabase
          .from('alarms')
          .select('id, sensor_id, severity, message, status, created_at')
          .in('sensor_id', sensorIds)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (readingResult.error) return NextResponse.json({ error: readingResult.error.message }, { status: 500 });
      readings = (readingResult.data || []) as SensorReadingRow[];
      alarms = (alarmResult.data || []) as AlarmRow[];
    }

    const activeAlarms = alarms.filter(
      (alarm) => !['resolved', 'resuelta', 'cerrada', 'closed'].includes(String(alarm.status || '').toLowerCase())
    );
    const asset = canonicalAsset as CanonicalAssetRow;
    const status = activeAlarms.length > 0 ? 'alert' : normalizeStatus(asset.operational_status);
    const latest = latestBySensor(readings);

    const byType = (tokens: string[]) => {
      const sensor = sensorRows.find((row) => {
        const value = `${row.sensor_type || ''} ${row.name || ''}`.toLowerCase();
        return tokens.some((token) => value.includes(token));
      });
      return sensor ? latest.get(sensor.id) || null : null;
    };

    const temperature = byType(['temperatura', 'temperature']);
    const pressure = byType(['presion', 'presión', 'pressure']);
    const vibration = byType(['vibracion', 'vibración', 'vibration']);
    const rpm = byType(['rpm', 'revolucion', 'revolución']);
    const newestReading = readings[0] || null;

    return NextResponse.json({
      equipment_id: assetId,
      equipment_name: asset.name || 'Equipo',
      equipment_type: asset.asset_type,
      status,
      availability_percentage: null,
      mttr_hours: null,
      downtime_today: null,
      metric_note: 'Disponibilidad, MTTR y detención no se estiman sin evidencia canónica.',
      sensor_data: {
        asset_id: assetId,
        temperature: toNumber(temperature?.value),
        pressure: toNumber(pressure?.value),
        vibration: toNumber(vibration?.value),
        rpm: toNumber(rpm?.value),
        status,
        timestamp: newestReading?.timestamp || newestReading?.received_at || null,
      },
      alarms: activeAlarms.map((alarm) => ({
        id: alarm.id,
        sensor_id: alarm.sensor_id,
        severity: alarm.severity || null,
        message: alarm.message || 'Alerta operacional',
        created_at: alarm.created_at,
      })),
      last_updated: newestReading?.timestamp || newestReading?.received_at || null,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
