import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type SensorLike = {
  id: string;
  equipment_id?: string | null;
  sensor_type?: string | null;
  unit?: string | null;
  name?: string | null;
};

type ReadingLike = {
  id: string;
  sensor_id?: string | null;
  equipment_id?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  received_at?: string | null;
  value?: number | string | null;
  temperature?: number | string | null;
  pressure?: number | string | null;
  vibration?: number | string | null;
};

type ChartReading = {
  id: string;
  equipment_id?: string | null;
  timestamp: string;
  temperature: number | null;
  pressure: number | null;
  vibration: number | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEquipmentStatus(status?: string | null) {
  const value = String(status || '').trim().toLowerCase();

  if (
    ['operational', 'operativo', 'operativa', 'active', 'activo', 'activa', 'running'].includes(
      value
    )
  ) {
    return 'operational';
  }

  if (['warning', 'alarma', 'alerta'].includes(value)) {
    return 'warning';
  }

  if (
    ['maintenance', 'mantencion', 'mantenimiento', 'en_mantencion', 'en_mantenimiento'].includes(
      value
    )
  ) {
    return 'maintenance';
  }

  if (
    ['offline', 'inactive', 'inactivo', 'fuera_servicio', 'fuera_de_servicio', 'parado'].includes(
      value
    )
  ) {
    return 'offline';
  }

  return 'warning';
}

function normalizeAlarmSeverity(severity?: string | null) {
  const value = String(severity || '').toLowerCase();
  if (value.includes('crit')) return 'critical';
  if (value.includes('high') || value.includes('alta')) return 'critical';
  if (value.includes('alarm')) return 'critical';
  if (value.includes('media') || value.includes('warning')) return 'warning';
  return 'warning';
}

function isActiveAlarm(status?: string | null) {
  const value = String(status || '').toLowerCase();
  if (!value) return true;
  return !['resolved', 'resuelta', 'cerrada', 'closed'].includes(value);
}

function safeTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function safeBucket(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 16);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes()
  ).toISOString();
}

function deriveAvailabilityFromStatus(status?: string | null, fallbackOpenIssues = 0) {
  const normalized = normalizeEquipmentStatus(status);

  if (normalized === 'offline') return 0;
  if (normalized === 'maintenance') return 76;
  if (normalized === 'warning') return Math.max(65, 88 - fallbackOpenIssues * 4);

  return Math.max(72, 96 - fallbackOpenIssues * 3);
}

