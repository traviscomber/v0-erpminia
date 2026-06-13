'use server';

import { createClient } from '@/lib/supabase/server';
import {
  buildCreateMaintenanceWorkOrderPayload,
  buildUpdateMaintenanceWorkOrderPayload,
  getMaintenanceActionAuthContext,
  mapMaintenanceWorkOrderToLegacy,
  resolveMaintenanceOrganizationId,
} from '@/lib/maintenance/work-order-compat';
import { revalidateTag } from 'next/cache';

// Wear Parts (Bodega) Actions
export async function getWearParts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('wear_parts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data;
}

export async function createWearPart(partData: {
  part_code: string;
  part_name: string;
  description: string;
  unit_cost: number;
  stock_min: number;
  stock_current: number;
  supplier: string;
  lead_time_days: number;
  is_critical: boolean;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('wear_parts')
    .insert([partData])
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  revalidateTag('wear-parts', 'max');
  return data;
}

export async function updateWearPart(
  id: string,
  updates: Partial<{
    part_code: string;
    part_name: string;
    description: string;
    unit_cost: number;
    stock_min: number;
    stock_current: number;
    supplier: string;
    lead_time_days: number;
    is_critical: boolean;
  }>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('wear_parts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  revalidateTag('wear-parts', 'max');
  return data;
}

// Maintenance Orders Actions
export async function getMaintenanceOrders() {
  const supabase = await createClient();
  const auth = await getMaintenanceActionAuthContext();
  if (!auth.organizationId) {
    throw new Error('Unauthorized maintenance access');
  }

  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .select('*, asset:maintenance_assets(id, asset_name, asset_code, asset_type)')
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return (data || []).map(mapMaintenanceWorkOrderToLegacy);
}

export async function createMaintenanceOrder(orderData: {
  order_number: string;
  title: string;
  description: string;
  vehicle_id: string;
  assigned_to: string;
  maintenance_type: string;
  priority: string;
  status: string;
  estimated_hours: number;
  estimated_cost: number;
}) {
  const supabase = await createClient();
  const payload = buildCreateMaintenanceWorkOrderPayload(orderData);
  const auth = await getMaintenanceActionAuthContext();
  if (!auth.organizationId) {
    throw new Error('Unauthorized maintenance access');
  }

  const assetOrganizationId = await resolveMaintenanceOrganizationId(supabase, payload.asset_id);
  const organizationId = assetOrganizationId || auth.organizationId;

  if (assetOrganizationId && assetOrganizationId !== auth.organizationId) {
    throw new Error('Asset does not belong to the current organization');
  }

  if (!organizationId) {
    throw new Error('No se pudo resolver la organización para la orden de mantenimiento. Selecciona primero un activo.');
  }

  if (!payload.work_order_number) {
    const { count } = await supabase
      .from('maintenance_work_orders')
      .select('*', { head: true, count: 'exact' })
      .eq('organization_id', organizationId);

    payload.work_order_number = `MO-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
  }

  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .insert([
      {
        organization_id: organizationId,
        created_by: auth.userId || null,
        ...payload,
      },
    ])
    .select('*, asset:maintenance_assets(id, asset_name, asset_code, asset_type)')
    .single();
  
  if (error) throw new Error(error.message);
  revalidateTag('maintenance-orders', 'max');
  return mapMaintenanceWorkOrderToLegacy(data);
}

export async function updateMaintenanceOrder(
  id: string,
  updates: {
    order_number: string;
    title: string;
    description: string;
    vehicle_id: string;
    assigned_to: string;
    maintenance_type: string;
    priority: string;
    status: string;
    estimated_hours: number;
    estimated_cost: number;
  }
) {
  const supabase = await createClient();
  const auth = await getMaintenanceActionAuthContext();
  if (!auth.organizationId) {
    throw new Error('Unauthorized maintenance access');
  }

  const payload = buildUpdateMaintenanceWorkOrderPayload(updates);
  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select('*, asset:maintenance_assets(id, asset_name, asset_code, asset_type)')
    .single();
  
  if (error) throw new Error(error.message);
  revalidateTag('maintenance-orders', 'max');
  return mapMaintenanceWorkOrderToLegacy(data);
}

// Equipment Readings (Producción)
export async function getSensorReadings(equipmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('timestamp', { ascending: false })
    .limit(100);
  
  if (error) throw new Error(error.message);
  return data;
}

export async function createAlarm(alarmData: {
  equipment_id: string;
  sensor_id: string;
  severity: string;
  message: string;
  alarm_type: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alarms')
    .insert([alarmData])
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  revalidateTag('alarms', 'max');
  return data;
}

// HSE & Incidents
export async function getIncidents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('date_occurred', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data;
}

export async function reportIncident(incidentData: {
  incident_number: string;
  incident_type: string;
  severity: string;
  description: string;
  location: string;
  date_occurred: string;
  reported_by: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('incidents')
    .insert([incidentData])
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  revalidateTag('incidents', 'max');
  return data;
}
