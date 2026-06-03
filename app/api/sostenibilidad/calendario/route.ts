import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

function mapCalendarStatus(status?: string | null) {
  if (status === 'completed') return 'completado';
  if (status === 'cancelled') return 'cancelado';
  return 'programado';
}

function mapEventType(eventType?: string | null) {
  switch (eventType) {
    case 'inspection':
      return 'inspeccion_interna';
    case 'training':
      return 'capacitacion';
    case 'audit':
      return 'auditoria';
    default:
      return 'tarea';
  }
}

function mapRequestType(tipo?: string | null) {
  switch (tipo) {
    case 'inspeccion_interna':
    case 'inspeccion_externa':
      return 'inspection';
    case 'capacitacion':
      return 'training';
    case 'auditoria':
      return 'audit';
    default:
      return 'report';
  }
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
      fecha_fin: event.next_date || event.due_date,
      ubicacion: event.location || '',
      descripcion: event.description || '',
      responsable: event.responsible_person_name || '',
      estado: mapCalendarStatus(event.status),
    }));

    return NextResponse.json({ data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch calendar events';
    return NextResponse.json({ error: message }, { status: 500 });
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
        title: String(body.titulo).trim(),
        description: String(body.descripcion || '').trim() || null,
        due_date: body.fecha_inicio,
        next_date: body.fecha_fin || null,
        status:
          body.estado === 'completado'
            ? 'completed'
            : body.estado === 'cancelado'
              ? 'cancelled'
              : 'pending',
        location: String(body.ubicacion || '').trim() || null,
        responsible_person_id: context.userId,
        responsible_person_name:
          String(body.responsable || '').trim() || context.userName || null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create calendar event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
