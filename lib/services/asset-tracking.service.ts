import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

function getSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars");
  return createClient(supabaseUrl, supabaseKey);
}

export class AssetTrackingService {
  static async registerAsset(data: {
    organizationId: string;
    assetCode: string;
    assetName: string;
    assetType: string;
    location: string;
    acquisitionDate: Date;
    acquisitionCost: number;
    criticality: 'low' | 'medium' | 'high' | 'critical';
    mtbfHours?: number;
  }) {
    const supabase = getSupabaseClient();
    const { data: asset, error } = await supabase
      .from('maintenance_assets')
      .insert({
        organization_id: data.organizationId,
        asset_code: data.assetCode,
        asset_name: data.assetName,
        asset_type: data.assetType,
        location: data.location,
        status: 'active',
        acquisition_date: data.acquisitionDate.toISOString().split('T')[0],
        acquisition_cost: data.acquisitionCost,
        criticality: data.criticality,
        mtbf_hours: data.mtbfHours,
      })
      .select()
      .single();

    if (error) throw error;
    return asset;
  }

  static async getAsset(assetId: string) {
    const { data } = await supabase
      .from('maintenance_assets')
      .select('*')
      .eq('id', assetId)
      .single();

    return data;
  }

  static async listAssets(organizationId: string, filters?: { criticality?: string; status?: string }) {
    let query = supabase.from('maintenance_assets').select('*').eq('organization_id', organizationId);

    if (filters?.criticality) query = query.eq('criticality', filters.criticality);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data } = await query.order('criticality', { ascending: false });
    return data || [];
  }

  static async getAssetMaintenanceHistory(assetId: string, limit: number = 10) {
    const { data } = await supabase
      .from('maintenance_history')
      .select('*, technician:users(name, email)')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  static async getAssetKPIs(assetId: string) {
    const { data: history } = await supabase
      .from('maintenance_history')
      .select('labor_hours, parts_cost, labor_cost')
      .eq('asset_id', assetId);

    const totalLabor = history?.reduce((sum, h) => sum + (h.labor_hours || 0), 0) || 0;
    const totalPartsSpent = history?.reduce((sum, h) => sum + (h.parts_cost || 0), 0) || 0;
    const totalLaborCost = history?.reduce((sum, h) => sum + (h.labor_cost || 0), 0) || 0;
    const totalCost = totalPartsSpent + totalLaborCost;

    return {
      totalMaintenanceActions: history?.length || 0,
      totalLabor: totalLabor,
      totalCost: totalCost,
      avgCostPerMaintenance: totalCost / (history?.length || 1),
    };
  }

  static async updateAssetStatus(assetId: string, status: 'active' | 'inactive' | 'maintenance' | 'decommissioned') {
    const { error } = await supabase.from('maintenance_assets').update({ status }).eq('id', assetId);

    if (error) throw error;
  }

  static async getAssetsByLocation(organizationId: string, location: string) {
    const { data } = await supabase
      .from('maintenance_assets')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('location', location);

    return data || [];
  }
}
