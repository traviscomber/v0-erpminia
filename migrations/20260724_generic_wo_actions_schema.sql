-- Generic Work Order Actions table for Play/Pause/Terminate on ANY work order type
-- This supersedes tire-specific actions and provides unified timing/tracking

CREATE TABLE IF NOT EXISTS work_order_action_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'play', 'pause', 'resume', 'terminate'
  action_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER, -- for pause/resume events
  total_accumulated_minutes DECIMAL(10,2) DEFAULT 0, -- running total
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track timeline of all actions per WO
CREATE TABLE IF NOT EXISTS work_order_action_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  work_order_id UUID NOT NULL REFERENCES maintenance_work_orders(id),
  event_type VARCHAR(50) NOT NULL,
  event_timestamp TIMESTAMP NOT NULL,
  event_data JSONB,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add timer tracking columns to maintenance_work_orders if not exist
ALTER TABLE maintenance_work_orders 
ADD COLUMN IF NOT EXISTS timer_status VARCHAR(20) DEFAULT 'idle'; -- idle, running, paused
ALTER TABLE maintenance_work_orders 
ADD COLUMN IF NOT EXISTS timer_start_time TIMESTAMP;
ALTER TABLE maintenance_work_orders 
ADD COLUMN IF NOT EXISTS total_timer_minutes DECIMAL(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_wo_actions_org ON work_order_action_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_wo_actions_wo ON work_order_action_sessions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_actions_type ON work_order_action_sessions(action_type);
CREATE INDEX IF NOT EXISTS idx_wo_timeline_org ON work_order_action_timeline(organization_id);
CREATE INDEX IF NOT EXISTS idx_wo_timeline_wo ON work_order_action_timeline(work_order_id);
