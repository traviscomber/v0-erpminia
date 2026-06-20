export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type ParsedCenterRow = {
  code: string;
  name: string;
  description: string | null;
  status: 'active';
};

function normalizeText(value: string) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeHeader(value: string) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseCsvRows(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const codigoIdx = headers.findIndex((h) => h.includes('codigo rec elec') || h === 'codigo' || h.includes('codigo'));
  const discontinuadoIdx = headers.findIndex((h) => h.includes('discontinuado'));
  const creadoPorIdx = headers.findIndex((h) => h.includes('creador'));
  const fechaCreacionIdx = headers.findIndex((h) => h.includes('fecha de creacion'));
  const fechaModificacionIdx = headers.findIndex((h) => h.includes('fecha de modificacion'));
  const modificadoPorIdx = headers.findIndex((h) => h.includes('modificado por'));
  const nombreIdx = headers.findIndex((h) => h.includes('nombre'));
  const notasIdx = headers.findIndex((h) => h.includes('notas'));
  const rutaIdx = headers.findIndex((h) => h.includes('ruta'));

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const deriveCodeAndName = (rawName: string) => {
    const raw = normalizeText(rawName);
    const match = raw.match(/^([0-9]+(?:-[0-9]+)*)\s+(.+)$/);

    if (match) {
      return {
        code: match[1].trim(),
        name: normalizeText(match[2]),
      };
    }

    return {
      code: slugify(raw) || raw,
      name: raw,
    };
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const discontinued = discontinuadoIdx >= 0 && (values[discontinuadoIdx] || '').toLowerCase() === 'si';
    if (discontinued) return [];

    const nameValue = values[nombreIdx] || '';
    if (!nameValue) return [];

    const derived = deriveCodeAndName(nameValue);
    const code = normalizeText(values[codigoIdx] || derived.code);
    const route = normalizeText(values[rutaIdx] || '');
    const creator = normalizeText(values[creadoPorIdx] || '');
    const modifiedBy = normalizeText(values[modificadoPorIdx] || '');
    const createdAt = normalizeText(values[fechaCreacionIdx] || '');
    const updatedAt = normalizeText(values[fechaModificacionIdx] || '');
    const notes = normalizeText(values[notasIdx] || '');

    const description = [
      route ? `Ruta completa: ${route}` : '',
      creator ? `Creador: ${creator}` : '',
      modifiedBy ? `Modificado por: ${modifiedBy}` : '',
      createdAt ? `Fecha creación: ${createdAt}` : '',
      updatedAt ? `Fecha modificación: ${updatedAt}` : '',
      notes ? `Notas: ${notes}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    return [
      {
        code,
        name: derived.name,
        description: description || null,
        status: 'active' as const,
      },
    ];
  });
}

async function parseWorkbookRows(file: File) {
  const xlsx = (await import('xlsx')) as any;
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  if (!rows.length) return [];

  const headerText = rows[0].map((value) => normalizeHeader(String(value ?? '')));
  const toCsv = [headerText.join(';'), ...rows.slice(1).map((row) => row.map((value) => normalizeText(String(value ?? ''))).join(';'))].join('\n');
  return parseCsvRows(toCsv);
}

async function parseFile(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.csv')) {
    return parseCsvRows(await file.text());
  }

  if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) {
    return parseWorkbookRows(file);
  }

  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporcionó un archivo' }, { status: 400 });
    }

    const parsedRows = await parseFile(file);
    if (parsedRows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron centros de costo válidos en el archivo' }, { status: 400 });
    }

    const { data: existingRows, error: readError } = await context.supabase
      .from('cost_centers')
      .select('id, organization_id, code, name, description, status')
      .eq('organization_id', context.organizationId);

    if (readError) throw readError;

    const backupRows = Array.isArray(existingRows) ? existingRows : [];

    const { error: deleteError } = await context.supabase
      .from('cost_centers')
      .delete()
      .eq('organization_id', context.organizationId);

    if (deleteError) throw deleteError;

    const payload = parsedRows.map((row) => ({
      organization_id: context.organizationId,
      code: row.code,
      name: row.name,
      description: row.description,
      status: row.status,
    }));

    const { error: insertError } = await context.supabase.from('cost_centers').insert(payload);

    if (insertError) {
      if (backupRows.length > 0) {
        await context.supabase.from('cost_centers').insert(
          backupRows.map((row: any) => ({
            organization_id: row.organization_id,
            code: row.code,
            name: row.name,
            description: row.description,
            status: row.status,
          })),
        );
      }

      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: `Se importaron ${payload.length} centros de costo`,
      imported: payload.length,
    });
  } catch (error) {
    console.error('[v0] Cost centers import error:', error);
    return NextResponse.json(
      { error: 'No se pudieron importar los centros de costo', details: String(error) },
      { status: 500 },
    );
  }
}
