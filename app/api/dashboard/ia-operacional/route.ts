import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// IA Operacional API - Mining operational intelligence
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get critical equipment (risks)
    const { data: criticalEquip } = await supabase
      .from('equipment')
      .select('*')
      .eq('status', 'warning');

    // Get expiring documents
    const { data: expiringDocs } = await supabase
      .from('contracts')
      .select('*')
      .lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

    // Get critical stock items
    const { data: criticalStock } = await supabase
      .from('wear_parts')
      .select('*')
      .lte('stock_current', supabase.rpc('stock_min'));

    // Get pending maintenance
    const { data: pendingMaint } = await supabase
      .from('maintenance_orders')
      .select('*')
      .eq('status', 'pendiente');

    // Get overdue purchase orders
    const { data: overduePO } = await supabase
      .from('procurement_documents')
      .select('*')
      .lt('due_date', new Date().toISOString());

    return NextResponse.json({
      insights: {
        equipment_risks: criticalEquip?.length || 0,
        expiring_documents: expiringDocs?.length || 0,
        critical_stock_items: criticalStock?.length || 0,
        pending_maintenance: pendingMaint?.length || 0,
        overdue_purchase_orders: overduePO?.length || 0,
      },
      details: {
        critical_equipment: criticalEquip || [],
        expiring_documents: expiringDocs || [],
        critical_stock: criticalStock || [],
        pending_maintenance: pendingMaint || [],
        overdue_orders: overduePO || [],
      },
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/ia-operacional error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
