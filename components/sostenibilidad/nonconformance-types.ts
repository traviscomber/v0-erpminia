export type CorrectiveActionStatus = 'planned' | 'in_progress' | 'completed' | 'verified' | 'on_hold' | string;

export type CorrectiveActionRecord = {
  id: string;
  ca_number?: string;
  action_description?: string;
  responsible_person?: string | null;
  responsible_person_name?: string | null;
  scheduled_completion_date?: string | null;
  status: CorrectiveActionStatus;
  percentage_complete?: number;
  [key: string]: unknown;
};

export type NonconformanceRecord = {
  id: string;
  nc_number?: string;
  title: string;
  description: string;
  category?: string;
  severity?: string;
  status: 'open' | 'in_progress' | 'closed' | string;
  discovered_date?: string | null;
  target_closure_date?: string | null;
  root_cause?: string;
  corrective_actions?: CorrectiveActionRecord[];
  [key: string]: unknown;
};
