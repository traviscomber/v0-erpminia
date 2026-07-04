export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { loadXlsxModule, sheetToMatrix } from '@/lib/xlsx';

type ComplianceEventImportRow = {
  title: string;
  description: string;
  event_type: string;
  due_date: string;
  frequency: string;
  next_date: string | null;
  status: string;
};

function normalizeEventStatus(dueDate: string, status: string | null) {
  if (status === 'completed') return 'completed';
  return new Date(dueDate).getTime() < Date.now() ? 'overdue' : 'pending';
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
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toISOString().split('T')[0];
}

function normalizeStoredStatus(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['completed', 'completado', 'cumplido'].includes(text)) return 'completed';
  return 'pending';
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseComplianceEventRows(text: string): ComplianceEventImportRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    title: pickIndex(headers, ['title', 'titulo', 'nombre']),
    description: pickIndex(headers, ['description', 'descripcion', 'detalle']),
    event_type: pickIndex(headers, ['event_type', 'tipo_evento', 'tipo']),
    due_date: pickIndex(headers, ['due_date', 'fecha_vencimiento', 'fecha', 'fecha_inicio']),
    frequency: pickIndex(headers, ['frequency', 'frecuencia']),
    next_date: pickIndex(headers, ['next_date', 'proxima_fecha', 'fecha_fin']),
    status: pickIndex(headers, ['status', 'estado']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const title = values[columns.title] || '';
    const dueDate = normalizeDate(values[columns.due_date]);
    if (!title || !dueDate) return [];

    return [{
      title,
      description: values[columns.description] || '',
      event_type: values[columns.event_type] || '',
      due_date: dueDate,
      frequency: values[columns.frequency] || '',
      next_date: normalizeDate(values[columns.next_date]),
      status: values[columns.status] || '',
    }];
  });
}

async function parseComplianceEventWorkbook(file: File) {
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

  return parseComplianceEventRows(csvText);
}

async function parseComplianceEventImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseComplianceEventRows(await file.text());
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return parseComplianceEventWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
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
    const supabase = getSupabaseServerClient();
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No se proporciono archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      const rows = await parseComplianceEventImportFile(file);
      if (rows.length === 0) {
        return NextResponse.json({ error: 'No se encontraron eventos validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      let imported = 0;
      let updated = 0;

      for (const row of rows) {
        const title = normalizeText(row.title);
        const dueDate = normalizeDate(row.due_date);
        const eventType = normalizeEventType(row.event_type);

        const { data: existing, error: lookupError } = await supabase
          .from('compliance_events')
          .select('id')
          .eq('org_id', auth.organizationId)
          .eq('title', title)
          .eq('event_type', eventType)
          .eq('due_date', dueDate)
          .maybeSingle();

        if (lookupError) throw lookupError;

        const payload = {
          org_id: auth.organizationId,
          title,
          description: normalizeText(row.description) || null,
          event_type: eventType,
          due_date: dueDate,
          frequency: normalizeFrequency(row.frequency),
          next_date: normalizeDate(row.next_date),
          status: normalizeStoredStatus(row.status),
          responsible_person_id: auth.user.id,
          related_documents: [],
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await supabase
            .from('compliance_events')
            .update(payload)
            .eq('id', existing.id)
            .eq('org_id', auth.organizationId);
          if (error) throw error;
          updated += 1;
        } else {
          const { error } = await supabase.from('compliance_events').insert(payload);
          if (error) throw error;
          imported += 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${rows.length} eventos de cumplimiento`,
        imported,
        updated,
      });
    }

    const body = await request.json();
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
