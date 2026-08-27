export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const requestId = request.nextUrl.searchParams.get('requestId');

    let quoteQuery = context.supabase
      .from('canonical_supplier_quotations_v1')
      .select('id, quotation_number, request_id, supplier_id, quotation_date, currency, total_amount, lead_time_days, payment_terms, status')
      .eq('organization_id', context.organizationId)
      .eq('status', 'received')
      .order('quotation_date', { ascending: false })
      .limit(100);

    if (requestId) quoteQuery = quoteQuery.eq('request_id', requestId);

    const { data: quotations, error: quoteError } = await quoteQuery;
    if (quoteError) throw quoteError;

    const rows = quotations || [];
    const supplierIds = Array.from(new Set(rows.map((row) => row.supplier_id).filter(Boolean))) as string[];
    const requestIds = Array.from(new Set(rows.map((row) => row.request_id).filter(Boolean))) as string[];

    const [suppliersResult, scoresResult, requestsResult] = await Promise.all([
      supplierIds.length
        ? context.supabase.from('canonical_suppliers_v1').select('id, tax_id, legal_name, trade_name').eq('organization_id', context.organizationId).in('id', supplierIds)
        : Promise.resolve({ data: [], error: null }),
      supplierIds.length
        ? context.supabase.from('supplier_operational_score_v2').select('supplier_id, operational_score, evidence_dimensions, delivery_score, delivery_scored_orders, quality_score, quantity_received, invoice_score, invoice_scored_count, returns_count').eq('organization_id', context.organizationId).in('supplier_id', supplierIds)
        : Promise.resolve({ data: [], error: null }),
      requestIds.length
        ? context.supabase.from('canonical_procurement_requests_v1').select('id, request_number, priority, required_date, status').eq('organization_id', context.organizationId).in('id', requestIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const firstError = suppliersResult.error || scoresResult.error || requestsResult.error;
    if (firstError) throw firstError;

    const supplierById = new Map((suppliersResult.data || []).map((row) => [row.id, row]));
    const scoreBySupplier = new Map((scoresResult.data || []).map((row) => [row.supplier_id, row]));
    const requestById = new Map((requestsResult.data || []).map((row) => [row.id, row]));

    const evidence = rows.map((quote) => ({
      ...quote,
      supplier: supplierById.get(quote.supplier_id) || null,
      performance: scoreBySupplier.get(quote.supplier_id) || null,
      request: requestById.get(quote.request_id) || null,
    }));

    return NextResponse.json({ evidence });
  } catch (error) {
    console.error('[procurement/award-evidence]', error);
    const message = error instanceof Error ? error.message : 'No se pudo cargar evidencia de adjudicación.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
