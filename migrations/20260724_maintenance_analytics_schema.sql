-- FASE 4: Analytics Aggregation Tables for Reporting & Insights

-- Daily maintenance summary (pre-aggregated for fast dashboards)
CREATE TABLE IF NOT EXISTS maintenance_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  
  -- Work Order KPIs
  total_work_orders INTEGER DEFAULT 0,
  completed_work_orders INTEGER DEFAULT 0,
  pending_work_orders INTEGER DEFAULT 0,
  overdue_work_orders INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Timing Metrics
  avg_completion_hours DECIMAL(10,2) DEFAULT 0,
  avg_delay_hours DECIMAL(10,2) DEFAULT 0,
  total_hours_logged DECIMAL(10,2) DEFAULT 0,
  
  -- Equipment & Failures
  equipment_with_failures INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  
  -- Cost Analysis
  total_cost_usd DECIMAL(15,2) DEFAULT 0,
  avg_cost_per_wo DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Equipment fault patterns & risk scoring
CREATE TABLE IF NOT EXISTS equipment_fault_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_code TEXT NOT NULL,
  equipment_name TEXT,
  
  -- Failure History
  failure_count_90days INTEGER DEFAULT 0,
  failure_count_30days INTEGER DEFAULT 0,
  mtbf_hours DECIMAL(10,2), -- Mean Time Between Failures
  mttr_hours DECIMAL(10,2), -- Mean Time To Repair
  
  -- Risk Scoring
  risk_score INTEGER DEFAULT 0, -- 0-100
  risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  
  -- Availability
  available_percentage DECIMAL(5,2) DEFAULT 100,
  downtime_hours_90days DECIMAL(10,2) DEFAULT 0,
  
  -- Trends
  last_failure_date DATE,
  next_preventive_due_date DATE,
  criticality_level VARCHAR(20), -- 'low', 'medium', 'high'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Technician performance metrics
CREATE TABLE IF NOT EXISTS technician_performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES profiles(id),
  technician_name TEXT,
  cargo TEXT,
  
  -- Work Orders
  total_work_orders_30days INTEGER DEFAULT 0,
  completed_work_orders_30days INTEGER DEFAULT 0,
  completion_rate_30days DECIMAL(5,2) DEFAULT 0,
  
  -- Efficiency
  avg_completion_time_hours DECIMAL(10,2) DEFAULT 0,
  total_hours_logged_30days DECIMAL(10,2) DEFAULT 0,
  efficiency_score INTEGER DEFAULT 0, -- 0-100 based on planned vs actual
  
  -- Quality
  critical_work_orders_30days INTEGER DEFAULT 0,
  on_time_completion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Specialization
  primary_equipment_type TEXT,
  specialization_score INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Work Order type distribution
CREATE TABLE IF NOT EXISTS work_order_type_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  work_type VARCHAR(50),
  
  count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  avg_hours DECIMAL(10,2) DEFAULT 0,
  total_cost_usd DECIMAL(15,2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tire lifecycle analytics
CREATE TABLE IF NOT EXISTS tire_lifecycle_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  
  total_tires INTEGER DEFAULT 0,
  in_stock_count INTEGER DEFAULT 0,
  installed_count INTEGER DEFAULT 0,
  in_repair_count INTEGER DEFAULT 0,
  waiting_repair_count INTEGER DEFAULT 0,
  
  avg_repair_time_hours DECIMAL(10,2) DEFAULT 0,
  avg_repair_cost_usd DECIMAL(10,2) DEFAULT 0,
  tire_utilization_percentage DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_analytics_org_date ON maintenance_analytics_daily(organization_id, analysis_date);
CREATE INDEX IF NOT EXISTS idx_equipment_fault_org ON equipment_fault_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_risk ON equipment_fault_analytics(risk_level);
CREATE INDEX IF NOT EXISTS idx_tech_perf_org ON technician_performance_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_wo_type_analytics_date ON work_order_type_analytics(organization_id, analysis_date);
CREATE INDEX IF NOT EXISTS idx_tire_analytics_date ON tire_lifecycle_analytics(organization_id, analysis_date);

-- Create materialized view for quick dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS maintenance_summary_view AS
SELECT 
  mad.organization_id,
  mad.analysis_date,
  mad.total_work_orders,
  mad.completed_work_orders,
  mad.completion_rate,
  mad.avg_completion_hours,
  mad.total_hours_logged,
  COUNT(DISTINCT efa.equipment_code) as equipment_with_issues,
  AVG(efa.risk_score) as avg_equipment_risk_score
FROM maintenance_analytics_daily mad
LEFT JOIN equipment_fault_analytics efa ON mad.organization_id = efa.organization_id
GROUP BY mad.organization_id, mad.analysis_date, mad.total_work_orders, mad.completed_work_orders, 
         mad.completion_rate, mad.avg_completion_hours, mad.total_hours_logged;

CREATE INDEX IF NOT EXISTS idx_summary_view_date ON maintenance_summary_view(organization_id, analysis_date);
