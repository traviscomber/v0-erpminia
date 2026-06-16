export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  buildOrgSequence,
  getSustainabilityContext,
  isPastDue,
  normalizeNcStatus,
} from '@/lib/api/sostenibilidad-mvp';

function buildStats(rows: Array<{ status: string | null; target_closure_date: string | null }>) {
  const normalized = rows.map((row) => ({
    ...row,
    status: normalizeNcStatus(row.status),
  }));

  return {
    total: normalized.length,
    open: normalized.filter((row) => row.status === 'open').length,
    in_progress: normalized.filter((row) => row.status === 'in_progress').length,
    closed: normalized.filter((row) => row.status === 'closed').length,
    overdue: normalized.filter(
      (row) => row.status !== 'closed' && isPastDue(row.target_closure_date)
    ).length,
  };
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');

    let query = context.supabase
      .from('sostenibilidad_nonconformances')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (severity) query = query.eq('severity', severity);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map((row) => ({
      ...row,
      status: normalizeNcStatus(row.status),
    }));

    return NextResponse.json({
      data: rows,
      nonconformances: rows,
      stats: buildStats(rows),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las no conformidades';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const ncNumber = await buildOrgSequence(
      context.supabase,
      'sostenibilidad_nonconformances',
      context.organizationId,
      'NC'
    );

    const { data, error } = await context.supabase
      .from('sostenibilidad_nonconformances')
      .insert({
        organization_id: context.organizationId,
        nc_number: ncNumber,
        title: body.title,
        description: body.description || null,
        category: body.category || 'safety',
        severity: body.severity || 'medium',
        source: body.source || 'internal_audit',
        discovered_date: body.discoveredDate || new Date().toISOString().split('T')[0],
        reported_by: context.userId,
        assigned_to: context.userId,
        status: 'open',
        root_cause: body.rootCause || null,
        impact_description: body.impactDescription || null,
        target_closure_date: body.targetClosureDate || null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data, id: data.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la no conformidad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from('sostenibilidad_nonconformances')
      .update({
        title: body.title,
        description: body.description,
        category: body.category,
        severity: body.severity,
        source: body.source,
        root_cause: body.root_cause || body.rootCause || null,
        impact_description: body.impact_description || body.impactDescription || null,
        status: body.status ? normalizeNcStatus(body.status) : undefined,
        target_closure_date: body.target_closure_date || body.targetClosureDate || null,
        actual_closure_date: body.actual_closure_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('organization_id', context.organizationId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la no conformidad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
