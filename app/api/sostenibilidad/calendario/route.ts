export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

function mapCalendarStatus(status: string | null) {
  if (status === 'completed') return 'completado';
  if (status === 'cancelled') return 'cancelado';
  if (status === 'in_progress') return 'en_progreso';
  return 'programado';
}

function mapEventType(eventType: string | null) {
  switch (eventType) {
    case 'inspection': return 'inspeccion_interna';
    case 'training': return 'capacitacion';
    case 'audit': return 'auditoria';
    case 'monitoring': return 'monitoreo';
    case 'legal': return 'legal';
    case 'meeting': return 'reunion';
    case 'tarea': return 'tarea';
    default: return 'tarea';
  }
}

function mapRequestType(tipo: string | null) {
  switch (tipo) {
    case 'inspeccion_interna':
    case 'inspeccion_externa': return 'inspection';
    case 'capacitacion': return 'training';
    case 'auditoria': return 'audit';
    case 'monitoreo': return 'monitoring';
    case 'legal': return 'legal';
    case 'reunion': return 'meeting';
    default: return 'report';
  }
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeDate(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function normalizePriority(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['alta', 'high'].includes(text)) return 'alta';
  if (['baja', 'low'].includes(text)) return 'baja';
  return 'media';
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('compliance_events')
      .select('*')
      .eq('org_id', context.organizationId)
      .order('due_date', { ascending: true });

    if (error) throw error;

    const rows = (data || []).map((event) => ({
      id: event.id,
      titulo: event.title,
      tipo_evento: mapEventType(event.event_type),
      fecha_inicio: event.due_date,
      fecha_fin: event.next_date || null,
      ubicacion: event.location || '',
      descripcion: event.description || '',
      responsable: event.responsible_person_name || '',
      estado: mapCalendarStatus(event.status),
      prioridad: event.priority || 'media',
    }));

    return NextResponse.json({ data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los eventos del calendario';
    console.error('[sostenibilidad][calendario] GET fallback:', message);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();

    if (!body.titulo || !body.fecha_inicio) {
      return NextResponse.json(
        { error: 'titulo and fecha_inicio are required' },
        { status: 400 }
      );
    }

    const { data, error } = await context.supabase
      .from('compliance_events')
      .insert({
        org_id: context.organizationId,
        event_type: mapRequestType(body.tipo_evento),
        title: normalizeText(body.titulo || body.title) || 'Sin título',
        description: normalizeText(body.descripcion || body.description) || null,
        due_date: normalizeDate(body.fecha_inicio || body.due_date || body.fechaInicio),
        next_date: normalizeDate(body.fecha_fin || body.next_date || body.fechaFin),
        status:
          body.estado === 'completado'
            ? 'completed'
            : body.estado === 'cancelado'
              ? 'cancelled'
              : 'pending',
        location: normalizeText(body.ubicacion || body.location) || null,
        responsible_person_id: context.userId,
        responsible_person_name:
          normalizeText(body.responsable || body.responsible || body.responsible_person_name) ||
          context.userName ||
          null,
        priority: normalizePriority(body.prioridad || body.priority),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el evento del calendario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const { error } = await context.supabase
      .from('compliance_events')
      .delete()
      .eq('id', id)
      .eq('org_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el evento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
