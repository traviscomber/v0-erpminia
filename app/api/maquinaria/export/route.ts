export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext } from '@/lib/api/auth-session';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');

const MACHINERY_GROUPS: Record<string, string> = {
  '8':  'Camionetas',
  '9':  'Camiones',
  '10': 'Cargadores de Bajo Perfil',
  '11': 'Cargadores Frontales',
  '12': 'Camiones de Bajo Perfil',
  '13': 'Grupos Generadores',
  '14': 'Compresores',
  '15': 'Manipuladores Telescópicos',
  '16': 'Equipos de Sondaje',
  '17': 'Equipos de Perforación',
  '18': 'Minicargadores',
  '19': 'Excavadoras',
  '20': 'Otros Equipos',
};

const PARENT_CODES = Object.keys(MACHINERY_GROUPS);

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('cost_centers')
    .select('code, name, status')
    .like('code', '%-%')
    .order('code');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || [])
    .filter((row: any) => PARENT_CODES.includes(row.code.split('-')[0]))
    .map((row: any) => {
      const parentCode = row.code.split('-')[0];
      const yearMatch = row.name.match(/\b(19|20)\d{2}\b/);
      const plateMatch = row.name.match(/[-–]\s*([A-Z0-9]{4,10})\s*$/);
      const model = row.name
        .replace(/\s*[-–]\s*[A-Z0-9]{4,10}\s*$/, '')
        .replace(/\s*\b(19|20)\d{2}\b.*$/, '')
        .trim();

      return {
        'Código CC':     row.code,
        'Nombre Completo': row.name,
        'Modelo':        model,
        'Categoría':     MACHINERY_GROUPS[parentCode] || '',
        'Patente/Serie': plateMatch ? plateMatch[1] : '',
        'Año':           yearMatch ? parseInt(yearMatch[0]) : '',
        'Estado':        row.status === 'active' ? 'Activo' : 'Inactivo',
      };
    });

  // Build workbook with one sheet per category
  const wb = XLSX.utils.book_new();

  // Main sheet — all machines
  const wsAll = XLSX.utils.json_to_sheet(rows);
  wsAll['!cols'] = [
    { wch: 10 }, { wch: 50 }, { wch: 35 }, { wch: 28 },
    { wch: 14 }, { wch: 6 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAll, 'Todos');

  // One sheet per category
  for (const [code, label] of Object.entries(MACHINERY_GROUPS)) {
    const catRows = rows.filter((r) => r['Código CC'].split('-')[0] === code);
    if (catRows.length === 0) continue;
    const ws = XLSX.utils.json_to_sheet(catRows);
    ws['!cols'] = [
      { wch: 10 }, { wch: 50 }, { wch: 35 }, { wch: 28 },
      { wch: 14 }, { wch: 6 }, { wch: 10 },
    ];
    // Truncate sheet name to 31 chars (Excel limit)
    XLSX.utils.book_append_sheet(wb, ws, label.substring(0, 31));
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const date = new Date().toISOString().split('T')[0];
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Maquinaria_Equipos_${date}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
