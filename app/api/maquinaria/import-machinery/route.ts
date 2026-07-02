export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext } from '@/lib/api/auth-session';

const MACHINERY_GROUPS: Record<string, string> = {
  '8': 'Camionetas',
  '9': 'Camiones',
  '10': 'Cargadores de Bajo Perfil',
  '11': 'Cargadores Frontales',
  '12': 'Camiones de Bajo Perfil',
  '13': 'Grupos Generadores',
  '14': 'Compresores',
  '15': 'Manipuladores Telescopicos',
  '16': 'Equipos de Sondaje',
  '17': 'Equipos de Perforacion',
  '18': 'Minicargadores',
  '19': 'Excavadoras',
  '20': 'Otros Equipos',
};

type MachineRow = {
  code: string;
  name: string;
  status: string;
  description: string | null;
};

type ParsedRowsResult = {
  valid: MachineRow[];
  warnings: string[];
};

type XlsxModule = {
  read: (buffer: Buffer, options: { type: 'buffer'; cellDates: boolean }) => { Sheets: Record<string, unknown>; SheetNames: string[] };
  utils: {
    sheet_to_json: (sheet: unknown, options: { header: number; defval: string; raw: boolean }) => unknown[][];
  };
};

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStatus(value: unknown): string {
  const status = normalizeText(value).toLowerCase();
  if (!status) return 'active';
  if (['activo', 'activa', 'active', 'habilitado', 'vigente'].includes(status)) return 'active';
  if (['inactivo', 'inactiva', 'inactive', 'baja', 'deshabilitado'].includes(status)) return 'inactive';
  return status;
}

function buildDescription(row: Record<string, string>): string | null {
  const parts = [
    row.description,
    row.model ? `Modelo: ${row.model}` : '',
    row.plate ? `Patente/Serie: ${row.plate}` : '',
    row.year ? `Año: ${row.year}` : '',
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : null;
}

function parseRows(rows: unknown[][]): ParsedRowsResult {
  if (!rows.length) return { valid: [], warnings: ['Archivo vacio'] };

  const headers = (rows[0] as unknown[]).map((header) => normalizeText(header).toLowerCase());
  const findColumn = (...candidates: string[]) =>
    headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));

  const codeIdx = findColumn('codigo', 'code', 'cod');
  const nameIdx = findColumn('nombre', 'name', 'descripcion', 'descripcion completa');
  const statusIdx = findColumn('estado', 'status');
  const descriptionIdx = findColumn('descripcion', 'description', 'detalle');
  const modelIdx = findColumn('modelo', 'model');
  const plateIdx = findColumn('patente', 'serie', 'plate');
  const yearIdx = findColumn('ano', 'año', 'year');

  if (codeIdx === -1) return { valid: [], warnings: ['Columna "codigo" no encontrada'] };
  if (nameIdx === -1) return { valid: [], warnings: ['Columna "nombre" no encontrada'] };

  const valid: MachineRow[] = [];
  const warnings: string[] = [];

  rows.slice(1).forEach((row, index) => {
    const values = row as unknown[];
    const code = normalizeText(values[codeIdx]);
    const name = normalizeText(values[nameIdx]);
    const status = normalizeStatus(statusIdx >= 0 ? values[statusIdx] : 'active');

    if (!code || !name) return;
    if (!code.includes('-')) {
      warnings.push(`Fila ${index + 2}: codigo "${code}" debe tener formato X-Y, por ejemplo 8-5`);
      return;
    }

    const parentCode = code.split('-')[0];
    if (!MACHINERY_GROUPS[parentCode]) {
      warnings.push(`Fila ${index + 2}: codigo "${code}" no pertenece a una familia de maquinaria valida`);
      return;
    }

    const rowObject = {
      description: descriptionIdx >= 0 ? normalizeText(values[descriptionIdx]) : '',
      model: modelIdx >= 0 ? normalizeText(values[modelIdx]) : '',
      plate: plateIdx >= 0 ? normalizeText(values[plateIdx]) : '',
      year: yearIdx >= 0 ? normalizeText(values[yearIdx]) : '',
    };

    valid.push({
      code,
      name,
      status,
      description: buildDescription(rowObject),
    });
  });

  return { valid, warnings };
}

function rowsFromCsv(text: string) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(';').map((value) => value.trim()));
}

async function readImportRows(file: File): Promise<unknown[][]> {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    const xlsx = (await import('xlsx')) as unknown as XlsxModule;
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  }

  if (filename.endsWith('.csv')) {
    return rowsFromCsv(await file.text());
  }

  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    const rows = await readImportRows(file);
    const { valid, warnings } = parseRows(rows);

    if (valid.length === 0) {
      return NextResponse.json({ error: 'No se encontraron filas validas', details: warnings, imported: 0, updated: 0 }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    let imported = 0;
    let updated = 0;

    for (const row of valid) {
      const payload = {
        organization_id: auth.organizationId,
        code: row.code,
        name: row.name,
        description: row.description,
        status: row.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: existing, error: lookupError } = await supabase
        .from('cost_centers')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .eq('code', row.code)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing?.id) {
        const { error } = await supabase
          .from('cost_centers')
          .update({
            name: row.name,
            description: row.description,
            status: row.status,
            updated_at: new Date().toISOString(),
          })
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
      message: `Se procesaron ${valid.length} equipos de maquinaria`,
      imported,
      updated,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error importando maquinaria';
    console.error('[v0] import-machinery error:', error);
    return NextResponse.json({ error: message, imported: 0, updated: 0 }, { status: 500 });
  }
}
