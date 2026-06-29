export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type ImportCostCenterRow = {
  code: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string | null;
  updated_at: string | null;
};

type XlsxLikeModule = {
  read: (buffer: Buffer, options: { type: 'buffer'; cellDates: boolean }) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: (sheet: unknown, options: { header: number; defval: string; raw: boolean }) => unknown[][];
  };
};

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeStatus(value: unknown): ImportCostCenterRow['status'] {
  const text = normalizeText(value).toLowerCase();
  if (['inactive', 'inactivo', 'inactiva', 'baja', 'desactivado', 'desactivada'].includes(text)) {
    return 'inactive';
  }
  return 'active';
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseCsvRows(text: string): ImportCostCenterRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    code: pickIndex(headers, ['code', 'codigo', 'cod']),
    name: pickIndex(headers, ['name', 'nombre', 'centro']),
    description: pickIndex(headers, ['description', 'descripcion', 'detalle', 'observacion']),
    status: pickIndex(headers, ['status', 'estado']),
    created_at: pickIndex(headers, ['created_at', 'fecha_creacion', 'created']),
    updated_at: pickIndex(headers, ['updated_at', 'fecha_actualizacion', 'updated']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const code = values[columns.code] || '';
    const name = values[columns.name] || '';

    if (!code || !name) return [];

    return [
      {
        code,
        name,
        description: values[columns.description] || null,
        status: normalizeStatus(values[columns.status]),
        created_at: values[columns.created_at] || null,
        updated_at: values[columns.updated_at] || null,
      },
    ];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = (await import('xlsx')) as unknown as XlsxLikeModule;
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  if (!rows.length) return [];

  const csvText = [rows[0].map((value) => normalizeText(value)).join(';'), ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';'))].join('\n');
  return parseCsvRows(csvText);
}

async function parseImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    return parseCsvRows(await file.text());
  }

  if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
    return parseWorkbook(file);
  }

  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Se requiere archivo CSV, XLS o XLSX' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    const rows = await parseImportFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron centros de costo validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    let imported = 0;
    let updated = 0;

    for (const row of rows) {
      const payload = {
        organization_id: auth.organizationId,
        code: row.code,
        name: row.name,
        description: row.description,
        status: row.status,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      };

      const { data: existing, error: lookupError } = await supabase
        .from('cost_centers')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .eq('code', row.code)
        .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      if (existing?.id) {
        const { error } = await supabase
          .from('cost_centers')
          .update(payload)
          .eq('id', existing.id)
          .eq('organization_id', auth.organizationId);
        if (error) throw error;
        updated += 1;
      } else {
        const { error } = await supabase.from('cost_centers').insert(payload);
        if (error) throw error;
        imported += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se procesaron ${rows.length} centros de costo`,
      imported,
      updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron importar los centros de costo';
    console.error('[admin][import-cost-centers] error:', message);
    return NextResponse.json({ error: message, imported: 0, updated: 0 }, { status: 500 });
  }
}
