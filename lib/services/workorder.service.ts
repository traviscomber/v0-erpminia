import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export class WorkOrderService {
  static async createWorkOrder(data: {
    organizationId: string;
    assetId: string;
    title: string;
    description: string;
    workType: 'corrective' | 'preventive' | 'predictive';
    priority: 'low' | 'medium' | 'high' | 'critical';
    scheduledDate?: Date;
    plannedDurationHours: number;
    assignedTo?: string;
    createdBy: string;
  }) {
    const supabase = getSupabaseClient();
    const woNumber = `WO-${data.organizationId.slice(0, 4)}-${Date.now()}-${nanoid(3)}`;
    
    const { data: wo, error } = await supabase
      .from('maintenance_work_orders')
      .insert({
        organization_id: data.organizationId,
        work_order_number: woNumber,
        asset_id: data.assetId,
        title: data.title,
        description: data.description,
        work_type: data.workType,
        priority: data.priority,
        status: 'open',
        scheduled_date: data.scheduledDate?.toISOString().split('T')[0],
        planned_duration_hours: data.plannedDurationHours,
        assigned_to: data.assignedTo,
        created_by: data.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return wo;
  }

  static async getWorkOrder(woId: string) {
    const supabase = getSupabaseClient();
    const { data: wo, error } = await supabase
      .from('maintenance_work_orders')
      .select('*, asset:maintenance_assets(*), assignee:users(id, name, email)')
      .eq('id', woId)
      .single();

    if (error) throw error;
    return wo;
  }

  static async listWorkOrders(organizationId: string, filters?: { status?: string; assetId?: string }) {
    let query = supabase
      .from('maintenance_work_orders')
      .select('*, asset:maintenance_assets(asset_name, asset_type)')
      .eq('organization_id', organizationId);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.assetId) query = query.eq('asset_id', filters.assetId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async startWorkOrder(woId: string, technicianId: string) {
    const { error } = await supabase
      .from('maintenance_work_orders')
      .update({ status: 'in_progress', start_date: new Date().toISOString(), assigned_to: technicianId })
      .eq('id', woId);

    if (error) throw error;
  }

  static async completeWorkOrder(woId: string, data: { actualDurationHours: number; rootCause?: string; notes?: string }) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('maintenance_work_orders')
      .update({
        status: 'completed',
        completion_date: now,
        actual_duration_hours: data.actualDurationHours,
        root_cause: data.rootCause,
        preventive_actions: data.notes,
      })
      .eq('id', woId);

    if (error) throw error;
  }

  static async getMTTRStats(organizationId: string) {
    const { data } = await supabase
      .from('maintenance_kpi_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .order('tracking_date', { ascending: false })
      .limit(30);

    if (!data) return null;
    const latest = data[0];
    return {
      averageMTTR: latest?.average_mttr_hours,
      totalDowntime: latest?.total_downtime_hours,
      preventableDowntime: latest?.preventable_downtime_hours,
      maintenanceCost: latest?.maintenance_cost,
    };
  }
}
