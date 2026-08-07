export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type ReadingPayload = {
  sensor_id?: string;
  sensor_code?: string;
  value?: number | string;
  unit?: string;
  timestamp?: string;
};

type Payload = ReadingPayload & {
  dry_run?: boolean;
  validate_only?: boolean;
  readings?: ReadingPayload[];
};

type Condition = {
  condition_type: 'below_min' | 'above_max' | 'alarm_threshold' | 'critical_threshold';
  severity: 'warning' | 'critical';
  threshold_value: number;
} | null;

function text(value: unknown) { return String(value ?? '').trim(); }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function tokenFrom(request: NextRequest) { return request.headers.get('x-telemetry-token') || request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''; }
function readingsFrom(payload: Payload) { return Array.isArray(payload.readings) && payload.readings.length ? payload.readings : [{ sensor_id: payload.sensor_id, sensor_code: payload.sensor_code, value: payload.value, unit: payload.unit, timestamp: payload.timestamp }]; }
function dryRunFrom(payload: Payload, request: NextRequest) { const q = request.nextUrl.searchParams.get('dry_run') || request.nextUrl.searchParams.get('validate_only'); return Boolean(payload.dry_run || payload.validate_only || q === '1' || q === 'true'); }

function conditionFor(sensor: any, value: number): Condition {
  const critical = number(sensor.critical_threshold);
  const alarm = number(sensor.alarm_threshold);
  const max = number(sensor.max_threshold);
  const min = number(sensor.min_threshold);
  if (critical !== null && value >= critical) return { condition_type: 'critical_threshold', severity: 'critical', threshold_value: critical };
  if (alarm !== null && value >= alarm) return { condition_type: 'alarm_threshold', severity: 'warning', threshold_value: alarm };
  if (max !== null && value > max) return { condition_type: 'above_max', severity: 'warning', threshold_value: max };
  if (min !== null && value < min) return { condition_type: 'below_min', severity: 'warning', threshold_value: min };
  return null;
}

async function resolveSensor(supabase: ReturnType<typeof getSupabaseServerClient>, reading: ReadingPayload) {
  const sensorId = text(reading.sensor_id);
  const sensorCode = text(reading.sensor_code);
  const fields = 'id, equipment_id, sensor_code, name, type, unit, min_threshold, max_threshold, alarm_threshold, critical_threshold, status, organization_id, canonical_asset_id';
  if (sensorId) {
    const { data } = await supabase.from('sensors').select(fields).eq('id', sensorId).maybeSingle();
    return data || null;
  }
  if (sensorCode) {
    const { data } = await supabase.from('sensors').select(fields).eq('sensor_code', sensorCode).limit(2);
    if (!data || data.length !== 1) return null;
    return data[0];
  }
  return null;
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.TELEMETRY_INGEST_TOKEN),
    endpoint: '/api/telemetry/ingest', method: 'POST', required_header: 'x-telemetry-token', supports_dry_run: true,
    accepted_payload: ['sensor_id', 'sensor_code', 'value', 'unit', 'timestamp', 'readings[]'],
    rule: 'El sensor debe existir y su equipo debe estar vinculado previamente a un equipo canónico. Los umbrales configurados en el sensor determinan la condición.',
  });
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.TELEMETRY_INGEST_TOKEN;
  if (!expectedToken) return NextResponse.json({ error: 'Recepción de telemetría no configurada.' }, { status: 503 });
  if (tokenFrom(request) !== expectedToken) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const payload = await request.json().catch(() => null) as Payload | null;
  if (!payload) return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  const readings = readingsFrom(payload);
  if (!readings.length) return NextResponse.json({ error: 'No se recibieron lecturas.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const dryRun = dryRunFrom(payload, request);
  const results: any[] = [];
  const errors: string[] = [];

  for (const [index, reading] of readings.entries()) {
    const value = number(reading.value);
    if (value === null) { errors.push(`Lectura ${index + 1}: falta un valor numérico.`); continue; }
    const sensor = await resolveSensor(supabase, reading);
    if (!sensor) { errors.push(`Lectura ${index + 1}: sensor no encontrado o código ambiguo.`); continue; }
    if (!sensor.equipment_id) { errors.push(`Lectura ${index + 1}: el sensor no tiene equipo asociado.`); continue; }

    const { data: link } = await supabase.from('telemetry_asset_links').select('organization_id, legacy_equipment_id, canonical_asset_id').eq('legacy_equipment_id', sensor.equipment_id).maybeSingle();
    if (!link) { errors.push(`Lectura ${index + 1}: el equipo del sensor aún no está vinculado a un equipo canónico.`); continue; }
    if (sensor.organization_id && sensor.organization_id !== link.organization_id) { errors.push(`Lectura ${index + 1}: la pertenencia organizacional del sensor no coincide con su vinculación.`); continue; }

    const timestamp = reading.timestamp && !Number.isNaN(new Date(reading.timestamp).getTime()) ? new Date(reading.timestamp).toISOString() : new Date().toISOString();
    const condition = conditionFor(sensor, value);
    const status = condition?.severity || 'normal';
    const unit = text(reading.unit) || sensor.unit || null;

    if (dryRun) {
      results.push({ sensor_id: sensor.id, sensor_code: sensor.sensor_code, value, unit, timestamp, canonical_asset_id: link.canonical_asset_id, status, condition });
      continue;
    }

    const { data: inserted, error: readingError } = await supabase.from('sensor_readings').insert({ sensor_id: sensor.id, value, unit, status, timestamp, received_at: new Date().toISOString(), organization_id: link.organization_id, canonical_asset_id: link.canonical_asset_id }).select('id').single();
    if (readingError || !inserted) { errors.push(`Lectura ${index + 1}: no se pudo guardar la lectura.`); continue; }

    await supabase.from('sensors').update({ last_reading: value, last_reading_at: timestamp, organization_id: link.organization_id, canonical_asset_id: link.canonical_asset_id, updated_at: new Date().toISOString() }).eq('id', sensor.id);

    let eventId: string | null = null;
    if (condition) {
      const { data: event, error: eventError } = await supabase.from('telemetry_condition_events').insert({ organization_id: link.organization_id, sensor_id: sensor.id, reading_id: inserted.id, legacy_equipment_id: sensor.equipment_id, canonical_asset_id: link.canonical_asset_id, condition_type: condition.condition_type, severity: condition.severity, observed_value: value, threshold_value: condition.threshold_value, unit, event_at: timestamp, status: 'open' }).select('id').single();
      if (eventError) errors.push(`Lectura ${index + 1}: se guardó la lectura, pero no pudo registrarse su condición.`);
      eventId = event?.id || null;
    }

    results.push({ reading_id: inserted.id, event_id: eventId, sensor_id: sensor.id, sensor_code: sensor.sensor_code, value, unit, timestamp, canonical_asset_id: link.canonical_asset_id, status, condition });
  }

  if (!results.length) return NextResponse.json({ error: errors[0] || 'No se pudo procesar ninguna lectura.', errors }, { status: 400 });
  return NextResponse.json({ success: true, dry_run: dryRun, processed_count: results.length, condition_count: results.filter((row) => row.condition).length, results, errors });
}
