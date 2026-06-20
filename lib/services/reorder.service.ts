import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan variables de entorno de Supabase');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export class ReorderService {
  static async checkReorderLevels(organizationId: string) {
    const supabase = getSupabaseClient();
    const { data: stock } = await supabase
      .from('warehouse_stock')
      .select('*')
      .eq('organization_id', organizationId)
      .lte('quantity_on_hand', 'reorder_level');

    if (!stock) return [];

    for (const item of stock) {
      const supabase = getSupabaseClient();
      const existing = await supabase
        .from('reorder_alerts')
        .select('*')
        .eq('stock_id', item.id)
        .eq('status', 'active')
        .single();

      if (!existing.data) {
        const supabase = getSupabaseClient();
        await supabase.from('reorder_alerts').insert({
          organization_id: organizationId,
          stock_id: item.id,
          alert_type: 'low_stock',
          threshold_value: item.reorder_level,
          current_value: item.quantity_on_hand,
          status: 'active',
        });
      }
    }

    return stock;
  }

  static async getReorderAlerts(organizationId: string) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('reorder_alerts')
      .select('*, stock:warehouse_stock(*)')
      .eq('organization_id', organizationId)
      .eq('status', 'active');
    return data || [];
  }

  static async acknowledgeAlert(alertId: string, userId: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('reorder_alerts')
      .update({ status: 'acknowledged', acknowledged_by: userId, acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);
    if (error) throw error;
  }

  static async getReorderStats(organizationId: string) {
    const supabase = getSupabaseClient();
    const { data: alerts } = await supabase
      .from('reorder_alerts')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    const { data: stock } = await supabase
      .from('warehouse_stock')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .lt('quantity_on_hand', 'reorder_level');

    return { activeAlerts: alerts?.length || 0, lowStockItems: stock?.length || 0 };
  }
}
