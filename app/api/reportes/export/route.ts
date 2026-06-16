export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { report_type, start_date, end_date } = await request.json();

    let data = [];
    
    switch(report_type) {
      case 'maintenance':
        const { data: woData } = await context.supabase
          .from('maintenance_work_orders')
          .select('*')
          .eq('organization_id', context.organizationId)
          .gte('created_at', start_date)
          .lte('created_at', end_date);
        data = woData || [];
        break;
      
      case 'hse':
        const { data: hseData } = await context.supabase
          .from('hse_incidents')
          .select('*')
          .eq('organization_id', context.organizationId)
          .gte('created_at', start_date)
          .lte('created_at', end_date);
        data = hseData || [];
        break;
      
      case 'audit':
        const { data: auditData } = await context.supabase
          .from('stock_movements')
          .select('*')
          .eq('organization_id', context.organizationId)
          .gte('created_at', start_date)
          .lte('created_at', end_date);
        data = auditData || [];
        break;
    }

    const csv_data = generateCSV(data, report_type);
    
    return NextResponse.json({
      report: {
        type: report_type,
        period: `${start_date} to ${end_date}`,
        row_count: data.length,
        csv_ready: true,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

function generateCSV(data: any[], type: string): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => row[h] || '').join(','));
  return [headers.join(','), ...rows].join('\n');
}
