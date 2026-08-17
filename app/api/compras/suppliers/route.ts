export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const page = Math.max(Number(request.nextUrl.searchParams.get('page') || 0), 0);
    const pageSize = Math.min(Math.max(Number(request.nextUrl.searchParams.get('pageSize') || 50), 10), 100);
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const offset = page * pageSize;

    let supplierQuery = context.supabase
      .from('canonical_suppliers_v1')
      .select('id, tax_id, legal_name, trade_name, business_activity, payment_terms, address, commune, region, country, phone, email, is_active, validation_status', { count: 'exact' })
      .eq('organization_id', context.organizationId)
      .order('legal_name')
      .range(offset, offset + pageSize - 1);

    if (search) {
      supplierQuery = supplierQuery.or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%,tax_id.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const supplierResult = await supplierQuery;
    if (supplierResult.error) throw supplierResult.error;

    const supplierIds = (supplierResult.data || []).map((supplier) => supplier.id);
    const performanceResult = supplierIds.length
      ? await context.supabase
          .from('supplier_performance')
          .select('supplier_id, purchase_order_count, distinct_product_count, total_spend, average_order_value, last_purchase_date, days_since_last_purchase, warning_order_count, match_status')
          .eq('organization_id', context.organizationId)
          .in('supplier_id', supplierIds)
      : { data: [], error: null };

    if (performanceResult.error) throw performanceResult.error;
    const performanceBySupplier = new Map((performanceResult.data || []).map((row) => [row.supplier_id, row]));
    const suppliers = (supplierResult.data || []).map((supplier) => ({ ...supplier, performance: performanceBySupplier.get(supplier.id) || null }));
    const total = supplierResult.count || 0;

    return NextResponse.json({
      suppliers,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      source: 'public.canonical_suppliers_v1',
      canonical: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible cargar proveedores';
    console.error('[compras/suppliers]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
