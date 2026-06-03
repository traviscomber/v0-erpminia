import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars");
  return createClient(supabaseUrl, supabaseKey);
}

export class PreventiveMaintenanceService {
  static async createSchedule(data: {
    organizationId: string;
    assetId: string;
    taskName: string;
    description?: string;
    frequencyDays: number;
    estimatedDurationHours: number;
    priority?: 'low' | 'medium' | 'high';
  }) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + data.frequencyDays);

    const { data: schedule, error } = await supabase
      .from('preventive_maintenance_schedules')
      .insert({
        organization_id: data.organizationId,
        asset_id: data.assetId,
        task_name: data.taskName,
        description: data.description,
        frequency_days: data.frequencyDays,
        estimated_duration_hours: data.estimatedDurationHours,
        priority: data.priority || 'medium',
        next_scheduled_date: nextDate.toISOString().split('T')[0],
        enabled: true,
      })
      .select()
      .single();

    if (error) throw error;
    return schedule;
  }

  static async getDueSchedules(organizationId: string, days: number = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data } = await supabase
      .from('preventive_maintenance_schedules')
      .select('*, asset:maintenance_assets(asset_name, criticality)')
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .lte('next_scheduled_date', futureDate.toISOString().split('T')[0])
      .gte('next_scheduled_date', new Date().toISOString().split('T')[0])
      .order('next_scheduled_date', { ascending: true });

    return data || [];
  }

  static async markAsExecuted(scheduleId: string) {
    const { data: schedule } = await supabase
      .from('preventive_maintenance_schedules')
      .select('frequency_days')
      .eq('id', scheduleId)
      .single();

    if (!schedule) return;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + schedule.frequency_days);

    const { error } = await supabase
      .from('preventive_maintenance_schedules')
      .update({
        last_executed_date: new Date().toISOString().split('T')[0],
        next_scheduled_date: nextDate.toISOString().split('T')[0],
      })
      .eq('id', scheduleId);

    if (error) throw error;
  }

  static async getSchedulesForAsset(assetId: string) {
    const { data } = await supabase
      .from('preventive_maintenance_schedules')
      .select('*')
      .eq('asset_id', assetId)
      .order('next_scheduled_date', { ascending: true });

    return data || [];
  }

  static async getScheduleStats(organizationId: string) {
    const { data: all } = await supabase
      .from('preventive_maintenance_schedules')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('enabled', true);

    const { data: due } = await supabase
      .from('preventive_maintenance_schedules')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .lte('next_scheduled_date', new Date().toISOString().split('T')[0]);

    return {
      totalSchedules: all?.length || 0,
      overdue: due?.length || 0,
    };
  }
}
