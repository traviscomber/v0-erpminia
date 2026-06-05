// Cascade event handlers - cross-module automation
// This file handles the events that cascade across Producción → Mantenimiento → Bodega → Finanzas → HSE

import { createClient } from '@supabase/supabase-js';
import { normalizeMaintenancePriority, resolveMaintenanceOrganizationId } from '@/lib/maintenance/work-order-compat';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export const handleSensorAnomaly = async (sensorId: string, equipmentId: string, anomalyType: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
  try {
    const supabase = getSupabaseClient();
    
    // 1. Create HSE Alert
    const { data: hseAlert } = await supabase.from('hse_alerts').insert({
      type: 'production_anomaly',
      title: `Sensor Anomaly: ${anomalyType}`,
      severity: severity === 'critical' ? 'critical' : 'high',
      equipment_id: equipmentId,
      read: false,
    }).select().single();

    // 2. Create Maintenance Order if critical
    if (severity === 'critical' || severity === 'high') {
      const organizationId = await resolveMaintenanceOrganizationId(supabase, equipmentId);
      let maintenanceOrder = null;

      if (organizationId) {
        const workOrderNumber = `AUTO-WO-${Date.now()}`;
        const result = await supabase
          .from('maintenance_work_orders')
          .insert({
            organization_id: organizationId,
            asset_id: equipmentId,
            work_order_number: workOrderNumber,
            title: `Alerta automatica: ${anomalyType}`,
            description: `Sensor detected: ${anomalyType}`,
            work_type: 'corrective',
            status: 'open',
            priority: normalizeMaintenancePriority(severity === 'critical' ? 'critical' : 'high'),
            scheduled_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        maintenanceOrder = result.data;
      }

      return { maintenanceOrder, hseAlert };
    }

    return { hseAlert };
  } catch (error) {
    console.error('[v0] Error in handleSensorAnomaly:', error);
    throw error;
  }
};

export const handleEquipmentDowntime = async (equipmentId: string, downtimeMinutes: number) => {
  try {
    const supabase = getSupabaseClient();
    
    // Create incident record
    const { data: incident } = await supabase.from('incidents').insert({
      type: 'equipment_downtime',
      equipment_id: equipmentId,
      status: 'open',
      downtime_minutes: downtimeMinutes,
    }).select().single();

    return { incident };
  } catch (error) {
    console.error('[v0] Error in handleEquipmentDowntime:', error);
    throw error;
  }
};
