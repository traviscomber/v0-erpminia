import { getSupabaseClient } from '@/lib/db/supabase';
import type { MaintenanceOrder } from '@/lib/types';

export const maintenanceService = {
  // Get all maintenance orders
  async getMaintenanceOrders(siteId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('maintenance_orders')
      .select('*, asset:assets(name, code), technician:users(full_name), cost_center:cost_centers(name)')
      .eq('asset.site_id', siteId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get maintenance orders by status
  async getMaintenanceOrdersByStatus(siteId: string, status: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('maintenance_orders')
      .select('*, asset:assets(name, code), technician:users(full_name)')
      .eq('asset.site_id', siteId)
      .eq('status', status)
      .order('scheduled_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Create maintenance order
  async createMaintenanceOrder(order: Omit<MaintenanceOrder, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('maintenance_orders')
      .insert([order])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update maintenance order
  async updateMaintenanceOrder(id: string, updates: Partial<MaintenanceOrder>) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('maintenance_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get maintenance order details with spare parts
  async getMaintenanceOrderDetails(orderId: string) {
    const supabase = getSupabaseClient();
    const { data: order, error: orderError } = await supabase
      .from('maintenance_orders')
      .select('*, spare_parts:maintenance_spare_parts(*, item:inventory_items(name, sku, unit_cost))')
      .eq('id', orderId)
      .single();
    
    if (orderError) throw orderError;
    return order;
  },

  // Add spare part to maintenance order
  async addSparePart(orderId: string, itemId: string, quantity: number) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('maintenance_spare_parts')
      .insert([{ maintenance_order_id: orderId, inventory_item_id: itemId, quantity }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Calculate MTBF (Mean Time Between Failures)
  async calculateMTBF(assetId: string) {
    const supabase = getSupabaseClient();
    const { data: orders, error } = await supabase
      .from('maintenance_orders')
      .select('scheduled_date, completion_date')
      .eq('asset_id', assetId)
      .eq('status', 'completed')
      .order('completion_date', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (!orders || orders.length < 2) return null;
    
    const intervals: number[] = [];
    for (let i = 0; i < orders.length - 1; i++) {
      const current = new Date(orders[i].completion_date).getTime();
      const previous = new Date(orders[i + 1].completion_date).getTime();
      intervals.push((current - previous) / (1000 * 60 * 60)); // Convert to hours
    }
    
    const mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return mtbf;
  },

  // Calculate MTTR (Mean Time To Repair)
  async calculateMTTR(assetId: string) {
    const supabase = getSupabaseClient();
    const { data: orders, error } = await supabase
      .from('maintenance_orders')
      .select('scheduled_date, completion_date')
      .eq('asset_id', assetId)
      .eq('status', 'completed')
      .order('completion_date', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (!orders || orders.length === 0) return null;
    
    const repairs = orders
      .filter(o => o.completion_date)
      .map(o => {
        const start = new Date(o.scheduled_date).getTime();
        const end = new Date(o.completion_date).getTime();
        return (end - start) / (1000 * 60 * 60); // Convert to hours
      });
    
    const mttr = repairs.reduce((a, b) => a + b, 0) / repairs.length;
    return mttr;
  },

  // Get maintenance analytics
  async getMaintenanceAnalytics(siteId: string) {
    const supabase = getSupabaseClient();
    const { data: orders, error } = await supabase
      .from('maintenance_orders')
      .select('status, order_type, cost_center:cost_centers(name)')
      .eq('asset.site_id', siteId);
    
    if (error) throw error;
    
    const analytics = {
      total: orders?.length || 0,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      preventive: 0,
      corrective: 0,
    };
    
    orders?.forEach((order) => {
      analytics.byStatus[order.status] = (analytics.byStatus[order.status] || 0) + 1;
      analytics.byType[order.order_type] = (analytics.byType[order.order_type] || 0) + 1;
      
      if (order.order_type === 'preventiva') {
        analytics.preventive++;
      } else {
        analytics.corrective++;
      }
    });
    
    return analytics;
  },

  // Delete maintenance order
  async deleteMaintenanceOrder(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('maintenance_orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },
};
