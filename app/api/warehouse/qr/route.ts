export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const value = request.nextUrl.searchParams.get('value');
    if (!value) {
      return NextResponse.json({ error: 'value is required' }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from('qr_codes')
      .select('*, stock:warehouse_stock(*), bin:warehouse_bins(*)')
      .eq('organization_id', context.organizationId)
      .eq('qr_code_value', value)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    await Promise.allSettled([
      context.supabase
        .from('qr_codes')
        .update({
          scans_count: Number(data.scans_count || 0) + 1,
          last_scan_date: new Date().toISOString(),
        })
        .eq('id', data.id),
      context.supabase.from('qr_scan_logs').insert({
        qr_code_id: data.id,
        scanned_by: null,
        action: 'view',
        bin_id_before: data.bin_id,
        bin_id_after: data.bin_id,
        notes: `Scanned by ${context.userName || context.userEmail || context.userId}`,
      }),
    ]);

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scan QR code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const stockId = body.stockId || body.stock_id;
    const binId = body.binId || body.bin_id || null;

    if (!stockId) {
      return NextResponse.json({ error: 'stockId is required' }, { status: 400 });
    }

    const { data: stock, error: stockError } = await context.supabase
      .from('warehouse_stock')
      .select('id')
      .eq('id', stockId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    if (stockError) throw stockError;
    if (!stock) {
      return NextResponse.json({ error: 'Stock item not found' }, { status: 404 });
    }

    const qrValue = `QR-${context.organizationId.slice(0, 8)}-${stockId.slice(0, 8)}-${nanoid(6)}`;

    const { data, error } = await context.supabase
      .from('qr_codes')
      .insert({
        organization_id: context.organizationId,
        qr_code_value: qrValue,
        stock_id: stockId,
        bin_id: binId,
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ ...data, qrValue }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate QR code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
