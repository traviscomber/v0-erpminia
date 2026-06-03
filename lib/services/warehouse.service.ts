import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export class WarehouseService {
  static async createZone(organizationId: string, zoneCode: string, zoneName: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('warehouse_zones')
      .insert({ organization_id: organizationId, zone_code: zoneCode, zone_name: zoneName })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async createRack(zoneId: string, rackCode: string, rackName: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('warehouse_racks')
      .insert({ zone_id: zoneId, rack_code: rackCode, rack_name: rackName })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async createBin(rackId: string, binCode: string, binLocation: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('warehouse_bins')
      .insert({ rack_id: rackId, bin_code: binCode, bin_location: binLocation })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getWarehouseStructure(organizationId: string) {
    const supabase = getSupabaseClient();
    const { data: zones } = await supabase
      .from('warehouse_zones')
      .select('*, racks:warehouse_racks(*)')
      .eq('organization_id', organizationId);
    return zones || [];
  }

  static async getBinById(binId: string) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('warehouse_bins')
      .select('*, rack:warehouse_racks(*)')
      .eq('id', binId)
      .single();
    return data;
  }

  static async getZoneStats(zoneId: string) {
    const supabase = getSupabaseClient();
    const { data: bins } = await supabase
      .from('warehouse_bins')
      .select('current_stock, capacity_units')
      .eq('zone_id', zoneId);

    if (!bins) return { totalCapacity: 0, utilization: 0 };
    const total = bins.reduce((sum, b) => sum + (b.current_stock || 0), 0);
    const capacity = bins.reduce((sum, b) => sum + (b.capacity_units || 0), 0);
    return { totalCapacity: capacity, utilization: total, utilizationPercent: (total / capacity) * 100 };
  }
}
