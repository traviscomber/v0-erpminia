export interface EquipmentOperationalSummary {
  openWorkOrders: number;
  operationalBlockers: number;
  pendingPlanSteps: number;
  readyToClose: number;
  overduePreventives: number;
  nextPreventiveTask?: string | null;
  nextPreventiveRemainingHours?: number | null;
  latestMeterHours?: number | null;
  runtimeReadingCount: number;
  auditedClosures: number;
  recurringCauseCount: number;
  validMtbfIntervals: number;
  mtbfOperatingHours?: number | null;
  nextAction: string;
  nextActionHref: string;
}

export interface Equipment {
  id: string;
  asset_id?: string | null;
  source?: 'canonical_asset' | 'maintenance_asset' | 'cost_center';
  code: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  type: string;
  status: string;
  criticality: string;
  purchase_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  specs: Record<string, unknown> | null;
  operational?: EquipmentOperationalSummary | null;
}
