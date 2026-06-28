export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type TelemetryPayload = {
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

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(status: unknown) {
  const value = String(status || '').toLowerCase();
  if (['alert', 'alarma', 'critical', 'critico', 'critica', 'alto'].includes(value)) return 'alert';
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
  payload: TelemetryPayload
) {
  const equipmentId = String(payload.equipment_id || '').trim();
  const equipmentCode = String(payload.equipment_code || payload.asset_code || '').trim();
  const equipmentName = String(payload.equipment_name || '').trim();

  if (equipmentId) {
    const { data: byId } = await supabase.from('equipment').select('id, name, type, status').eq('id', equipmentId).maybeSingle();
    if (byId) return { id: byId.id, name: byId.name || equipmentName || equipmentId, status: byId.status || 'operational' };

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

export async function GET() {
  const configured = Boolean(process.env.TELEMETRY_INGEST_TOKEN);

  return NextResponse.json({
    configured,
    endpoint: '/api/telemetry/ingest',
    method: 'POST',
    required_header: 'x-telemetry-token',
    accepted_payload: ['equipment_id', 'equipment_code', 'sensor_id', 'temperature', 'pressure', 'vibration', 'rpm', 'status'],
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
  const target = await resolveTargetEquipment(supabase, payload);
  if (!target) {
    return NextResponse.json({ error: 'No se pudo resolver el equipo destino' }, { status: 404 });
  }

  const timestamp =
    payload.timestamp && !Number.isNaN(new Date(payload.timestamp).getTime())
      ? new Date(payload.timestamp).toISOString()
      : new Date().toISOString();
  const status = normalizeStatus(payload.status);
  const severity = normalizeSeverity(payload.severity || status);
  const message =
    payload.message ||
    payload.description ||
    `Lectura ${status === 'alert' ? 'critica' : 'normal'} recibida desde ${payload.source_machine || 'gateway'}`;

  const { error: readingError } = await supabase.from('sensor_readings').insert([
    {
      sensor_id: payload.sensor_id || null,
      equipment_id: target.id,
      timestamp,
      created_at: timestamp,
      received_at: timestamp,
      value: toNumber(payload.value),
      temperature: toNumber(payload.temperature),
      pressure: toNumber(payload.pressure),
      vibration: toNumber(payload.vibration),
      rpm: toNumber(payload.rpm),
    },
  ]);

  if (readingError) {
    return NextResponse.json({ error: readingError.message }, { status: 500 });
  }

  let alarmCreated = false;
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

    if (!alarmError) alarmCreated = true;
  }

  return NextResponse.json({
    success: true,
    equipment_id: target.id,
    equipment_name: target.name,
    status,
    alarm_created: alarmCreated,
    timestamp,
  });
}
