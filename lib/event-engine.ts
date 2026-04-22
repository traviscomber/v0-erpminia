// Event Engine - Orchestrates cascading automation across all modules
// When a sensor triggers, this engine orchestrates: Alert → OT → Inventory → Finance → HSE

import { createClient } from '@supabase/supabase-js';

interface Event {
  type: 'sensor_alarm' | 'equipment_failure' | 'incident_reported' | 'compliance_due' | 'maintenance_completed';
  source_module: 'produccion' | 'mantenimiento' | 'bodega' | 'finanzas' | 'hse';
  entity_id: string;
  data: Record<string, any>;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  triggered_by: string;
}

interface CascadeRule {
  id: string;
  name: string;
  trigger_event: string;
  trigger_condition: (data: any) => boolean;
  actions: CascadeAction[];
  enabled: boolean;
}

interface CascadeAction {
  target_module: string;
  action_type: string;
  payload_builder: (event: Event) => Promise<any>;
  on_success?: () => Promise<void>;
  on_failure?: (error: Error) => Promise<void>;
}

class EventEngine {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  private rules: Map<string, CascadeRule> = new Map();
  private event_log: Event[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Register default cascade rules for the ERP
   */
  private registerDefaultRules() {
    // Rule 1: Sensor Alarm → Create Maintenance OT
    this.registerRule({
      id: 'sensor_alarm_to_ot',
      name: 'Sensor Alarm triggers Maintenance OT',
      trigger_event: 'sensor_alarm',
      trigger_condition: (data) => data.severity === 'critical' || data.severity === 'warning',
      actions: [
        {
          target_module: 'mantenimiento',
          action_type: 'create_maintenance_order',
          payload_builder: async (event) => ({
            asset_id: event.entity_id,
            order_type: event.severity === 'critical' ? 'correctiva' : 'predictiva',
            priority: event.severity === 'critical' ? 'critica_seguridad' : 'alta',
            description: `Auto-generated from sensor alarm: ${event.data.alarm_description}`,
            status: 'pendiente',
            scheduled_date: new Date().toISOString(),
            triggered_by_event: event.data.event_id,
          }),
          on_success: async () => {
            console.log('[EventEngine] OT created successfully');
          },
        },
        {
          target_module: 'hse',
          action_type: 'create_observation',
          payload_builder: async (event) => ({
            title: `Equipment risk - ${event.data.equipment_name}`,
            description: `Sensor ${event.data.sensor_name} triggered ${event.severity} alarm`,
            equipment_id: event.entity_id,
            severity: event.severity === 'critical' ? 'high' : 'medium',
            status: 'open',
            created_by: event.triggered_by,
          }),
        },
      ],
      enabled: true,
    });

    // Rule 2: Maintenance OT completed → Update equipment availability
    this.registerRule({
      id: 'ot_completed_to_availability',
      name: 'OT Completion updates Equipment Availability',
      trigger_event: 'maintenance_completed',
      trigger_condition: (data) => data.status === 'completada',
      actions: [
        {
          target_module: 'produccion',
          action_type: 'update_equipment_availability',
          payload_builder: async (event) => ({
            equipment_id: event.entity_id,
            status: 'available',
            downtime_end: new Date().toISOString(),
            availability_percentage: 100,
          }),
        },
        {
          target_module: 'finanzas',
          action_type: 'calculate_maintenance_cost',
          payload_builder: async (event) => ({
            ot_id: event.data.ot_id,
            labor_cost: event.data.labor_hours * 45, // $45/hour
            parts_cost: event.data.parts_total,
            downtime_cost: event.data.downtime_hours * 500, // $500/hour operational loss
            total_cost: (event.data.labor_hours * 45) + event.data.parts_total + (event.data.downtime_hours * 500),
          }),
        },
      ],
      enabled: true,
    });

    // Rule 3: Low stock alert → Create purchase order
    this.registerRule({
      id: 'low_stock_to_po',
      name: 'Low Stock triggers Purchase Order',
      trigger_event: 'inventory_low_stock',
      trigger_condition: (data) => data.current_stock <= data.minimum_level,
      actions: [
        {
          target_module: 'compras',
          action_type: 'create_purchase_order',
          payload_builder: async (event) => ({
            item_id: event.entity_id,
            quantity: event.data.reorder_quantity,
            supplier_id: event.data.preferred_supplier,
            status: 'pendiente',
            estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            urgency: event.severity === 'critical' ? 'urgent' : 'normal',
          }),
        },
        {
          target_module: 'hse',
          action_type: 'create_alert',
          payload_builder: async (event) => ({
            type: 'supply_chain',
            title: `Low stock alert: ${event.data.item_name}`,
            description: `Current: ${event.data.current_stock}, Minimum: ${event.data.minimum_level}`,
            severity: 'medium',
            action_required: true,
          }),
        },
      ],
      enabled: true,
    });

    // Rule 4: Incident reported → Create investigation + corrective action
    this.registerRule({
      id: 'incident_to_investigation',
      name: 'Incident Report triggers Investigation and Corrective Action',
      trigger_event: 'incident_reported',
      trigger_condition: (data) => data.severity !== 'info',
      actions: [
        {
          target_module: 'hse',
          action_type: 'create_investigation',
          payload_builder: async (event) => ({
            incident_id: event.entity_id,
            investigation_type: 'formal_rca',
            status: 'initiated',
            assigned_to: event.data.supervisor_id,
            due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        },
        {
          target_module: 'mantenimiento',
          action_type: 'create_preventive_ot',
          payload_builder: async (event) => ({
            asset_id: event.data.equipment_involved,
            order_type: 'preventiva',
            priority: 'alta',
            description: `Preventive maintenance following incident: ${event.data.incident_description}`,
            status: 'pendiente',
          }),
        },
      ],
      enabled: true,
    });

    // Rule 5: Compliance requirement due → Generate alert + notification
    this.registerRule({
      id: 'compliance_due_alert',
      name: 'Compliance Requirement Due Date triggers Alert',
      trigger_event: 'compliance_due',
      trigger_condition: (data) => {
        const daysUntilDue = (new Date(data.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilDue <= 30; // Alert 30 days before due
      },
      actions: [
        {
          target_module: 'hse',
          action_type: 'create_compliance_alert',
          payload_builder: async (event) => ({
            requirement_id: event.entity_id,
            alert_type: 'upcoming_due',
            days_remaining: Math.floor((new Date(event.data.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            assigned_to: event.data.responsible_party,
            priority: 'high',
          }),
        },
      ],
      enabled: true,
    });
  }

  /**
   * Register a new cascade rule
   */
  registerRule(rule: CascadeRule) {
    this.rules.set(rule.id, rule);
    console.log(`[EventEngine] Registered rule: ${rule.name}`);
  }

  /**
   * Emit an event and trigger all matching cascade rules
   */
  async emit(event: Event) {
    console.log(`[EventEngine] Event emitted: ${event.type} from ${event.source_module}`);
    this.event_log.push(event);

    const matchingRules = Array.from(this.rules.values()).filter(
      (rule) => rule.trigger_event === event.type && rule.enabled && rule.trigger_condition(event.data)
    );

    console.log(`[EventEngine] Found ${matchingRules.length} matching rules`);

    for (const rule of matchingRules) {
      await this.executeRule(rule, event);
    }
  }

  /**
   * Execute a cascade rule and its actions
   */
  private async executeRule(rule: CascadeRule, event: Event) {
    console.log(`[EventEngine] Executing rule: ${rule.name}`);

    for (const action of rule.actions) {
      try {
        const payload = await action.payload_builder(event);
        console.log(`[EventEngine] Action: ${action.target_module}.${action.action_type}`, payload);

        // Here you would dispatch to the target module's API
        // For now, we're logging the cascade
        await this.dispatchAction(action.target_module, action.action_type, payload);

        if (action.on_success) {
          await action.on_success();
        }
      } catch (error) {
        console.error(`[EventEngine] Action failed for ${action.target_module}:`, error);
        if (action.on_failure) {
          await action.on_failure(error as Error);
        }
      }
    }
  }

  /**
   * Dispatch an action to the appropriate target module
   */
  private async dispatchAction(target_module: string, action_type: string, payload: any) {
    // This would call the appropriate API endpoints for each module
    console.log(`[EventEngine] Dispatching to ${target_module}: ${action_type}`, payload);

    // Example API calls (to be implemented):
    // if (target_module === 'mantenimiento') {
    //   return await fetch('/api/mantenimiento/create-ot', { method: 'POST', body: JSON.stringify(payload) });
    // }
    // etc.
  }

  /**
   * Get event log for audit trail
   */
  getEventLog(limit: number = 100): Event[] {
    return this.event_log.slice(-limit);
  }

  /**
   * Get all registered rules
   */
  getRules(): CascadeRule[] {
    return Array.from(this.rules.values());
  }
}

export const eventEngine = new EventEngine();