async function safeQuery<T>(fn: () => Promise<{ data: T | null; error: unknown }>, fallback: T) {
  try {
    const result = await fn();
    if (result.error) return fallback;
    return (result.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

async function querySensorReadings(
  context: Awaited<ReturnType<typeof getOrganizationContext>>,
  sensorIds: string[]
) {
  if (!context.ok || sensorIds.length === 0) return [] as any[];

  const byTimestamp = await safeQuery(
    () =>
      context.supabase
        .from('sensor_readings')
        .select('*')
        .in('sensor_id', sensorIds)
        .order('timestamp', { ascending: false })
        .limit(250),
    [] as any[]
  );

  if (byTimestamp.length > 0) return byTimestamp;

  return safeQuery(
    () =>
      context.supabase
        .from('sensor_readings')
        .select('*')
        .in('sensor_id', sensorIds)
        .order('received_at', { ascending: false })
        .limit(250),
    [] as any[]
  );
}

function buildChartReadings(readings: ReadingLike[], sensorsById: Map<string, SensorLike>) {
  const grouped = new Map<string, ChartReading>();

  for (const reading of readings) {
    const sensor = reading.sensor_id ? sensorsById.get(reading.sensor_id) : undefined;
    const sensorType = String(sensor?.sensor_type || '').toLowerCase();
    const equipmentId = reading.equipment_id || sensor?.equipment_id || null;
    const timestamp = reading.timestamp || reading.created_at || reading.received_at || new Date().toISOString();
    const bucket = `${equipmentId || 'general'}:${safeBucket(timestamp)}`;
    const current = grouped.get(bucket) || {
      id: bucket,
      equipment_id: equipmentId,
      timestamp,
      temperature: null,
      pressure: null,
      vibration: null,
    };

    const directTemperature = toNumber(reading.temperature);
    const directPressure = toNumber(reading.pressure);
    const directVibration = toNumber(reading.vibration);

    if (directTemperature !== null) current.temperature = directTemperature;
    if (directPressure !== null) current.pressure = directPressure;
    if (directVibration !== null) current.vibration = directVibration;

    if (sensorType.includes('temp')) current.temperature = toNumber(reading.value);
    if (sensorType.includes('press')) current.pressure = toNumber(reading.value);
    if (sensorType.includes('vib')) current.vibration = toNumber(reading.value);

    grouped.set(bucket, current);
  }

  return Array.from(grouped.values())
    .filter((item) => item.temperature !== null || item.pressure !== null || item.vibration !== null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-20);
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [productionEquipment, maintenanceAssets, workOrders, detenciones] = await Promise.all([
      safeQuery(
        () => context.supabase.from('equipment').select('*').order('name', { ascending: true }),
        [] as any[]
      ),
      safeQuery(
        () =>
          context.supabase
            .from('maintenance_assets')
            .select('*')
            .eq('organization_id', context.organizationId)
            .order('asset_name', { ascending: true }),
        [] as any[]
      ),
      safeQuery(
        () =>
          context.supabase
            .from('maintenance_work_orders')
            .select('*')
            .eq('organization_id', context.organizationId)
            .in('status', ['open', 'in_progress'])
            .order('created_at', { ascending: false }),
        [] as any[]
      ),
      safeQuery(
        () =>
          context.supabase
            .from('detenciones')
            .select('*')
            .order('start_time', { ascending: false })
            .limit(100),
        [] as any[]
      ),
    ]);

    const productionEquipmentIds = productionEquipment.map((item) => item.id).filter(Boolean);

    const [sensors, rawReadings, rawAlarms, availabilityRows] = await Promise.all([
      productionEquipmentIds.length > 0
        ? safeQuery(
            () =>
              context.supabase
                .from('sensors')
                .select('*')
                .in('equipment_id', productionEquipmentIds)
                .order('name', { ascending: true }),
            [] as any[]
          )
        : Promise.resolve([] as any[]),
      productionEquipmentIds.length > 0
        ? Promise.resolve([] as any[]) // populated below after sensors resolve
        : safeQuery(
            () =>
              context.supabase
                .from('sensor_readings')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(100),
            [] as any[]
          ),
      productionEquipmentIds.length > 0
        ? safeQuery(
            () =>
              context.supabase
                .from('alarms')
                .select('*')
                .in('equipment_id', productionEquipmentIds)
                .order('created_at', { ascending: false })
                .limit(50),
            [] as any[]
          )
        : safeQuery(
            () =>
              context.supabase
                .from('alarms')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20),
            [] as any[]
          ),
      productionEquipmentIds.length > 0
        ? safeQuery(
            () =>
              context.supabase
                .from('equipment_availability')
                .select('*')
                .in('equipment_id', productionEquipmentIds)
                .order('date', { ascending: false }),
            [] as any[]
          )
        : Promise.resolve([] as any[]),
    ]);

    const readings =
      productionEquipmentIds.length > 0
        ? await querySensorReadings(
            context,
            sensors.map((sensor) => sensor.id).filter(Boolean)
          )
        : rawReadings;

    const sensorsById = new Map<string, SensorLike>(
      sensors.map((sensor) => [sensor.id, sensor] as const)
    );

    const equipmentRows =
      productionEquipment.length > 0
        ? productionEquipment.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type || 'equipo',
            status: item.status,
            location: item.location || null,
            criticality: item.criticality || 'media',
            source: 'production',
          }))
        : maintenanceAssets.map((item) => ({
            id: item.id,
            name: item.asset_name,
            type: item.asset_type || 'activo',
            status: item.status,
            location: item.location || null,
            criticality: item.criticality || 'media',
            source: 'maintenance',
          }));

    const liveAlarms = rawAlarms.filter((alarm) => isActiveAlarm(alarm.status));

    const alarmsByEquipment = new Map<string, any[]>();
    for (const alarm of liveAlarms) {
      const equipmentId = alarm.equipment_id;
      if (!equipmentId) continue;
      const current = alarmsByEquipment.get(equipmentId) || [];
      current.push(alarm);
      alarmsByEquipment.set(equipmentId, current);
    }

    const workOrdersByAsset = new Map<string, any[]>();
    for (const workOrder of workOrders) {
      if (!workOrder.asset_id) continue;
      const current = workOrdersByAsset.get(workOrder.asset_id) || [];
      current.push(workOrder);
      workOrdersByAsset.set(workOrder.asset_id, current);
    }

    const availabilityByEquipment = new Map<string, any>();
    for (const row of availabilityRows) {
      if (!row.equipment_id || availabilityByEquipment.has(row.equipment_id)) continue;
      availabilityByEquipment.set(row.equipment_id, row);
    }

    const latestReadingsByEquipment = new Map<string, ChartReading>();
    for (const reading of buildChartReadings(readings, sensorsById)) {
      if (!reading.equipment_id) continue;
      latestReadingsByEquipment.set(reading.equipment_id, reading);
    }

    const equipment = equipmentRows.map((item) => {
      const activeAlarms = alarmsByEquipment.get(item.id) || [];
      const activeWorkOrders = workOrdersByAsset.get(item.id) || [];
      const latestReading = latestReadingsByEquipment.get(item.id);
      const availabilityRow = availabilityByEquipment.get(item.id);
      const baseStatus = normalizeEquipmentStatus(item.status);
      const status =
        activeAlarms.some((alarm) => normalizeAlarmSeverity(alarm.severity) === 'critical')
          ? 'warning'
          : baseStatus;
      const availability =
        toNumber(availabilityRow?.availability_percentage) ??
        deriveAvailabilityFromStatus(item.status, activeWorkOrders.length + activeAlarms.length);

      return {
        id: item.id,
        name: item.name,
        type: item.type,
        status,
        availability,
        temperature: latestReading?.temperature ?? null,
        pressure: latestReading?.pressure ?? null,
        vibration: latestReading?.vibration ?? null,
        alarms: activeAlarms.length || activeWorkOrders.length,
        location: item.location,
        criticality: item.criticality,
        source: item.source,
      };
    });

    const alarms =
      liveAlarms.length > 0
        ? liveAlarms.map((alarm) => ({
            id: alarm.id,
            severity: normalizeAlarmSeverity(alarm.severity),
            equipment:
              equipmentRows.find((item) => item.id === alarm.equipment_id)?.name ||
              alarm.equipment_name ||
              alarm.title ||
              'Equipo',
            message: alarm.message || alarm.description || 'Alerta operacional',
            time: safeTime(alarm.created_at || alarm.timestamp),
            description: alarm.description || alarm.message || '',
          }))
        : workOrders
            .filter((item) => ['critical', 'high'].includes(String(item.priority || '').toLowerCase()))
            .slice(0, 10)
            .map((item) => ({
              id: item.id,
              severity: item.priority === 'critical' ? 'critical' : 'warning',
              equipment:
                maintenanceAssets.find((asset) => asset.id === item.asset_id)?.asset_name || 'Equipo',
              message: item.title,
              time: safeTime(item.created_at),
              description: item.description || 'Orden prioritaria en curso',
            }));

    const chartReadings = buildChartReadings(readings, sensorsById);
    const totalEquipment = equipment.length;
    const operationalEquipment = equipment.filter((item) => item.status === 'operational').length;
    const averageAvailability = totalEquipment
      ? Math.round(
          (equipment.reduce((sum, item) => sum + (toNumber(item.availability) || 0), 0) / totalEquipment) * 10
        ) / 10
      : 0;
    const downtimeMinutes =
      detenciones.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0) +
      Math.round(workOrders.reduce((sum, item) => sum + Number(item.down_time_hours || 0) * 60, 0));
    const criticalAlarms = alarms.filter((alarm) => alarm.severity === 'critical').length;

    return NextResponse.json(
      {
        equipment,
        sensors,
        readings: chartReadings,
        alarms,
        summary: {
          total_equipment: totalEquipment,
          operational_equipment: operationalEquipment,
          availability_percentage: averageAvailability,
          active_alarms: alarms.length,
          critical_alarms: criticalAlarms,
          production_today: null,
          production_target_percentage: null,
          downtime_minutes: downtimeMinutes,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch production data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
