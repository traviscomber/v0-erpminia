export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES);
  if (access !== 'LEC' && access !== 'ED') {
    return NextResponse.json({ error: 'Acceso a Mantención no autorizado para este usuario' }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (q.length < 2) return NextResponse.json({ rows: [] });

  const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (safe.length < 2) return NextResponse.json({ rows: [] });

  try {
    const { data, error } = await context.supabase
      .from('inventory_intelligence_position_v1')
      .select('product_id,product_code,product_name,family,unit,quantity_available,warehouse_code,validation_status')
      .eq('organization_id', context.organizationId)
      .or(`product_code.ilike.%${safe}%,product_name.ilike.%${safe}%`)
      .limit(80);

    if (error) throw error;

    const grouped = new Map<string, {
      productId: string;
      productCode: string | null;
      productName: string | null;
      family: string | null;
      unit: string | null;
      quantityAvailable: number;
      warehouses: Set<string>;
    }>();

    for (const row of data || []) {
      if (!row.product_id) continue;
      const current = grouped.get(row.product_id) || {
        productId: row.product_id,
        productCode: row.product_code || null,
        productName: row.product_name || null,
        family: row.family || null,
        unit: row.unit || null,
        quantityAvailable: 0,
        warehouses: new Set<string>(),
      };
      current.quantityAvailable += Number(row.quantity_available || 0);
      if (row.warehouse_code) current.warehouses.add(row.warehouse_code);
      grouped.set(row.product_id, current);
    }

    const rows = [...grouped.values()]
      .map((row) => ({ ...row, warehouses: [...row.warehouses].sort() }))
      .sort((a, b) => {
        const aCode = (a.productCode || '').toLowerCase();
        const bCode = (b.productCode || '').toLowerCase();
        const needle = safe.toLowerCase();
        const aExact = aCode === needle ? 0 : aCode.startsWith(needle) ? 1 : 2;
        const bExact = bCode === needle ? 0 : bCode.startsWith(needle) ? 1 : 2;
        return aExact - bExact || (a.productName || '').localeCompare(b.productName || '', 'es');
      })
      .slice(0, 20);

    return NextResponse.json({ rows, source: 'public.inventory_intelligence_position_v1' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo buscar el catálogo de materiales' }, { status: 500 });
  }
}
