export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const stages = ['plan', 'do', 'check', 'act', 'closed'] as const;
type Stage = (typeof stages)[number];

const nextStage: Record<Stage, Stage | null> = {
  plan: 'do',
  do: 'check',
  check: 'act',
  act: 'closed',
  closed: null,
};

const statusByStage: Record<Stage, string> = {
  plan: 'open',
  do: 'in_progress',
  check: 'verifying',
  act: 'standardized',
  closed: 'closed',
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function nextNumber(numbers: Array<{ kaizen_number?: string | null }>) {
  const highest = numbers.reduce((maximum, item) => {
    const match = String(item.kaizen_number || '').match(/(\d+)$/);
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 0);
  return `MEJ-${String(highest + 1).padStart(4, '0')}`;
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

  if (error) return NextResponse.json({ error: 'No fue posible cargar las mejoras.' }, { status: 500 });
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
    const title = cleanText(body.title);
    const problem = cleanText(body.problem_statement);

    if (!title || !problem) {
      return NextResponse.json({ error: 'Escribe un título y describe el problema.' }, { status: 400 });
    }

    const { data: existingNumbers, error: numberError } = await context.supabase
      .from('lean_kaizen_items')
      .select('kaizen_number')
      .eq('organization_id', context.organizationId);

    if (numberError) return NextResponse.json({ error: 'No fue posible preparar el nuevo registro.' }, { status: 500 });

    const { data, error } = await context.supabase
      .from('lean_kaizen_items')
      .insert({
        organization_id: context.organizationId,
        kaizen_number: nextNumber(existingNumbers || []),
        title,
        problem_statement: problem,
        source_type: cleanText(body.source_type) || 'manual',
        source_id: cleanText(body.source_id) || null,
        source_url: cleanText(body.source_url) || null,
        category: cleanText(body.category) || 'proceso',
        priority: cleanText(body.priority) || 'media',
        owner_name: cleanText(body.owner_name) || context.userName,
        target_date: cleanText(body.target_date) || null,
        root_cause: cleanText(body.root_cause) || null,
        proposed_countermeasure: cleanText(body.proposed_countermeasure) || null,
        expected_result: cleanText(body.expected_result) || null,
        verification_method: cleanText(body.verification_method) || null,
        estimated_saving: Number(body.estimated_saving || 0),
        pdca_stage: 'plan',
        status: 'open',
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: 'No fue posible crear la mejora.' }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'No fue posible crear la mejora.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const id = cleanText(body.id);
    const requestedStage = body.pdca_stage as Stage | undefined;

    if (!id || (requestedStage && !stages.includes(requestedStage))) {
      return NextResponse.json({ error: 'Selecciona una mejora válida.' }, { status: 400 });
    }

    const { data: current, error: currentError } = await context.supabase
      .from('lean_kaizen_items')
      .select('*')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: 'La mejora ya no está disponible.' }, { status: 404 });
    }

    const currentStage = current.pdca_stage as Stage;
    if (requestedStage && requestedStage !== currentStage && nextStage[currentStage] !== requestedStage) {
      return NextResponse.json({ error: 'Completa el paso actual antes de continuar.' }, { status: 409 });
    }

    const merged = {
      owner_name: body.owner_name !== undefined ? cleanText(body.owner_name) : cleanText(current.owner_name),
      target_date: body.target_date !== undefined ? cleanText(body.target_date) : cleanText(current.target_date),
      root_cause: body.root_cause !== undefined ? cleanText(body.root_cause) : cleanText(current.root_cause),
      proposed_countermeasure: body.proposed_countermeasure !== undefined
        ? cleanText(body.proposed_countermeasure)
        : cleanText(current.proposed_countermeasure),
      implementation_notes: body.implementation_notes !== undefined
        ? cleanText(body.implementation_notes)
        : cleanText(current.implementation_notes),
      expected_result: body.expected_result !== undefined ? cleanText(body.expected_result) : cleanText(current.expected_result),
      actual_result: body.actual_result !== undefined ? cleanText(body.actual_result) : cleanText(current.actual_result),
      verification_method: body.verification_method !== undefined
        ? cleanText(body.verification_method)
        : cleanText(current.verification_method),
    };

    if (requestedStage === 'do') {
      if (!merged.root_cause) return NextResponse.json({ error: 'Registra la causa principal antes de aplicar una acción.' }, { status: 400 });
      if (!merged.proposed_countermeasure) return NextResponse.json({ error: 'Describe la acción que se aplicará.' }, { status: 400 });
    }
    if (requestedStage === 'check' && !merged.implementation_notes) {
      return NextResponse.json({ error: 'Registra qué se hizo antes de comprobar el resultado.' }, { status: 400 });
    }
    if (requestedStage === 'act') {
      if (!merged.actual_result) return NextResponse.json({ error: 'Registra el resultado observado.' }, { status: 400 });
      if (!merged.verification_method) return NextResponse.json({ error: 'Indica cómo se comprobó el resultado.' }, { status: 400 });
    }
    if (requestedStage === 'closed' && !merged.actual_result) {
      return NextResponse.json({ error: 'La mejora necesita un resultado comprobado antes de cerrarse.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      updated_at: now,
      updated_by: context.userId,
    };

    for (const key of [
      'owner_name',
      'target_date',
      'root_cause',
      'proposed_countermeasure',
      'implementation_notes',
      'expected_result',
      'actual_result',
      'verification_method',
    ]) {
      if (body[key] !== undefined) payload[key] = merged[key as keyof typeof merged] || null;
    }

    if (body.actual_saving !== undefined) {
      const saving = Number(body.actual_saving);
      payload.actual_saving = Number.isFinite(saving) && saving >= 0 ? saving : 0;
    }

    if (requestedStage) {
      payload.pdca_stage = requestedStage;
      payload.status = statusByStage[requestedStage];
      if (requestedStage === 'act' && !current.verified_at) payload.verified_at = now;
      if (requestedStage === 'closed' && !current.standardized_at) payload.standardized_at = now;
    }

    const { data, error } = await context.supabase
      .from('lean_kaizen_items')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: 'No fue posible guardar la mejora.' }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'No fue posible guardar la mejora.' }, { status: 500 });
  }
}
