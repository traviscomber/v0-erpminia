// Cascade event handlers - cross-module automation
// This file handles the events that cascade across Producción → Mantenimiento → Bodega → Finanzas → HSE

import { createClient } from '@/lib/supabase/client';

export const handleSensorAnomaly = async (sensorId: string, equipmentId: string, anomalyType: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
  try {
    const supabase = createClient();
    
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
      const { data: maintenanceOrder } = await supabase.from('maintenance_orders').insert({
        asset_id: equipmentId,
        order_type: 'correctiva',
        status: 'pendiente',
        priority: severity === 'critical' ? 'critica_seguridad' : 'alta',
        issue_description: `Sensor detected: ${anomalyType}`,
      }).select().single();

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
    const supabase = createClient();
    
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
