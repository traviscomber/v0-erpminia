export interface Equipment {
  id: string;
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
  specs: Record<string, any> | null;
}
