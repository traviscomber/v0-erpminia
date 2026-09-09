export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const CORE_MEMORY_DOMAINS = new Set([
  'executive',
  'inventory',
  'procurement',
  'production',
  'finance',
  'documents',
  'data_health',
]);

function cleanDomain(value: unknown) {
  const domain = typeof value === 'string' ? value.trim() : '';
  return CORE_MEMORY_DOMAINS.has(domain) ? domain : null;
}

function cleanId(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
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
  if (error) {
    console.error('[motil-intelligence-memory] list failed', { detail: error.message });
    return NextResponse.json({ error: 'No fue posible cargar la memoria controlada.' }, { status: 500 });
  }

  return NextResponse.json({
    memories: data || [],
    count: (data || []).length,
    domain,
    includeInactive,
    policy: 'Memoria laboral no canónica. Nunca reemplaza evidencia operacional ni permisos.',
  });
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
  if (!data) {
    return NextResponse.json({ error: 'Memoria no encontrada.' }, { status: 404 });
  }

  return NextResponse.json({
    memory: data,
    operationalMutationExecuted: false,
    policy: 'Sólo cambia metadata de memoria no canónica del usuario autenticado.',
  });
}
