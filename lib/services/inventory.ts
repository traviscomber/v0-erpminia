import { supabase } from '@/lib/db/supabase';
import { InventoryMovementType } from '@/lib/types';
import type { InventoryItem, InventoryMovement } from '@/lib/types';

export const inventoryService = {
  // Get all inventory items in a warehouse
  async getInventoryItems(warehouseId: string) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Get items by category
  async getItemsByCategory(warehouseId: string, category: string) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .eq('category', category);
    
    if (error) throw error;
    return data;
  },

  // Get low stock items
  async getLowStockItems(warehouseId: string) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .lte('current_stock', supabase.rpc('col', ['minimum_stock']))
      .order('current_stock', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Create inventory item
  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([item])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update inventory item
  async updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Record stock movement (entrada/salida)
  async recordStockMovement(movement: Omit<InventoryMovement, 'id' | 'created_at'>) {
    // First, record the movement
    const { data: moveData, error: moveError } = await supabase
      .from('stock_movements')
      .insert([movement])
      .select()
      .single();
    
    if (moveError) throw moveError;

    // Then update inventory item stock
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', movement.inventory_item_id)
      .single();
    
    if (itemError) throw itemError;

    const isReceipt = movement.movement_type === InventoryMovementType.RECEIPT || movement.movement_type === InventoryMovementType.RETURN;
    const newStock = item.current_stock + (isReceipt ? movement.quantity : -movement.quantity);
    
    await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', movement.inventory_item_id);

    return moveData;
  },

  // Get stock movement history
  async getStockMovementHistory(itemId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, user:users(full_name)')
      .eq('inventory_item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // Calculate total inventory value
  async getTotalInventoryValue(warehouseId: string) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('current_stock, unit_cost')
      .eq('warehouse_id', warehouseId);
    
    if (error) throw error;
    
    const total = data?.reduce((sum, item) => {
      return sum + ((item.current_stock || 0) * (item.unit_cost || 0));
    }, 0) || 0;
    
    return total;
  },

  // Get inventory analytics
  async getInventoryAnalytics(warehouseId: string) {
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('warehouse_id', warehouseId);
    
    if (error) throw error;
    
    const analytics = {
      totalItems: items?.length || 0,
      totalValue: 0,
      lowStockItems: 0,
      categoryBreakdown: {} as Record<string, number>,
    };
    
    items?.forEach((item) => {
      analytics.totalValue += (item.current_stock || 0) * (item.unit_cost || 0);
      
      if (item.current_stock <= item.minimum_stock) {
        analytics.lowStockItems++;
      }
      
      const category = item.category || 'sin categoría';
      analytics.categoryBreakdown[category] = (analytics.categoryBreakdown[category] || 0) + item.current_stock;
    });
    
    return analytics;
  },

  // Physical count (conteo físico)
  async performPhysicalCount(warehouseId: string, items: Array<{ itemId: string; countedQuantity: number }>) {
    const results = [];
    
    for (const { itemId, countedQuantity } of items) {
      const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', itemId)
        .single();
      
      if (itemError) throw itemError;
      
      const difference = countedQuantity - item.current_stock;
      
      // Record adjustment movement
      await this.recordStockMovement({
        company_id: '', // Should be from context
        inventory_item_id: itemId,
        movement_type: difference > 0 ? InventoryMovementType.RECEIPT : InventoryMovementType.ISSUANCE,
        quantity: Math.abs(difference),
        unit_cost: 0,
        total_value: 0,
        reason: 'ajuste_conteo_fisico',
        created_by: 'system', // Should be from context
      });
      
      results.push({
        itemId,
        previousStock: item.current_stock,
        countedQuantity,
        difference,
      });
    }
    
    return results;
  },

  // Delete inventory item
  async deleteInventoryItem(id: string) {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },
};
