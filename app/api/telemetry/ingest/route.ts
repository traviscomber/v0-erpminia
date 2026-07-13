export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type TelemetryReadingPayload = {
  equipment_id?: string;
  equipment_code?: string;
  asset_code?: string;
  equipment_name?: string;
  sensor_id?: string;
  sensor_type?: string;
  unit?: string;
  value?: number | string;
  temperature?: number | string;
  pressure?: number | string;
  vibration?: number | string;
  rpm?: number | string;
  status?: 'normal' | 'alert';
  severity?: string;
  message?: string;
  description?: string;
  source_machine?: string;
  timestamp?: string;
};

type TelemetryPayload = TelemetryReadingPayload & {
  dry_run?: boolean;
  validate_only?: boolean;
  readings?: TelemetryReadingPayload[];
};

type ValidatedReading = {
  index: number;
  equipment_id: string;
  equipment_name: string;
  status: string;
  timestamp: string;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(status: unknown) {
  const value = String(status || '').toLowerCase();
  if (['alert', 'alarma', 'critical', 'critico', 'critica', 'crítica', 'alto'].includes(value)) return 'alert';
  return 'normal';
}

function normalizeSeverity(value: unknown) {
  const status = String(value || '').toLowerCase();
  if (['critical', 'critico', 'critica', 'high', 'alta'].includes(status)) return 'critical';
  if (['medium', 'media', 'warning'].includes(status)) return 'warning';
  return 'warning';
}

function pickToken(request: NextRequest) {
  const headerToken =
    request.headers.get('x-telemetry-token') ||
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  return headerToken || '';
}

async function resolveTargetEquipment(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  payload: TelemetryReadingPayload
) {
  const equipmentId = String(payload.equipment_id || '').trim();
  const equipmentCode = String(payload.equipment_code || payload.asset_code || '').trim();
  const equipmentName = String(payload.equipment_name || '').trim();

  if (equipmentId) {
    const { data: assetById } = await supabase
      .from('maintenance_assets')
      .select('id, asset_name, asset_code, status, organization_id')
      .eq('id', equipmentId)
      .maybeSingle();
    if (assetById) {
      return {
        id: assetById.id,
        name: assetById.asset_name || equipmentName || equipmentId,
        status: assetById.status || 'active',
        organizationId: assetById.organization_id || null,
      };
    }

    const { data: byId } = await supabase.from('equipment').select('id, name, type, status').eq('id', equipmentId).maybeSingle();
    if (byId) return { id: byId.id, name: byId.name || equipmentName || equipmentId, status: byId.status || 'operational' };
  }

  if (equipmentCode) {
    const { data: assetByCode } = await supabase
      .from('maintenance_assets')
      .select('id, asset_name, asset_code, status, organization_id')
      .or(`asset_code.eq.${equipmentCode},asset_name.eq.${equipmentCode}`)
      .maybeSingle();
    if (assetByCode) {
      return {
        id: assetByCode.id,
        name: assetByCode.asset_name || equipmentName || equipmentCode,
        status: assetByCode.status || 'active',
        organizationId: assetByCode.organization_id || null,
      };
    }

    const { data: eqByName } = await supabase.from('equipment').select('id, name, type, status').or(`name.eq.${equipmentCode}`).maybeSingle();
    if (eqByName) {
      return { id: eqByName.id, name: eqByName.name || equipmentCode, status: eqByName.status || 'operational' };
    }
  }

  return null;
}

function buildReadingList(payload: TelemetryPayload) {
  if (Array.isArray(payload.readings) && payload.readings.length > 0) {
    return payload.readings;
  }

  const { readings: _readings, ...singleReading } = payload;
  return [singleReading];
}

function isDryRun(payload: TelemetryPayload, request: NextRequest) {
  const searchValue = request.nextUrl.searchParams.get('dry_run') || request.nextUrl.searchParams.get('validate_only');
  const queryFlag = searchValue === '1' || searchValue === 'true';
  return Boolean(payload.dry_run || payload.validate_only || queryFlag);
}

function hasDestination(reading: TelemetryReadingPayload) {
  return Boolean(
    String(reading.equipment_id || '').trim() ||
      String(reading.equipment_code || '').trim() ||
      String(reading.asset_code || '').trim() ||
      String(reading.equipment_name || '').trim()
  );
}

function hasSignalData(reading: TelemetryReadingPayload) {
  return (
    toNumber(reading.value) !== null ||
    toNumber(reading.temperature) !== null ||
    toNumber(reading.pressure) !== null ||
    toNumber(reading.vibration) !== null ||
    toNumber(reading.rpm) !== null ||
    Boolean(String(reading.status || '').trim()) ||
    Boolean(String(reading.message || '').trim()) ||
    Boolean(String(reading.description || '').trim())
  );
}

export async function GET() {
  const configured = Boolean(process.env.TELEMETRY_INGEST_TOKEN);

  return NextResponse.json({
    configured,
    endpoint: '/api/telemetry/ingest',
    method: 'POST',
    required_header: 'x-telemetry-token',
    supports_dry_run: true,
    accepted_payload: ['equipment_id', 'equipment_code', 'sensor_id', 'temperature', 'pressure', 'vibration', 'rpm', 'status', 'readings[]'],
    example: {
      equipment_id: 'eq-123',
      temperature: 72.4,
      pressure: 81.2,
      vibration: 1.8,
      rpm: 1480,
      status: 'normal',
      source_machine: 'patagua-gateway-01',
    },
  });
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.TELEMETRY_INGEST_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: 'Telemetry ingest no configurado' }, { status: 503 });
  }

  const token = pickToken(request);
  if (!token || token !== expectedToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let payload: TelemetryPayload;
  try {
    payload = (await request.json()) as TelemetryPayload;
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const readings = buildReadingList(payload);
  const dryRun = isDryRun(payload, request);
  const defaultTarget = await resolveTargetEquipment(supabase, payload);
  const inserted: Array<{ equipment_id: string; equipment_name: string; status: string; timestamp: string }> = [];
  const validated: ValidatedReading[] = [];
  const errors: string[] = [];
  let alarmCount = 0;

  if (readings.length === 0) {
    return NextResponse.json({ error: 'No se recibieron lecturas' }, { status: 400 });
  }

  for (const [index, reading] of readings.entries()) {
    if (!hasDestination(reading) && !defaultTarget) {
      errors.push(`Lectura ${index + 1}: falta equipment_id, equipment_code, asset_code o equipment_name`);
      continue;
    }

    if (!hasSignalData(reading)) {
      errors.push(`Lectura ${index + 1}: falta al menos una senal o estado para procesar`);
      continue;
    }

    const target = (await resolveTargetEquipment(supabase, reading)) || defaultTarget;
    if (!target) {
      errors.push(
        `Lectura ${index + 1}: no se pudo resolver el equipo destino para ${reading.equipment_id || reading.equipment_code || reading.asset_code || reading.equipment_name || 'lectura'}`
      );
      continue;
    }

    const timestamp =
      reading.timestamp && !Number.isNaN(new Date(reading.timestamp).getTime())
        ? new Date(reading.timestamp).toISOString()
        : new Date().toISOString();
    const status = normalizeStatus(reading.status || payload.status);
    const severity = normalizeSeverity(reading.severity || status);
    const message =
      reading.message ||
      reading.description ||
      payload.message ||
      payload.description ||
      `Lectura ${status === 'alert' ? 'critica' : 'normal'} recibida desde ${reading.source_machine || payload.source_machine || 'gateway'}`;

    validated.push({
      index,
      equipment_id: target.id,
      equipment_name: target.name,
      status,
      timestamp,
    });

    if (dryRun) {
      inserted.push({
        equipment_id: target.id,
        equipment_name: target.name,
        status,
        timestamp,
      });
      continue;
    }

    const { error: readingError } = await supabase.from('sensor_readings').insert([
      {
        sensor_id: reading.sensor_id || null,
        equipment_id: target.id,
        timestamp,
        created_at: timestamp,
        received_at: timestamp,
        value: toNumber(reading.value),
        temperature: toNumber(reading.temperature),
        pressure: toNumber(reading.pressure),
        vibration: toNumber(reading.vibration),
        rpm: toNumber(reading.rpm),
      },
    ]);

    if (readingError) {
      errors.push(readingError.message);
      continue;
    }

    if (status === 'alert') {
      const { error: alarmError } = await supabase.from('alarms').insert([
        {
          equipment_id: target.id,
          severity,
          status: 'active',
          message,
          description: message,
          created_at: timestamp,
          timestamp,
        },
      ]);

      if (!alarmError) alarmCount += 1;
    }

    inserted.push({
      equipment_id: target.id,
      equipment_name: target.name,
      status,
      timestamp,
    });
  }

  if (inserted.length === 0) {
    return NextResponse.json(
      {
        error: errors[0] || 'No se pudo resolver el equipo destino',
        errors,
      },
      { status: errors.some((error) => error.includes('destino')) ? 404 : 500 }
    );
  }

  return NextResponse.json({
    success: true,
    dry_run: dryRun,
    batch: inserted.length > 1,
    ingested_count: inserted.length,
    validated_count: validated.length,
    alarm_count: alarmCount,
    equipment_id: inserted[0]?.equipment_id || null,
    equipment_name: inserted[0]?.equipment_name || null,
    status: inserted[0]?.status || 'normal',
    timestamp: inserted[inserted.length - 1]?.timestamp || new Date().toISOString(),
    validated,
    errors,
  });
}
