export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { attachProductMedia, getProductMedia } from '@/lib/inventory/product-media';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin']);

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const productId = request.nextUrl.searchParams.get('productId');
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const canonical = context.supabase.schema('canonical');

  try {
    if (!productId) {
      let query = canonical
        .from('products')
        .select('id, product_code, name, family, subfamily, unit, standard_cost, minimum_stock, maximum_stock, is_active, validation_status')
        .eq('organization_id', context.organizationId)
        .order('name')
        .limit(80);
      if (q) query = query.or(`product_code.ilike.%${q}%,name.ilike.%${q}%,family.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      const products = data || [];
      const media = await getProductMedia(context.supabase, context.organizationId, products.map((row) => row.id));
      return NextResponse.json({ products: attachProductMedia(products, media) });
    }

    const { data: product, error: productError } = await canonical
      .from('products')
      .select('*')
      .eq('organization_id', context.organizationId)
      .eq('id', productId)
      .single();
    if (productError) throw productError;

    const canManageMedia = ADMIN_ROLES.has(String(context.role || '').toLowerCase());
    const [stockResult, snapshotsResult, movementsResult, workOrdersResult, purchaseLinesResult, receiptLinesResult, returnLinesResult, mediaResult] = await Promise.all([
      context.supabase.from('warehouse_stock').select('id, part_code, part_name, quantity_on_hand, quantity_reserved, quantity_available, reorder_level, reorder_quantity, unit_cost, last_counted_date, expiry_date, batch_number, supplier_lot, bin_id').eq('organization_id', context.organizationId).eq('canonical_product_id', productId).order('quantity_on_hand', { ascending: false }).limit(200),
      canonical.from('inventory_snapshots').select('snapshot_date, warehouse_code, quantity, unit_cost, total_value, family').eq('organization_id', context.organizationId).eq('product_code', product.product_code).order('snapshot_date', { ascending: false }).limit(200),
      context.supabase.from('stock_movements').select('id, movement_type, quantity, reference_doc, reference_id, reason, notes, created_at, work_order_id, canonical_asset_id, unit_cost, total_cost').eq('organization_id', context.organizationId).eq('canonical_product_id', productId).order('created_at', { ascending: false }).limit(200),
      context.supabase.from('work_order_parts').select('id, work_order_id, canonical_asset_id, quantity_requested, quantity_reserved, quantity_issued, quantity_installed, quantity_returned, unit_cost, total_cost, status, installed_at, notes').eq('organization_id', context.organizationId).eq('canonical_product_id', productId).order('created_at', { ascending: false }).limit(200),
      canonical.from('purchase_order_lines').select('id, purchase_order_id, order_number, quantity, unit, unit_cost, net_amount, quantity_received').eq('organization_id', context.organizationId).eq('canonical_product_id', productId).order('imported_at', { ascending: false }).limit(500),
      canonical.from('goods_receipt_lines').select('id, receipt_id, purchase_order_line_id, quantity_received, quantity_accepted, quantity_rejected, batch_number, expiry_date, created_at').eq('organization_id', context.organizationId).eq('canonical_product_id', productId).order('created_at', { ascending: false }).limit(200),
      context.supabase.from('procurement_supplier_return_lines').select('id, return_id, quantity, unit_cost, line_total, created_at').eq('organization_id', context.organizationId).eq('canonical_product_id', productId).order('created_at', { ascending: false }).limit(200),
      getProductMedia(context.supabase, context.organizationId, [productId], canManageMedia),
    ]);

    const firstError = [stockResult, snapshotsResult, movementsResult, workOrdersResult, purchaseLinesResult, receiptLinesResult, returnLinesResult].find((result) => result.error)?.error;
    if (firstError) throw firstError;

    const purchaseOrderIds = Array.from(new Set((purchaseLinesResult.data || []).map((line) => line.purchase_order_id).filter(Boolean)));
    const workOrderIds = Array.from(new Set((workOrdersResult.data || []).map((line) => line.work_order_id).filter(Boolean)));
    const assetIds = Array.from(new Set((workOrdersResult.data || []).map((line) => line.canonical_asset_id).filter(Boolean)));

    const [ordersResult, maintenanceOrdersResult, assetsResult] = await Promise.all([
      purchaseOrderIds.length
        ? canonical.from('purchase_orders').select('id, order_number, order_date, supplier_name, supplier_tax_id, canonical_supplier_id, currency, status, total_amount').eq('organization_id', context.organizationId).in('id', purchaseOrderIds)
        : Promise.resolve({ data: [], error: null }),
      workOrderIds.length
        ? context.supabase.from('maintenance_work_orders').select('id, work_order_number, title, status, priority, completion_date').eq('organization_id', context.organizationId).in('id', workOrderIds)
        : Promise.resolve({ data: [], error: null }),
      assetIds.length
        ? canonical.from('assets').select('id, asset_code, name, asset_type, category').eq('organization_id', context.organizationId).in('id', assetIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const secondaryError = ordersResult.error || maintenanceOrdersResult.error || assetsResult.error;
    if (secondaryError) throw secondaryError;

    const lineByOrder = new Map((purchaseLinesResult.data || []).map((line) => [line.purchase_order_id, line]));
    const supplierMap = new Map<string, { supplier_id: string | null; supplier_name: string; supplier_tax_id: string | null; purchases: number; quantity: number; spend: number; min_unit_cost: number; max_unit_cost: number; last_order_date: string | null }>();
    for (const order of ordersResult.data || []) {
      const line = lineByOrder.get(order.id);
      if (!line) continue;
      const key = order.canonical_supplier_id || order.supplier_tax_id || order.supplier_name || 'sin-proveedor';
      const price = Number(line.unit_cost || 0);
      const current = supplierMap.get(key) || { supplier_id: order.canonical_supplier_id, supplier_name: order.supplier_name || 'Proveedor sin nombre', supplier_tax_id: order.supplier_tax_id, purchases: 0, quantity: 0, spend: 0, min_unit_cost: price, max_unit_cost: price, last_order_date: order.order_date };
      current.purchases += 1;
      current.quantity += Number(line.quantity || 0);
      current.spend += Number(line.net_amount || 0);
      current.min_unit_cost = Math.min(current.min_unit_cost, price);
      current.max_unit_cost = Math.max(current.max_unit_cost, price);
      if (!current.last_order_date || (order.order_date && order.order_date > current.last_order_date)) current.last_order_date = order.order_date;
      supplierMap.set(key, current);
    }

    const stock = stockResult.data || [];
    const summary = {
      quantity_on_hand: stock.reduce((sum, row) => sum + Number(row.quantity_on_hand || 0), 0),
      quantity_reserved: stock.reduce((sum, row) => sum + Number(row.quantity_reserved || 0), 0),
      quantity_available: stock.reduce((sum, row) => sum + Number(row.quantity_available || 0), 0),
      inventory_value: stock.reduce((sum, row) => sum + Number(row.quantity_on_hand || 0) * Number(row.unit_cost || 0), 0),
      lots: stock.filter((row) => row.batch_number).length,
      expiring_lots: stock.filter((row) => row.expiry_date && new Date(row.expiry_date).getTime() <= Date.now() + 90 * 86400000).length,
    };

    return NextResponse.json({
      product,
      media: mediaResult.get(productId) || null,
      canManageMedia,
      summary,
      stock,
      snapshots: snapshotsResult.data || [],
      movements: movementsResult.data || [],
      workOrderUsage: workOrdersResult.data || [],
      maintenanceOrders: maintenanceOrdersResult.data || [],
      assets: assetsResult.data || [],
      purchaseLines: purchaseLinesResult.data || [],
      purchaseOrders: ordersResult.data || [],
      receipts: receiptLinesResult.data || [],
      returns: returnLinesResult.data || [],
      suppliers: Array.from(supplierMap.values()).sort((a, b) => b.spend - a.spend),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la ficha del producto.' }, { status: 500 });
  }
}
