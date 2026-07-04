export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { loadXlsxModule, sheetToMatrix } from '@/lib/xlsx';

type CalendarImportRow = {
  titulo: string;
  tipo_evento: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  ubicacion: string;
  descripcion: string;
  responsable: string;
  estado: string;
  prioridad: string;
};

type ExistingCalendarRow = {
  id: string;
};

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

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeDate(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toISOString().split('T')[0];
}

function normalizePriority(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['alta', 'high'].includes(text)) return 'alta';
  if (['baja', 'low'].includes(text)) return 'baja';
  return 'media';
}

function normalizeCalendarStatus(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['completado', 'completed', 'cerrado', 'closed'].includes(text)) return 'completed';
  if (['cancelado', 'cancelled', 'cancelada'].includes(text)) return 'cancelled';
  if (['en_progreso', 'en progreso', 'in_progress', 'progreso'].includes(text)) return 'in_progress';
  return 'pending';
}

function normalizeEventType(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['inspeccion_interna', 'inspeccion interna', 'inspection', 'inspeccion'].includes(text)) return 'inspeccion_interna';
  if (['inspeccion_externa', 'inspeccion externa', 'external inspection'].includes(text)) return 'inspeccion_externa';
  if (['capacitacion', 'training'].includes(text)) return 'capacitacion';
  if (['auditoria', 'audit'].includes(text)) return 'auditoria';
  if (['monitoreo', 'monitoreo ambiental', 'monitoring'].includes(text)) return 'monitoreo';
  if (['legal', 'vencimiento legal'].includes(text)) return 'legal';
  if (['reunion', 'meeting'].includes(text)) return 'reunion';
  return 'tarea';
}

function parseCalendarRows(text: string): CalendarImportRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    titulo: headers.findIndex((h) => h.includes('titulo') || h.includes('title')),
    tipo_evento: headers.findIndex((h) => h.includes('tipo_evento') || h === 'tipo' || h.includes('evento')),
    fecha_inicio: headers.findIndex((h) => h.includes('fecha_inicio') || h.includes('fecha inicio') || h === 'fecha' || h.includes('due_date')),
    fecha_fin: headers.findIndex((h) => h.includes('fecha_fin') || h.includes('fecha fin') || h.includes('next_date') || h.includes('proxima')),
    ubicacion: headers.findIndex((h) => h.includes('ubicacion') || h.includes('location')),
    descripcion: headers.findIndex((h) => h.includes('descrip')),
    responsable: headers.findIndex((h) => h.includes('responsable') || h.includes('responsible')),
    estado: headers.findIndex((h) => h.includes('estado') || h.includes('status')),
    prioridad: headers.findIndex((h) => h.includes('prioridad') || h.includes('priority')),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const titulo = values[columns.titulo] || '';
    const fecha_inicio = normalizeDate(values[columns.fecha_inicio]);
    if (!titulo || !fecha_inicio) return [];

    return [{
      titulo,
      tipo_evento: normalizeEventType(values[columns.tipo_evento]),
      fecha_inicio,
      fecha_fin: normalizeDate(values[columns.fecha_fin]),
      ubicacion: values[columns.ubicacion] || '',
      descripcion: values[columns.descripcion] || '',
      responsable: values[columns.responsable] || '',
      estado: values[columns.estado] || '',
      prioridad: values[columns.prioridad] || '',
    }];
  });
}

async function parseCalendarWorkbook(file: File) {
  const xlsx = await loadXlsxModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = sheetToMatrix(xlsx, sheet, true);
  if (!rows.length) return [];

  const csvText = [
    rows[0].map((value) => normalizeText(value)).join(';'),
    ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';')),
  ].join('\n');
  return parseCalendarRows(csvText);
}

async function parseCalendarImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCalendarRows(await file.text());
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return parseCalendarWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
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
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No se proporciono archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      const rows = await parseCalendarImportFile(file);
      if (rows.length === 0) {
        return NextResponse.json({ error: 'No se encontraron eventos validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      let imported = 0;
      let updated = 0;

      for (const row of rows) {
        const eventType = mapRequestType(row.tipo_evento);
        const dueDate = normalizeDate(row.fecha_inicio);
        const title = normalizeText(row.titulo);

        const { data: existing, error: lookupError } = await context.supabase
          .from('compliance_events')
          .select('id')
          .eq('org_id', context.organizationId)
          .eq('event_type', eventType)
          .eq('title', title)
          .eq('due_date', dueDate)
          .maybeSingle();

        if (lookupError) throw lookupError;

        const payload = {
          org_id: context.organizationId,
          event_type: eventType,
          title,
          description: normalizeText(row.descripcion) || null,
          due_date: dueDate,
          next_date: normalizeDate(row.fecha_fin),
          status: normalizeCalendarStatus(row.estado),
          location: normalizeText(row.ubicacion) || null,
          responsible_person_id: context.userId,
          responsible_person_name: normalizeText(row.responsable) || context.userName || null,
          priority: normalizePriority(row.prioridad),
          updated_at: new Date().toISOString(),
        };

        const typedExisting = existing as ExistingCalendarRow | null;

        if (typedExisting?.id) {
          const { error } = await context.supabase
            .from('compliance_events')
            .update(payload)
            .eq('id', typedExisting.id)
            .eq('org_id', context.organizationId);
          if (error) throw error;
          updated += 1;
        } else {
          const { error } = await context.supabase
            .from('compliance_events')
            .insert(payload);
          if (error) throw error;
          imported += 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${rows.length} eventos del calendario`,
        imported,
        updated,
      });
    }

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
