export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { buildOrgSequence, getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

type ImportCommunityRow = {
  fecha: string;
  tipo: string;
  descripcion: string;
  stakeholder: string;
  estado: string;
  tipo_stakeholder: string;
  ubicacion: string | null;
  contacto_persona: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  impactado_por: string | null;
  fecha_seguimiento: string | null;
  responsable: string | null;
  observaciones: string | null;
  tipo_documento: string | null;
  prioridad: 'alta' | 'media' | 'baja';
};

function normalizeStatus(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['pendiente', 'pending', 'abierto', 'open'].includes(text)) return 'pendiente';
  if (['en progreso', 'en_progreso', 'in_progress', 'progreso'].includes(text)) return 'en_progreso';
  if (['completado', 'completed', 'completada', 'closed'].includes(text)) return 'completado';
  return text || 'pendiente';
}

function normalizeTipo(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['comunicacion', 'comunicación', 'mensaje', 'notice'].includes(text)) return 'Comunicación';
  if (['compromiso', 'commitment'].includes(text)) return 'Compromiso';
  return 'Evento';
}

function normalizeTipoStakeholder(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['indigena', 'indígena', 'comunidad indigena', 'comunidad indígena'].includes(text)) return 'indigena';
  if (['gobierno', 'estado', 'publico', 'público'].includes(text)) return 'gobierno';
  if (['ong', 'ngo'].includes(text)) return 'ong';
  if (['vecino', 'vecinos', 'comunidad vecina'].includes(text)) return 'vecino';
  return 'comunidad';
}

function normalizePrioridad(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['alta', 'high', 'urgente'].includes(text)) return 'alta';
  if (['baja', 'low'].includes(text)) return 'baja';
  return 'media';
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeDate(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseRows(text: string): ImportCommunityRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    fecha: headers.findIndex((h) => h.includes('fecha') && !h.includes('seguimiento')),
    tipo: headers.findIndex((h) => h.includes('tipo')),
    descripcion: headers.findIndex((h) => h.includes('descrip')),
    stakeholder: headers.findIndex((h) => h.includes('stakeholder')),
    estado: headers.findIndex((h) => h.includes('estado')),
    tipo_stakeholder: headers.findIndex((h) => h.includes('tipo') && h.includes('stakeholder')),
    ubicacion: headers.findIndex((h) => h.includes('ubicacion')),
    contacto_persona: headers.findIndex((h) => h.includes('contacto') && h.includes('persona')),
    contacto_email: headers.findIndex((h) => h.includes('email')),
    contacto_telefono: headers.findIndex((h) => h.includes('telefono')),
    impactado_por: headers.findIndex((h) => h.includes('impactado')),
    fecha_seguimiento: headers.findIndex((h) => h.includes('seguimiento')),
    responsable: headers.findIndex((h) => h.includes('responsable')),
    observaciones: headers.findIndex((h) => h.includes('observa')),
    tipo_documento: headers.findIndex((h) => h.includes('documento')),
    prioridad: headers.findIndex((h) => h.includes('prioridad')),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const stakeholder = values[columns.stakeholder] || '';
    const descripcion = values[columns.descripcion] || '';
    if (!stakeholder || !descripcion) return [];

    return [
      {
        fecha: values[columns.fecha] || new Date().toISOString().split('T')[0],
        tipo: normalizeTipo(values[columns.tipo]),
        descripcion,
        stakeholder,
        estado: normalizeStatus(values[columns.estado]),
        tipo_stakeholder: normalizeTipoStakeholder(values[columns.tipo_stakeholder]),
        ubicacion: values[columns.ubicacion] || null,
        contacto_persona: values[columns.contacto_persona] || null,
        contacto_email: values[columns.contacto_email] || null,
        contacto_telefono: values[columns.contacto_telefono] || null,
        impactado_por: values[columns.impactado_por] || null,
        fecha_seguimiento: values[columns.fecha_seguimiento] || null,
        responsable: values[columns.responsable] || null,
        observaciones: values[columns.observaciones] || null,
        tipo_documento: values[columns.tipo_documento] || null,
        prioridad: normalizePrioridad(values[columns.prioridad]),
      },
    ];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = (await import('xlsx')) as any;
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  if (!rows.length) return [];

  const csvText = [rows[0].map((value) => normalizeText(value)).join(';'), ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';'))].join('\n');
  return parseRows(csvText);
}

