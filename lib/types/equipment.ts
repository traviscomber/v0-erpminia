export interface Equipment {
  id: string;
  code: string;
  name: string;
  model: string;
  serial_number: string;
  type: string;
  status: string;
  criticality: string;
  location: string;
  purchase_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  specs: Record<string, any> | null;
}
