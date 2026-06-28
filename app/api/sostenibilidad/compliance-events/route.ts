export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function normalizeEventStatus(dueDate: string, status: string | null) {
  if (status === 'completed') return 'completed';
  return new Date(dueDate).getTime() < Date.now() ? 'overdue' : 'pending';
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeFrequency(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return 'one_time';
  if (['one_time', 'once', 'unica', 'única', 'puntual'].includes(text)) return 'one_time';
  if (['monthly', 'mensual'].includes(text)) return 'monthly';
  if (['quarterly', 'trimestral'].includes(text)) return 'quarterly';
  if (['semiannual', 'semi_anual', 'semestral'].includes(text)) return 'semiannual';
  if (['annual', 'anual'].includes(text)) return 'annual';
  return text;
}

function normalizeEventType(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return 'tarea';
  if (['inspection', 'inspeccion', 'inspección'].includes(text)) return 'inspection';
  if (['training', 'capacitacion', 'capacitación'].includes(text)) return 'training';
  if (['audit', 'auditoria', 'auditoría'].includes(text)) return 'audit';
  if (['monitoring', 'monitoreo'].includes(text)) return 'monitoring';
  if (['legal'].includes(text)) return 'legal';
  if (['meeting', 'reunion', 'reunión'].includes(text)) return 'meeting';
  if (['tarea', 'task'].includes(text)) return 'tarea';
  return 'tarea';
}

function normalizeDate(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const limit = Number(searchParams.get('limit') || 20);
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('compliance_events')
      .select('*')
      .eq('org_id', auth.organizationId)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const events = (data || []).map((event) => ({
      ...event,
      status: normalizeEventStatus(event.due_date, event.status),
    }));

    return NextResponse.json({
      data: events,
      stats: {
        total: events.length,
        pending: events.filter((event) => event.status === 'pending').length,
        completed: events.filter((event) => event.status === 'completed').length,
        overdue: events.filter((event) => event.status === 'overdue').length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los eventos de cumplimiento';
    console.error('[sostenibilidad][compliance-events] GET fallback:', message);
    return NextResponse.json({
      data: [],
      stats: {
        total: 0,
        pending: 0,
        completed: 0,
        overdue: 0,
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId || !auth.user) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = getSupabaseServerClient();
    const dueDate = normalizeDate(body.due_date || body.dueDate);

    if (!body.title || !dueDate || !body.event_type) {
      return NextResponse.json(
        { error: 'title, due_date and event_type are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('compliance_events')
      .insert({
        org_id: auth.organizationId,
        title: normalizeText(body.title),
        description: normalizeText(body.description) || null,
        event_type: normalizeEventType(body.event_type),
        due_date: dueDate,
        frequency: normalizeFrequency(body.frequency),
        next_date: normalizeDate(body.next_date),
        status: normalizeEventStatus(dueDate, body.status),
        responsible_person_id: auth.user.id,
        related_documents: Array.isArray(body.related_documents) ? body.related_documents : [],
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el evento de cumplimiento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
