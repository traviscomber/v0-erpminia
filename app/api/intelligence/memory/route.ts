export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const CORE_MEMORY_DOMAINS = new Set([
  'executive',
  'maintenance',
  'geology',
  'inventory',
  'procurement',
  'production',
  'finance',
  'documents',
  'data_health',
]);

const SPECIALIST_MEMORY_TABLES = {
  maintenance: 'maintenance_ai_user_memory',
  geology: 'geology_ai_user_memory',
} as const;

type SpecialistMemoryDomain = keyof typeof SPECIALIST_MEMORY_TABLES;

function cleanDomain(value: unknown) {
  const domain = typeof value === 'string' ? value.trim() : '';
  return CORE_MEMORY_DOMAINS.has(domain) ? domain : null;
}

function cleanId(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 140) : '';
}

function specialistMemoryId(domain: SpecialistMemoryDomain, id: string) {
  return `specialist:${domain}:${id}`;
}

function parseSpecialistMemoryId(id: string) {
  const match = /^specialist:(maintenance|geology):(.+)$/.exec(id);
  return match ? { domain: match[1] as SpecialistMemoryDomain, id: match[2] } : null;
}

async function loadCoreMemory(
  context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>,
  domain: string | null,
  includeInactive: boolean,
) {
  if (domain && domain in SPECIALIST_MEMORY_TABLES) return [];

  let query = context.supabase
    .from('motil_ai_user_memory')
    .select('id,domain,memory_type,memory_text,confidence,active,created_at,updated_at')
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (domain) query = query.eq('domain', domain);
  if (!includeInactive) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function loadSpecialistMemory(
  context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>,
  domain: SpecialistMemoryDomain,
  includeInactive: boolean,
) {
  let query = context.supabase
    .from(SPECIALIST_MEMORY_TABLES[domain])
    .select('id,memory_type,memory_text,confidence,active,created_at,updated_at')
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (!includeInactive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    id: specialistMemoryId(domain, row.id),
    domain,
  }));
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const rawDomain = request.nextUrl.searchParams.get('domain');
  const domain = rawDomain ? cleanDomain(rawDomain) : null;
  if (rawDomain && !domain) {
    return NextResponse.json({ error: 'Dominio de memoria no válido.' }, { status: 400 });
  }

  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

  try {
    const specialistDomains = domain && domain in SPECIALIST_MEMORY_TABLES
      ? [domain as SpecialistMemoryDomain]
      : domain
        ? []
        : (Object.keys(SPECIALIST_MEMORY_TABLES) as SpecialistMemoryDomain[]);

    const [core, ...specialistGroups] = await Promise.all([
      loadCoreMemory(context, domain, includeInactive),
      ...specialistDomains.map((specialistDomain) => loadSpecialistMemory(context, specialistDomain, includeInactive)),
    ]);

    const memories = [...core, ...specialistGroups.flat()]
      .sort((a: any, b: any) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
      .slice(0, 100);

    return NextResponse.json({
      memories,
      count: memories.length,
      domain,
      includeInactive,
      persistence: 'governed_memory_bridge_v1',
      policy: 'Memoria laboral no canónica. Nunca reemplaza evidencia operacional ni permisos.',
    });
  } catch (error) {
    console.error('[motil-intelligence-memory] list failed', {
      detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
    });
    return NextResponse.json({ error: 'No fue posible cargar la memoria controlada.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action.trim() : '';
  const id = cleanId(body?.id);

  if (action !== 'set_active') {
    return NextResponse.json({ error: 'Acción de memoria no válida.' }, { status: 400 });
  }
  if (!id || typeof body?.active !== 'boolean') {
    return NextResponse.json({ error: 'Se requiere id y active booleano.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const specialist = parseSpecialistMemoryId(id);

  if (specialist) {
    const { data, error } = await context.supabase
      .from(SPECIALIST_MEMORY_TABLES[specialist.domain])
      .update({ active: body.active, updated_at: now })
      .eq('id', specialist.id)
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .select('id,memory_type,memory_text,confidence,active,created_at,updated_at')
      .maybeSingle();

    if (error) {
      console.error('[motil-intelligence-memory] specialist update failed', { domain: specialist.domain, detail: error.message });
      return NextResponse.json({ error: 'No fue posible actualizar la memoria controlada.' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Memoria no encontrada.' }, { status: 404 });

    return NextResponse.json({
      memory: { ...data, id: specialistMemoryId(specialist.domain, data.id), domain: specialist.domain },
      operationalMutationExecuted: false,
      persistence: 'governed_memory_bridge_v1',
      policy: 'Sólo cambia metadata de memoria no canónica del usuario autenticado.',
    });
  }

  const { data, error } = await context.supabase
    .from('motil_ai_user_memory')
    .update({ active: body.active, updated_at: now })
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .select('id,domain,memory_type,memory_text,confidence,active,created_at,updated_at')
    .maybeSingle();

  if (error) {
    console.error('[motil-intelligence-memory] update failed', { detail: error.message });
    return NextResponse.json({ error: 'No fue posible actualizar la memoria controlada.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Memoria no encontrada.' }, { status: 404 });

  return NextResponse.json({
    memory: data,
    operationalMutationExecuted: false,
    persistence: 'governed_memory_bridge_v1',
    policy: 'Sólo cambia metadata de memoria no canónica del usuario autenticado.',
  });
}
