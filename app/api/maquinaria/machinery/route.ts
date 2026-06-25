export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext } from '@/lib/api/auth-session';

// Groups 8–18 in cost_centers = machinery & vehicles
// Group code (no dash) = category, sub-code (with dash) = individual machine
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

const MACHINERY_PARENT_CODES = Object.keys(MACHINERY_GROUPS); // ['8','9',...,'18']

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const category = searchParams.get('category') || ''; // e.g. "8" (parent group code)

  try {
    // Fetch all cost_center rows where code matches X-Y pattern (individual machines)
    // and the parent group (X) is one of the machinery groups 8-18
    let { data, error } = await supabase
      .from('cost_centers')
      .select('code, name, status, org_id')
      .like('code', '%-%') // only sub-codes (machines), not parent groups
      .order('code');

    if (error) throw error;

    // Filter to only machinery groups (parent = 8-18)
    let machines = (data || []).filter((row: any) => {
      const parentCode = row.code.split('-')[0];
      return MACHINERY_PARENT_CODES.includes(parentCode);
    });

    // Apply search
    if (search) {
      machines = machines.filter((row: any) =>
        row.name.toLowerCase().includes(search) ||
        row.code.toLowerCase().includes(search)
      );
    }

    // Apply category filter
    if (category && MACHINERY_PARENT_CODES.includes(category)) {
      machines = machines.filter((row: any) => row.code.split('-')[0] === category);
    }

    // Shape each machine
    const machinery = machines.map((row: any) => {
      const parentCode = row.code.split('-')[0];
      const categoryName = MACHINERY_GROUPS[parentCode] || 'Maquinaria';

      // Try to extract year from name (4-digit number like 2013, 2021, 2024...)
      const yearMatch = row.name.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? parseInt(yearMatch[0]) : null;

      // Try to extract plate from name (last segment after " - ")
      const plateMatch = row.name.match(/[-–]\s*([A-Z0-9]{4,10})\s*$/);
      const plate = plateMatch ? plateMatch[1] : null;

      // Model = everything before year or plate
      const model = row.name
        .replace(/\s*[-–]\s*[A-Z0-9]{4,10}\s*$/, '')
        .replace(/\s*\b(19|20)\d{2}\b.*$/, '')
        .trim();

      return {
        id: row.code,
        code: row.code,
        name: row.name,
        model,
        plate,
        year,
        category_code: parentCode,
        category: categoryName,
        status: row.status === 'active' ? 'Activo' : 'Inactivo',
      };
    });

    // Build category summary
    const categories = MACHINERY_PARENT_CODES.map((code) => ({
      code,
      name: MACHINERY_GROUPS[code],
      count: machinery.filter((m) => m.category_code === code).length,
    })).filter((c) => c.count > 0);

    return NextResponse.json({
      machinery,
      categories,
      total: machinery.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error fetching machinery' }, { status: 500 });
  }
}
