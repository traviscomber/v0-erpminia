export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext } from '@/lib/api/auth-session';

// Groups 8-18 = machinery/vehicles in cost_centers
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
};

function normalizeText(val: unknown): string {
  return String(val ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function cleanText(val: unknown): string {
  return String(val ?? '').trim();
}

interface MachineRow {
  code: string;
  name: string;
  status: string;
}

type XlsxModule = {
  read: (buffer: Buffer, options: { type: 'buffer'; cellDates: boolean }) => { Sheets: Record<string, unknown>; SheetNames: string[] };
  utils: {
    sheet_to_json: (sheet: unknown, options: { header: number; defval: string; raw: boolean }) => unknown[][];
  };
};

function parseRows(rows: unknown[][]): { valid: MachineRow[]; errors: string[] } {
  if (!rows.length) return { valid: [], errors: ['Archivo vacio'] };

  const headers = (rows[0] as unknown[]).map(normalizeText);
  const codeIdx = headers.findIndex((h) => h.includes('codigo') || h.includes('code') || h === 'cod');
  const nameIdx = headers.findIndex((h) => h.includes('nombre') || h.includes('name') || h.includes('descripcion'));
  const statusIdx = headers.findIndex((h) => h.includes('estado') || h.includes('status'));

  if (codeIdx === -1) return { valid: [], errors: ['Columna "codigo" no encontrada'] };
  if (nameIdx === -1) return { valid: [], errors: ['Columna "nombre" no encontrada'] };

  const valid: MachineRow[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((row, i) => {
    const rowValues = row as unknown[];
    const code = cleanText(rowValues[codeIdx]);
    const name = cleanText(rowValues[nameIdx]);
    const status = cleanText(rowValues[statusIdx ?? -1]) || 'active';

    if (!code || !name) return;

    if (!code.includes('-')) {
      errors.push(`Fila ${i + 2}: codigo "${code}" debe tener formato X-Y, por ejemplo 8-5`);
      return;
    }

    const parentCode = code.split('-')[0];
    if (!MACHINERY_GROUPS[parentCode]) {
      errors.push(`Fila ${i + 2}: codigo "${code}" - grupo ${parentCode} no es maquinaria (8-18)`);
      return;
    }

    valid.push({ code, name, status: status.toLowerCase().includes('activo') ? 'active' : status });
  });

  return { valid, errors };
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    let rows: unknown[][] = [];

    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const xlsx = (await import('xlsx')) as unknown as XlsxModule;
      const buffer = Buffer.from(await file.arrayBuffer());
      const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as unknown[][];
    } else if (filename.endsWith('.csv')) {
      const text = await file.text();
      rows = text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => line.split(';').map((value) => value.trim()));
    } else {
      return NextResponse.json({ error: 'Formato no soportado. Usa CSV, XLS o XLSX.' }, { status: 400 });
    }

    const { valid, errors } = parseRows(rows);
    if (valid.length === 0) {
      return NextResponse.json({ error: 'No se encontraron filas validas', details: errors }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const orgId = auth.organizationId;

    const upsertRows = valid.map((machine) => ({
      code: machine.code,
      name: machine.name,
      status: machine.status,
      org_id: orgId,
    }));

    const { error: upsertError } = await supabase.from('cost_centers').upsert(upsertRows, { onConflict: 'code,org_id' });
    if (upsertError) throw upsertError;

    return NextResponse.json({
      success: true,
      imported: valid.length,
      warnings: errors,
    });
  } catch (err) {
    console.error('[v0] import-machinery error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error importando maquinaria' }, { status: 500 });
  }
}
