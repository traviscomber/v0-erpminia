export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getRedistributableMachineAssignment } from '@/lib/maintenance/cost-center-machines';
import { isActiveCostCenterStatus } from '@/lib/cost-centers';

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

const MACHINERY_PARENT_CODES = Object.keys(MACHINERY_GROUPS);

type CostCenterRow = {
  code: string | null;
  name: string | null;
  status: string | null;
};

type MachineryRow = {
  id: string;
  code: string;
  name: string;
  model: string;
  plate: string | null;
  year: number | null;
  category_code: string;
  category: string;
  status: string;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim();
}

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const { searchParams } = new URL(request.url);
  const search = normalizeText(searchParams.get('search')).toLowerCase();
  const category = normalizeText(searchParams.get('category'));

  try {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('code, name, status')
      .like('code', '%-%')
      .order('code');

    if (error) throw error;

    const rows = Array.isArray(data) ? (data as CostCenterRow[]) : [];

    let machines = rows.filter((row) => {
      const code = normalizeText(row.code);
      const parentCode = code.split('-')[0];
      return MACHINERY_PARENT_CODES.includes(parentCode) || !!getRedistributableMachineAssignment(code);
    });

    if (search) {
      machines = machines.filter((row) =>
        normalizeText(row.name).toLowerCase().includes(search) ||
        normalizeText(row.code).toLowerCase().includes(search)
      );
    }

    if (category && MACHINERY_PARENT_CODES.includes(category)) {
      machines = machines.filter((row) => normalizeText(row.code).split('-')[0] === category);
    }

    const machinery: MachineryRow[] = machines
      .map((row) => {
        const code = normalizeText(row.code);
        const name = normalizeText(row.name);
        const override = getRedistributableMachineAssignment(code);
        const parentCode = override?.rootCode || code.split('-')[0];
        const categoryName = override?.family || MACHINERY_GROUPS[parentCode] || 'Maquinaria';

        const yearMatch = name.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? Number.parseInt(yearMatch[0], 10) : null;

        const plateMatch = name.match(/[-–]\s*([A-Z0-9]{4,10})\s*$/);
        const plate = plateMatch ? plateMatch[1] : null;

        const model = name
          .replace(/\s*[-–]\s*[A-Z0-9]{4,10}\s*$/, '')
          .replace(/\s*\b(19|20)\d{2}\b.*$/, '')
          .trim();

        return {
          id: code,
          code,
          name,
          model,
          plate,
          year,
          category_code: parentCode,
          category: categoryName,
        status: isActiveCostCenterStatus(row.status) ? 'Activo' : 'Inactivo',
      };
    })
      .filter((item) => item.code.length > 0 && item.name.length > 0);

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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching machinery';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
