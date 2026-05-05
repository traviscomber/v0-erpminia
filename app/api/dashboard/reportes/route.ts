import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Reportes Module - Dynamic report builder, export PDF/Excel
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type'); // 'maintenance', 'production', 'equipment', 'financial'

    let data = null;

    if (reportType === 'maintenance') {
      const { data: d } = await supabase
        .from('maintenance_orders')
        .select('*')
        .order('created_at', { ascending: false });
      data = d;
    } else if (reportType === 'production') {
      const { data: d } = await supabase
        .from('sensor_readings')
        .select('*, sensors(*)')
        .order('timestamp', { ascending: false })
        .limit(100);
      data = d;
    } else if (reportType === 'equipment') {
      const { data: d } = await supabase
        .from('equipment')
        .select('*, equipment_availability(*)')
        .order('updated_at', { ascending: false });
      data = d;
    } else if (reportType === 'financial') {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });
      const { data: expenses } = await supabase
        .from('procurement_documents')
        .select('*')
        .order('issue_date', { ascending: false });
      data = { contracts, expenses };
    }

    return NextResponse.json({ 
      report: data || [],
      report_type: reportType,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/reportes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
