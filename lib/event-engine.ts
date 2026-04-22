// Event Cascade Engine - Orchestrates automation across all modules
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Event Types
export type EventType =
  | 'sensor.anomaly_detected'
  | 'equipment.status_changed'
  | 'alarm.triggered'
  | 'maintenance.completed'
  | 'hse.incident_reported'
  | 'inventory.low_stock'
  | 'requirement.deadline_approaching';

export interface Event {
  id: string;
  type: EventType;
  source_module: 'produccion' | 'hse' | 'mantenimiento' | 'bodega' | 'finanzas';
  source_id: string;
  payload: Record<string, any>;
  created_at: string;
  processed_at?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Cascade Rules Engine
export class EventCascadeEngine {
  // When sensor detects anomaly → Create alert → Suggest OT → Reserve inventory
  async handleSensorAnomaly(sensorId: string, equipmentId: string, severity: string) {
    try {
      // 1. Create alarm in Producción
      const { data: alarm } = await supabase
        .from('alarms')
        .insert({
          sensor_id: sensorId,
          equipment_id: equipmentId,
          severity,
          status: 'active',
          triggered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!alarm) throw new Error('Failed to create alarm');

      // 2. Create HSE observation if critical
      if (severity === 'critical') {
        await supabase.from('hse_alerts').insert({
          type: 'equipment_critical',
          equipment_id: equipmentId,
          description: `Critical sensor anomaly detected: ${sensorId}`,
          status: 'open',
          priority: 'high',
          created_at: new Date().toISOString(),
        });
      }

      // 3. Get equipment info to suggest maintenance
      const { data: equipment } = await supabase
        .from('equipment')
        .select('name, type, parent_id')
        .eq('id', equipmentId)
        .single();

      // 4. Suggest corrective OT (notify maintenance team)
      if (equipment) {
        await supabase.from('maintenance_orders').insert({
          equipment_id: equipmentId,
          order_type: 'correctiva',
          status: 'pendiente',
          priority: severity === 'critical' ? 'critica_seguridad' : 'alta',
          title: `Corrective: ${equipment.name} - Sensor Anomaly`,
          description: `Automatic OT from sensor anomaly detection`,
          scheduled_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }

      return { success: true, alarm_id: alarm.id };
    } catch (error) {
      console.error('[EventEngine] Error handling sensor anomaly:', error);
      return { success: false, error };
    }
  }

  // When HSE incident reported → Create investigation → Check stock → Alert HSE team
  async handleHSEIncident(incidentType: string, equipmentId: string, description: string) {
    try {
      // 1. Create incident record
      const { data: incident } = await supabase
        .from('incidents')
        .insert({
          type: incidentType,
          equipment_id: equipmentId,
          description,
          status: 'reported',
          severity: 'medium',
          reported_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!incident) throw new Error('Failed to create incident');

      // 2. Create investigation plan
      await supabase.from('incident_investigations').insert({
        incident_id: incident.id,
        investigator: null, // To be assigned
        status: 'pending_assignment',
        investigation_plan: `Immediate investigation required for ${incidentType}`,
        created_at: new Date().toISOString(),
      });

      // 3. Create corrective action placeholder
      await supabase.from('corrective_actions').insert({
        incident_id: incident.id,
        status: 'open',
        description: `Corrective actions pending investigation outcome`,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        created_at: new Date().toISOString(),
      });

      // 4. Create HSE alert
      await supabase.from('hse_alerts').insert({
        type: incidentType,
        equipment_id: equipmentId,
        description: `Incident reported: ${description}`,
        status: 'open',
        priority: 'critical',
        created_at: new Date().toISOString(),
      });

      return { success: true, incident_id: incident.id };
    } catch (error) {
      console.error('[EventEngine] Error handling HSE incident:', error);
      return { success: false, error };
    }
  }

  // When maintenance OT completed → Update availability → Update finanzas → Close alert
  async handleMaintenanceCompleted(otId: string, equipmentId: string, actualCost: number, partsCost: number) {
    try {
      // 1. Update equipment availability
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('equipment_availability').insert({
        equipment_id: equipmentId,
        date: today,
        availability_percentage: 95,
        downtime_minutes: 120,
        total_minutes: 1440,
      });

      // 2. Update Finanzas with maintenance cost
      await supabase.from('maintenance_costs').insert({
        maintenance_order_id: otId,
        labor_cost: actualCost,
        parts_cost: partsCost,
        total_cost: actualCost + partsCost,
        recorded_at: new Date().toISOString(),
      });

      // 3. Close associated alarms
      await supabase
        .from('alarms')
        .update({ status: 'resolved' })
        .eq('equipment_id', equipmentId)
        .eq('status', 'active');

      // 4. Close HSE alert if exists
      await supabase
        .from('hse_alerts')
        .update({ status: 'closed' })
        .eq('equipment_id', equipmentId)
        .eq('status', 'open');

      return { success: true };
    } catch (error) {
      console.error('[EventEngine] Error handling maintenance completion:', error);
      return { success: false, error };
    }
  }

  // When equipment status changes → Update plant dashboard → Check HSE requirements
  async handleEquipmentStatusChange(equipmentId: string, newStatus: string) {
    try {
      // 1. Update equipment status
      const { data: equipment } = await supabase
        .from('equipment')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', equipmentId)
        .select()
        .single();

      // 2. If equipment goes offline → Create HSE alert
      if (newStatus === 'offline' || newStatus === 'maintenance') {
        await supabase.from('hse_alerts').insert({
          type: 'equipment_offline',
          equipment_id: equipmentId,
          description: `Equipment ${equipment?.name} is now ${newStatus}`,
          status: 'open',
          priority: 'medium',
          created_at: new Date().toISOString(),
        });
      }

      // 3. Log state change for audit
      await supabase.from('equipment_status_history').insert({
        equipment_id: equipmentId,
        previous_status: 'operational',
        new_status: newStatus,
        changed_at: new Date().toISOString(),
      });

      return { success: true, equipment };
    } catch (error) {
      console.error('[EventEngine] Error handling status change:', error);
      return { success: false, error };
    }
  }

  // Sync method - Process pending events
  async processPendingEvents() {
    try {
      const { data: events } = await supabase
        .from('event_log')
        .select('*')
        .eq('status', 'pending')
        .limit(10);

      if (!events) return { processed: 0 };

      for (const event of events) {
        // Route to appropriate handler
        if (event.type === 'sensor.anomaly_detected') {
          await this.handleSensorAnomaly(
            event.payload.sensor_id,
            event.payload.equipment_id,
            event.payload.severity
          );
        } else if (event.type === 'hse.incident_reported') {
          await this.handleHSEIncident(
            event.payload.incident_type,
            event.payload.equipment_id,
            event.payload.description
          );
        }

        // Mark as processed
        await supabase
          .from('event_log')
          .update({ status: 'completed', processed_at: new Date().toISOString() })
          .eq('id', event.id);
      }

      return { processed: events.length };
    } catch (error) {
      console.error('[EventEngine] Error processing events:', error);
      return { processed: 0, error };
    }
  }
}

export const eventEngine = new EventCascadeEngine();
