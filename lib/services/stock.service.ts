import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class StockService {
  static async addStock(organizationId: string, partCode: string, quantity: number, binId?: string, unitCost?: number) {
    const { data, error } = await supabase
      .from('warehouse_stock')
      .insert({
        organization_id: organizationId,
        part_code: partCode,
        quantity_on_hand: quantity,
        bin_id: binId,
        unit_cost: unitCost,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateStock(stockId: string, updates: any) {
    const { data, error } = await supabase
      .from('warehouse_stock')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', stockId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getStock(stockId: string) {
    const { data } = await supabase
      .from('warehouse_stock')
      .select('*, bin:warehouse_bins(*)')
      .eq('id', stockId)
      .single();
    return data;
  }

  static async listStockByOrganization(organizationId: string, filters?: { binId?: string; partCode?: string }) {
    let query = supabase.from('warehouse_stock').select('*, bin:warehouse_bins(*)').eq('organization_id', organizationId);
    if (filters?.binId) query = query.eq('bin_id', filters.binId);
    if (filters?.partCode) query = query.eq('part_code', filters.partCode);
    const { data } = await query;
    return data || [];
  }

  static async getLowStockAlerts(organizationId: string) {
    const { data } = await supabase
      .from('warehouse_stock')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('reorder_level', 'quantity_on_hand');
    return data || [];
  }

  static async getStockValue(organizationId: string) {
    const { data } = await supabase
      .from('warehouse_stock')
      .select('quantity_on_hand, unit_cost')
      .eq('organization_id', organizationId);
    if (!data) return 0;
    return data.reduce((sum, s) => sum + ((s.quantity_on_hand || 0) * (s.unit_cost || 0)), 0);
  }
}
