export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { loadXlsxModule, sheetToMatrix } from '@/lib/xlsx';

type ImportEPPRow = {
  cargo_puesto: string;
  elemento_epp: string;
  cantidad_elemento: number;
  marca_modelo: string | null;
  ficha_tecnica_url: string | null;
  frecuencia_reemplazo: string;
  activo: boolean;
};

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeUrl(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseBoolean(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['1', 'true', 'si', 'sí', 'activo', 'yes', 'x'].includes(text)) return true;
  if (['0', 'false', 'no', 'inactivo'].includes(text)) return false;
  return true;
}

function parseCsvRows(text: string): ImportEPPRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    cargo_puesto: headers.findIndex((h) => h.includes('cargo') || h.includes('puesto')),
    elemento_epp: headers.findIndex((h) => h.includes('epp') || h.includes('elemento')),
    cantidad_elemento: headers.findIndex((h) => h.includes('cantidad')),
    marca_modelo: headers.findIndex((h) => h.includes('marca') || h.includes('modelo')),
    ficha_tecnica_url: headers.findIndex((h) => h.includes('ficha') || h.includes('url')),
    frecuencia_reemplazo: headers.findIndex((h) => h.includes('frecuencia')),
    activo: headers.findIndex((h) => h.includes('activo') || h.includes('estado')),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const cargo_puesto = values[columns.cargo_puesto] || '';
    const elemento_epp = values[columns.elemento_epp] || '';
    if (!cargo_puesto || !elemento_epp) return [];

    return [
      {
        cargo_puesto,
        elemento_epp,
        cantidad_elemento: Number(values[columns.cantidad_elemento] || 1),
        marca_modelo: values[columns.marca_modelo] || null,
        ficha_tecnica_url: values[columns.ficha_tecnica_url] || null,
        frecuencia_reemplazo: values[columns.frecuencia_reemplazo] || 'semestral',
        activo: parseBoolean(values[columns.activo]),
      },
    ];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = await loadXlsxModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = sheetToMatrix(xlsx, sheet, true);
  if (!rows.length) return [];

  const csvText = [rows[0].map((value) => normalizeText(value)).join(';'), ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';'))].join('\n');
  return parseCsvRows(csvText);
}

async function parseImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCsvRows(await file.text());
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return parseWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('sostenibilidad_epp')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('cargo_puesto', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los EPP';
    console.error('[sostenibilidad][epp] GET fallback:', message);
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
        return NextResponse.json({ error: 'No se encontraron EPP validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      let imported = 0;
      let updated = 0;

      for (const row of rows) {
        const { data: existing } = await context.supabase
          .from('sostenibilidad_epp')
          .select('id')
          .eq('organization_id', context.organizationId)
          .eq('cargo_puesto', row.cargo_puesto)
          .eq('elemento_epp', row.elemento_epp)
          .maybeSingle();

      const payload = {
        organization_id: context.organizationId,
        cargo_puesto: normalizeText(row.cargo_puesto),
        elemento_epp: normalizeText(row.elemento_epp),
        cantidad_elemento: row.cantidad_elemento,
        marca_modelo: normalizeText(row.marca_modelo),
        ficha_tecnica_url: normalizeUrl(row.ficha_tecnica_url),
        frecuencia_reemplazo: normalizeText(row.frecuencia_reemplazo) || 'semestral',
        activo: row.activo,
        created_by: context.userId,
        updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await context.supabase.from('sostenibilidad_epp').update(payload).eq('id', existing.id);
          if (error) throw error;
          updated += 1;
        } else {
          const { error } = await context.supabase.from('sostenibilidad_epp').insert(payload);
          if (error) throw error;
          imported += 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${rows.length} elementos EPP`,
        imported,
        updated,
      });
    }

    const body = await request.json();

    const { data, error } = await context.supabase
      .from('sostenibilidad_epp')
      .insert({
        organization_id: context.organizationId,
        cargo_puesto: normalizeText(body.cargo_puesto),
        elemento_epp: normalizeText(body.elemento_epp),
        cantidad_elemento: Number(body.cantidad_elemento || 1),
        marca_modelo: normalizeText(body.marca_modelo) || null,
        ficha_tecnica_url: normalizeUrl(body.ficha_tecnica_url),
        frecuencia_reemplazo: normalizeText(body.frecuencia_reemplazo) || 'semestral',
        activo: body.activo !== false,
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el EPP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const body = await request.json();

    const { data, error } = await context.supabase
      .from('sostenibilidad_epp')
      .update({
        cargo_puesto: normalizeText(body.cargo_puesto),
        elemento_epp: normalizeText(body.elemento_epp),
        cantidad_elemento: Number(body.cantidad_elemento || 1),
        marca_modelo: normalizeText(body.marca_modelo) || null,
        ficha_tecnica_url: normalizeUrl(body.ficha_tecnica_url),
        frecuencia_reemplazo: normalizeText(body.frecuencia_reemplazo) || 'semestral',
        activo: body.activo !== false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el EPP';
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
      .from('sostenibilidad_epp')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el EPP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