async function parseImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseRows(await file.text());
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return parseWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('sostenibilidad_comunidades')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('fecha', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los registros comunitarios';
    console.error('[sostenibilidad][comunidades] GET fallback:', message);
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

      const rows = await parseImportFile(file);
      if (rows.length === 0) {
        return NextResponse.json({ error: 'No se encontraron registros comunitarios validos', imported: 0, updated: 0 }, { status: 400 });
      }

      let imported = 0;
      let updated = 0;

      for (const row of rows) {
        const { data: existing } = await context.supabase
          .from('sostenibilidad_comunidades')
          .select('id, numero_registro')
          .eq('organization_id', context.organizationId)
          .eq('stakeholder', row.stakeholder)
          .eq('descripcion', row.descripcion)
          .maybeSingle();

        const numeroRegistro = existing?.numero_registro || await buildOrgSequence(
          context.supabase,
          'sostenibilidad_comunidades',
          context.organizationId,
          'COM'
        );

        const payload = {
          organization_id: context.organizationId,
          numero_registro: numeroRegistro,
          fecha: normalizeDate(row.fecha) || row.fecha,
          tipo: row.tipo,
          descripcion: normalizeText(row.descripcion),
          stakeholder: normalizeText(row.stakeholder),
          estado: normalizeStatus(row.estado),
          tipo_stakeholder: row.tipo_stakeholder,
          ubicacion: row.ubicacion ? normalizeText(row.ubicacion) : null,
          contacto_persona: row.contacto_persona ? normalizeText(row.contacto_persona) : null,
          contacto_email: row.contacto_email ? normalizeText(row.contacto_email) : null,
          contacto_telefono: row.contacto_telefono ? normalizeText(row.contacto_telefono) : null,
          impactado_por: row.impactado_por ? normalizeText(row.impactado_por) : null,
          fecha_seguimiento: row.fecha_seguimiento ? normalizeDate(row.fecha_seguimiento) : null,
          responsable: row.responsable ? normalizeText(row.responsable) : null,
          observaciones: row.observaciones ? normalizeText(row.observaciones) : null,
          tipo_documento: row.tipo_documento ? normalizeText(row.tipo_documento) : null,
          prioridad: row.prioridad,
          created_by: context.userId,
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await context.supabase.from('sostenibilidad_comunidades').update(payload).eq('id', existing.id);
          if (error) throw error;
          updated += 1;
        } else {
          const { error } = await context.supabase.from('sostenibilidad_comunidades').insert(payload);
          if (error) throw error;
          imported += 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${rows.length} registros comunitarios`,
        imported,
        updated,
      });
    }

    const body = await request.json();
    const numeroRegistro = await buildOrgSequence(
      context.supabase,
      'sostenibilidad_comunidades',
      context.organizationId,
      'COM'
    );

    const { data, error } = await context.supabase
      .from('sostenibilidad_comunidades')
      .insert({
        organization_id:  context.organizationId,
        numero_registro:  numeroRegistro,
        fecha:  normalizeDate(body.fecha) || new Date().toISOString().split('T')[0],
        tipo: normalizeTipo(body.tipo),
        descripcion: normalizeText(body.descripcion),
        stakeholder: normalizeText(body.stakeholder),
        estado: normalizeStatus(body.estado || 'pendiente'),
        tipo_stakeholder: normalizeTipoStakeholder(body.tipo_stakeholder),
        ubicacion: normalizeText(body.ubicacion) || null,
        contacto_persona: normalizeText(body.contacto_persona) || null,
        contacto_email: normalizeText(body.contacto_email) || null,
        contacto_telefono: normalizeText(body.contacto_telefono) || null,
        impactado_por: normalizeText(body.impactado_por) || null,
        fecha_seguimiento: normalizeDate(body.fecha_seguimiento),
        responsable: normalizeText(body.responsable) || null,
        observaciones: normalizeText(body.observaciones) || null,
        prioridad: normalizePrioridad(body.prioridad),
        tipo_documento: normalizeText(body.tipo_documento) || null,
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el registro comunitario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await context.supabase
      .from('sostenibilidad_comunidades')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el registro comunitario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
