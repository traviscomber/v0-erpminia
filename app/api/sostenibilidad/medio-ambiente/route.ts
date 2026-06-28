export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { buildOrgSequence, getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

type ImportRow = {
  tipo: 'emisiones' | 'residuos' | 'agua' | 'ruido';
  descripcion: string;
  valor: string;
  unidad: string;
  cumplimiento: 'conforme' | 'no_conforme' | 'en_revision';
};

function normalizeCumplimiento(value: unknown): ImportRow['cumplimiento'] {
  const text = normalizeText(value).toLowerCase();
  if (['conforme', 'cumple', 'ok', 'aprobado', 'approved'].includes(text)) return 'conforme';
  if (['no_conforme', 'no conforme', 'incumple', 'rechazado', 'rejected'].includes(text)) return 'no_conforme';
  if (['en_revision', 'en revision', 'revisión', 'revision', 'pending'].includes(text)) return 'en_revision';
  return 'conforme';
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

function normalizeTipo(value: unknown): ImportRow['tipo'] {
  const text = normalizeText(value).toLowerCase();
  if (['residuo', 'residuos', 'waste'].includes(text)) return 'residuos';
  if (['agua', 'water'].includes(text)) return 'agua';
  if (['ruido', 'noise'].includes(text)) return 'ruido';
  return 'emisiones';
}

function parseRows(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    tipo: headers.findIndex((h) => h.includes('tipo')),
    descripcion: headers.findIndex((h) => h.includes('descrip')),
    valor: headers.findIndex((h) => h.includes('valor')),
    unidad: headers.findIndex((h) => h.includes('unidad')),
    cumplimiento: headers.findIndex((h) => h.includes('cumpl')),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const descripcion = values[columns.descripcion] || '';
    if (!descripcion) return [];

    const tipo = normalizeTipo(values[columns.tipo]);
    const cumplimiento = normalizeCumplimiento(values[columns.cumplimiento]);

    return [
      {
        tipo,
        descripcion,
        valor: values[columns.valor] || '',
        unidad: values[columns.unidad] || '',
        cumplimiento,
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
      .from('sostenibilidad_medio_ambiente')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('fecha', { ascending: false });

    if (error) throw error;

    const normalized = (data || []).map((row: any) => ({
      ...row,
      cumplimiento: normalizeCumplimiento(row.cumplimiento),
    }));

    return NextResponse.json({ data: normalized });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los registros de medio ambiente';
    console.error('[sostenibilidad][medio-ambiente] GET fallback:', message);
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
        return NextResponse.json({ error: 'No se encontraron registros validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      let imported = 0;
      let updated = 0;

      for (const row of rows) {
        const { data: existing } = await context.supabase
          .from('sostenibilidad_medio_ambiente')
          .select('id, numero_registro')
          .eq('organization_id', context.organizationId)
          .eq('descripcion', row.descripcion)
          .eq('tipo', row.tipo)
          .maybeSingle();

        const numeroRegistro = existing?.numero_registro || await buildOrgSequence(
          context.supabase,
          'sostenibilidad_medio_ambiente',
          context.organizationId,
          'MA'
        );

        const payload = {
          organization_id: context.organizationId,
          numero_registro: numeroRegistro,
          fecha: new Date().toISOString().split('T')[0],
          tipo: row.tipo,
          descripcion: row.descripcion,
          valor: row.valor,
          unidad: row.unidad,
          cumplimiento: normalizeCumplimiento(row.cumplimiento),
          created_by: context.userId,
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await context.supabase.from('sostenibilidad_medio_ambiente').update(payload).eq('id', existing.id);
          if (error) throw error;
          updated += 1;
        } else {
          const { error } = await context.supabase.from('sostenibilidad_medio_ambiente').insert(payload);
          if (error) throw error;
          imported += 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${rows.length} registros ambientales`,
        imported,
        updated,
      });
    }

    const body = await request.json();
    const numeroRegistro = await buildOrgSequence(
      context.supabase,
      'sostenibilidad_medio_ambiente',
      context.organizationId,
      'MA'
    );

    const { data, error } = await context.supabase
      .from('sostenibilidad_medio_ambiente')
      .insert({
        organization_id: context.organizationId,
        numero_registro: numeroRegistro,
        fecha: new Date().toISOString().split('T')[0],
        tipo: body.tipo,
        descripcion: body.descripcion,
        valor: String(body.valor || ''),
        unidad: body.unidad,
        cumplimiento: normalizeCumplimiento(body.cumplimiento || 'conforme'),
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el registro de medio ambiente';
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
      .from('sostenibilidad_medio_ambiente')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el registro de medio ambiente';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
