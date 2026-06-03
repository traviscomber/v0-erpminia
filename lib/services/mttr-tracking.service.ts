import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars");
  return createClient(supabaseUrl, supabaseKey);
}

export class MTTRTrackingService {
  static async calculateMTTR(organizationId: string, assetId?: string) {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('maintenance_work_orders')
      .select('actual_duration_hours')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .is('actual_duration_hours', 'not.is.null');

    if (assetId) query = query.eq('asset_id', assetId);

    const { data } = await query;

    if (!data || data.length === 0) return 0;

    const total = data.reduce((sum: number, wo: any) => sum + (wo.actual_duration_hours || 0), 0);
    return total / data.length;
  }

  static async calculateTotalDowntime(organizationId: string, assetId?: string, daysBack: number = 30) {
    const supabase = getSupabaseClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    let query = supabase
      .from('maintenance_work_orders')
      .select('down_time_hours')
      .eq('organization_id', organizationId)
      .gte('completion_date', startDate.toISOString());

    if (assetId) query = query.eq('asset_id', assetId);

    const { data } = await query;

    if (!data) return 0;
    return data.reduce((sum: number, wo: any) => sum + (wo.down_time_hours || 0), 0);
  }

  static async recordMaintenance(data: {
    workOrderId: string;
    assetId: string;
    performedBy: string;
    performedByName: string;
    laborHours: number;
    laborCost: number;
    partsCost: number;
    partsReplaced?: string;
    notes?: string;
  }) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('maintenance_history').insert({
      work_order_id: data.workOrderId,
      asset_id: data.assetId,
      performed_by: data.performedBy,
      performed_by_name: data.performedByName,
      labor_hours: data.laborHours,
      labor_cost: data.laborCost,
      parts_cost: data.partsCost,
      parts_replaced: data.partsReplaced,
      notes: data.notes,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
    });

    if (error) throw error;
  }

  static async getDashboardStats(organizationId: string) {
    const supabase = getSupabaseClient();
    const [mttr, downtime, woCount] = await Promise.all([
      this.calculateMTTR(organizationId),
      this.calculateTotalDowntime(organizationId),
      supabase
        .from('maintenance_work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'completed'),
    ]);

    return {
      averageMTTR: Math.round(mttr * 10) / 10,
      totalDowntime30d: Math.round(downtime * 10) / 10,
      completedWorkOrders: woCount.count || 0,
      availability: Math.max(0, 100 - (downtime / (30 * 24)) * 100),
    };
  }

  static async getMTTRTrend(organizationId: string, daysBack: number = 30) {
    const supabase = getSupabaseClient();
    const dates = [];
    for (let i = 0; i < daysBack; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const { data } = await supabase
      .from('maintenance_work_orders')
      .select('completion_date, actual_duration_hours')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('completion_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

    const trend = dates.map((date) => {
      const dayData = data?.filter((wo: any) => wo.completion_date?.includes(date)) || [];
      const avg =
        dayData.length > 0
          ? dayData.reduce((sum: number, wo: any) => sum + (wo.actual_duration_hours || 0), 0) / dayData.length
          : 0;
      return { date, mttr: Math.round(avg * 10) / 10 };
    });

    return trend.reverse();
  }
}
