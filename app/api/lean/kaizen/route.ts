export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const stages = ['plan', 'do', 'check', 'act', 'closed'] as const;
type Stage = (typeof stages)[number];

function nextNumber(count: number) {
  return `KZN-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('lean_kaizen_items')
    .select('*')
    .eq('organization_id', context.organizationId)
    .neq('status', 'cancelled')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const items = data || [];
  return NextResponse.json({
    data: items,
    summary: {
      total: items.length,
      active: items.filter((item) => !['closed', 'standardized'].includes(item.status)).length,
      verifying: items.filter((item) => item.pdca_stage === 'check').length,
      standardized: items.filter((item) => ['act', 'closed'].includes(item.pdca_stage)).length,
      savings: items.reduce((sum, item) => sum + Number(item.actual_saving || 0), 0),
    },
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    if (!String(body.title || '').trim() || !String(body.problem_statement || '').trim()) {
      return NextResponse.json({ error: 'Título y problema son obligatorios' }, { status: 400 });
    }

    const { count } = await context.supabase
      .from('lean_kaizen_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId);

    const { data, error } = await context.supabase
      .from('lean_kaizen_items')
      .insert({
        organization_id: context.organizationId,
        kaizen_number: nextNumber(count || 0),
        title: String(body.title).trim(),
        problem_statement: String(body.problem_statement).trim(),
        source_type: body.source_type || 'manual',
        source_id: body.source_id || null,
        source_url: body.source_url || null,
        category: body.category || 'proceso',
        priority: body.priority || 'media',
        owner_name: body.owner_name || context.userName,
        target_date: body.target_date || null,
        root_cause: body.root_cause || null,
        proposed_countermeasure: body.proposed_countermeasure || null,
        expected_result: body.expected_result || null,
        verification_method: body.verification_method || null,
        estimated_saving: Number(body.estimated_saving || 0),
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo crear el Kaizen' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const id = String(body.id || '');
    const stage = body.pdca_stage as Stage | undefined;
    if (!id || (stage && !stages.includes(stage))) {
      return NextResponse.json({ error: 'Actualización inválida' }, { status: 400 });
    }

    if (stage === 'do' && !String(body.proposed_countermeasure || '').trim()) {
      return NextResponse.json({ error: 'Define la contramedida antes de ejecutar' }, { status: 400 });
    }
    if (stage === 'check' && !String(body.implementation_notes || '').trim()) {
      return NextResponse.json({ error: 'Registra la implementación antes de verificar' }, { status: 400 });
    }
    if (stage === 'act' && !String(body.actual_result || '').trim()) {
      return NextResponse.json({ error: 'Registra el resultado antes de estandarizar' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    for (const key of ['pdca_stage','status','owner_name','target_date','root_cause','proposed_countermeasure','implementation_notes','expected_result','actual_result','verification_method','actual_saving']) {
      if (body[key] !== undefined) payload[key] = body[key];
    }
    if (stage === 'check') payload.verified_at = new Date().toISOString();
    if (stage === 'act' || stage === 'closed') payload.standardized_at = new Date().toISOString();
    if (stage === 'closed') payload.status = 'closed';

    const { data, error } = await context.supabase
      .from('lean_kaizen_items')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar el Kaizen' }, { status: 500 });
  }
}
