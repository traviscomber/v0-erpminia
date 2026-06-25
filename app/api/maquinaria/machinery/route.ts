export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext } from '@/lib/api/auth-session';

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const orgId = auth.organizationId;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || ''; // 'equipment', 'vehicle', or empty for all

  const validPageSize = Math.min(Math.max(pageSize, 10), 500);
  const validPage = Math.max(page, 0);
  const offset = validPage * validPageSize;

  try {
    // Fetch equipment
    let equipmentQuery = supabase
      .from('equipment')
      .select('id, code, name, type, model, status, criticality, created_at', { count: 'exact' });

    if (search) {
      equipmentQuery = equipmentQuery.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: equipment, error: eqError, count: eqCount } = await equipmentQuery
      .order('name')
      .range(offset, offset + validPageSize - 1);

    if (eqError) throw eqError;

    // Fetch vehicles
    let vehiclesQuery = supabase
      .from('vehicles')
      .select('id, code, name, vehicle_type, model, year, status, created_at', { count: 'exact' });

    if (search) {
      vehiclesQuery = vehiclesQuery.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: vehicles, error: vhError, count: vhCount } = await vehiclesQuery
      .order('name')
      .range(offset, offset + validPageSize - 1);

    if (vhError) throw vhError;

    // Combine and format
    const allMachinery = [
      ...(equipment || []).map((item: any) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        type: item.type || 'Equipment',
        model: item.model,
        status: item.status || 'Activo',
        criticality: item.criticality,
        category: 'Equipo',
      })),
      ...(vehicles || []).map((item: any) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        type: item.vehicle_type || 'Vehículo',
        model: item.model,
        year: item.year,
        status: item.status || 'Disponible',
        category: 'Vehículo',
      })),
    ];

    const totalCount = (eqCount || 0) + (vhCount || 0);
    const totalPages = Math.ceil(totalCount / validPageSize);

    return NextResponse.json({
      machinery: allMachinery,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('[v0] machinery API error:', error);
    return NextResponse.json({ error: error.message || 'Error fetching machinery' }, { status: 500 });
  }
}
