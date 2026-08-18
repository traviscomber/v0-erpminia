export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type WorkerType = 'operario' | 'mecanico';

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function classifyWorker(roleTitle: string | null | undefined): WorkerType | null {
  const value = normalize(roleTitle);
  if (/\bmecanico\b/.test(value)) return 'mecanico';
  if (/\boperario\b|\boperador\b/.test(value)) return 'operario';
  return null;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { searchParams } = new URL(request.url);
  const personId = searchParams.get('person_id');
  const limit = Math.min(250, Math.max(1, Number(searchParams.get('limit') || 100)));

  try {
    const [{ data: people, error: peopleError }, { data: assets, error: assetsError }] = await Promise.all([
      context.supabase
        .from('people')
        .select('id,full_name,role_title,employment_status')
        .eq('organization_id', context.organizationId)
        .order('full_name'),
      context.supabase
        .from('maintenance_canonical_assets_v1')
        .select('id,asset_code,name,asset_type,category,is_active')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .order('asset_code'),
    ]);

    if (peopleError) throw peopleError;
    if (assetsError) throw assetsError;

    const workers = (people || [])
      .map((person) => {
        const cargo = person.role_title || 'Sin cargo';
        const workerType = classifyWorker(cargo);
        return workerType && person.employment_status === 'active'
          ? { id: person.id, name: person.full_name || 'Sin nombre', cargo, workerType }
          : null;
      })
      .filter(Boolean);

    let query = context.supabase
      .from('production_operator_activity')
      .select('id,person_id,worker_type,role_snapshot,operation_date,shift_code,canonical_asset_id,activity_type,activity_status,planned_hours,actual_hours,output_quantity,output_unit,checklist_completed,safety_observation,incident_id,notes,source_type,source_reference,created_at')
      .eq('organization_id', context.organizationId)
      .order('operation_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (personId) query = query.eq('person_id', personId);
    const { data: activity, error: activityError } = await query;
    if (activityError) throw activityError;

    const workerMap = new Map((workers as Array<{ id: string; name: string; cargo: string; workerType: WorkerType }>).map((worker) => [worker.id, worker]));
    const assetMap = new Map((assets || []).map((asset) => [asset.id, asset]));

    const rows = (activity || []).map((row) => ({
      ...row,
      person: workerMap.get(row.person_id) || { id: row.person_id, name: 'Persona histórica', cargo: row.role_snapshot || 'Histórico', workerType: row.worker_type },
      asset: row.canonical_asset_id ? assetMap.get(row.canonical_asset_id) || null : null,
    }));

    return NextResponse.json({ workers, assets: assets || [], activity: rows });
  } catch (error) {
    console.error('[production/operator-traceability][GET]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la trazabilidad operacional' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const personId = String(body.person_id || '').trim();
    const operationDate = String(body.operation_date || '').trim();
    const shiftCode = String(body.shift_code || '').trim();
    const activityType = String(body.activity_type || '').trim();
    const activityStatus = String(body.activity_status || 'completed').trim();

    if (!personId || !operationDate || !shiftCode || !activityType) {
      return NextResponse.json({ error: 'Persona, fecha, turno y actividad son obligatorios' }, { status: 400 });
    }

    const { data: person, error: personError } = await context.supabase
      .from('people')
      .select('id,full_name,role_title,employment_status')
      .eq('organization_id', context.organizationId)
      .eq('id', personId)
      .maybeSingle();
    if (personError) throw personError;
    if (!person) return NextResponse.json({ error: 'La persona no pertenece a esta organización' }, { status: 400 });
    if (person.employment_status !== 'active') return NextResponse.json({ error: 'La persona no está activa laboralmente' }, { status: 400 });

    const cargo = person.role_title || '';
    const workerType = classifyWorker(cargo);
    if (!workerType) {
      return NextResponse.json({ error: 'El cargo de la persona no está clasificado como mecánico u operario' }, { status: 400 });
    }

    const canonicalAssetId = body.canonical_asset_id ? String(body.canonical_asset_id) : null;
    if (canonicalAssetId) {
      const { data: asset, error: assetError } = await context.supabase
        .from('maintenance_canonical_assets_v1')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('id', canonicalAssetId)
        .maybeSingle();
      if (assetError) throw assetError;
      if (!asset) return NextResponse.json({ error: 'El equipo no pertenece a esta organización' }, { status: 400 });
    }

    const numeric = (value: unknown) => value === '' || value === null || value === undefined ? null : Number(value);
    const plannedHours = numeric(body.planned_hours);
    const actualHours = numeric(body.actual_hours);
    const outputQuantity = numeric(body.output_quantity);
    if ([plannedHours, actualHours, outputQuantity].some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
      return NextResponse.json({ error: 'Horas y producción deben ser valores positivos' }, { status: 400 });
    }

    const payload = {
      organization_id: context.organizationId,
      person_id: personId,
      worker_type: workerType,
      role_snapshot: cargo || null,
      operation_date: operationDate,
      shift_code: shiftCode,
      canonical_asset_id: canonicalAssetId,
      activity_type: activityType,
      activity_status: activityStatus,
      planned_hours: plannedHours,
      actual_hours: actualHours,
      output_quantity: outputQuantity,
      output_unit: body.output_unit ? String(body.output_unit).trim() : null,
      checklist_completed: typeof body.checklist_completed === 'boolean' ? body.checklist_completed : null,
      safety_observation: Boolean(body.safety_observation),
      incident_id: body.incident_id ? String(body.incident_id) : null,
      notes: body.notes ? String(body.notes).trim() : null,
      source_type: 'manual',
      created_by: context.userId,
    };

    const { data, error } = await context.supabase
      .from('production_operator_activity')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error('[production/operator-traceability][POST]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar la actividad' }, { status: 500 });
  }
}
