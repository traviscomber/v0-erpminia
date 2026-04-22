-- Event Logging Infrastructure for Cross-Module Automation
-- Tracks all events and triggers cascade actions

-- Event Log Table
CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  source_module VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  source_table VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  triggered_actions JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  processed_at TIMESTAMP,
  CONSTRAINT valid_modules CHECK (source_module IN ('produccion', 'hse', 'mantenimiento', 'bodega', 'finanzas'))
);

CREATE INDEX idx_event_log_status ON event_log(status);
CREATE INDEX idx_event_log_type ON event_log(event_type);
CREATE INDEX idx_event_log_created ON event_log(created_at DESC);

-- Event History (Archive)
CREATE TABLE IF NOT EXISTS event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_log(id),
  action_taken VARCHAR(255),
  target_table VARCHAR(100),
  target_id UUID,
  result JSONB,
  completed_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_event_history_event ON event_history(event_id);

-- Trigger Function: When sensor reading is inserted and exceeds threshold
CREATE OR REPLACE FUNCTION handle_sensor_anomaly()
RETURNS TRIGGER AS $$
BEGIN
  -- If reading exceeds safety threshold, create event
  IF NEW.value > 100 OR NEW.value < 0 THEN
    INSERT INTO event_log (event_type, source_module, source_id, source_table, payload)
    VALUES (
      'sensor.anomaly_detected',
      'produccion',
      NEW.sensor_id,
      'sensor_readings',
      jsonb_build_object(
        'sensor_id', NEW.sensor_id,
        'equipment_id', (SELECT equipment_id FROM sensors WHERE id = NEW.sensor_id),
        'reading_value', NEW.value,
        'severity', CASE 
          WHEN NEW.value > 95 THEN 'critical'
          WHEN NEW.value > 80 THEN 'high'
          ELSE 'medium'
        END,
        'timestamp', NEW.created_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sensor_anomaly_trigger ON sensor_readings;
CREATE TRIGGER sensor_anomaly_trigger
AFTER INSERT ON sensor_readings
FOR EACH ROW
EXECUTE FUNCTION handle_sensor_anomaly();

-- Trigger Function: When equipment status changes
CREATE OR REPLACE FUNCTION handle_equipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO event_log (event_type, source_module, source_id, source_table, payload)
    VALUES (
      'equipment.status_changed',
      'produccion',
      NEW.id,
      'equipment',
      jsonb_build_object(
        'equipment_id', NEW.id,
        'equipment_name', NEW.name,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS equipment_status_trigger ON equipment;
CREATE TRIGGER equipment_status_trigger
AFTER UPDATE ON equipment
FOR EACH ROW
EXECUTE FUNCTION handle_equipment_status_change();

-- Trigger Function: When incident is reported
CREATE OR REPLACE FUNCTION handle_incident_reported()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO event_log (event_type, source_module, source_id, source_table, payload)
  VALUES (
    'hse.incident_reported',
    'hse',
    NEW.id,
    'incidents',
    jsonb_build_object(
      'incident_id', NEW.id,
      'incident_type', NEW.type,
      'equipment_id', NEW.equipment_id,
      'description', NEW.description,
      'severity', NEW.severity,
      'reported_at', NEW.reported_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incident_reported_trigger ON incidents;
CREATE TRIGGER incident_reported_trigger
AFTER INSERT ON incidents
FOR EACH ROW
EXECUTE FUNCTION handle_incident_reported();

-- Trigger Function: When alarm is created
CREATE OR REPLACE FUNCTION handle_alarm_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO event_log (event_type, source_module, source_id, source_table, payload)
  VALUES (
    'alarm.triggered',
    'produccion',
    NEW.id,
    'alarms',
    jsonb_build_object(
      'alarm_id', NEW.id,
      'sensor_id', NEW.sensor_id,
      'equipment_id', NEW.equipment_id,
      'severity', NEW.severity,
      'triggered_at', NEW.triggered_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alarm_created_trigger ON alarms;
CREATE TRIGGER alarm_created_trigger
AFTER INSERT ON alarms
FOR EACH ROW
EXECUTE FUNCTION handle_alarm_created();

-- Function to get pending events (used by event engine)
CREATE OR REPLACE FUNCTION get_pending_events(limit_count INT DEFAULT 10)
RETURNS TABLE(
  id UUID,
  event_type VARCHAR,
  source_module VARCHAR,
  source_id UUID,
  payload JSONB,
  created_at TIMESTAMP
) AS $$
  SELECT id, event_type, source_module, source_id, payload, created_at
  FROM event_log
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT limit_count;
$$ LANGUAGE SQL;

-- Function to mark event as processed
CREATE OR REPLACE FUNCTION mark_event_processed(event_id UUID, actions JSONB DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE event_log
  SET status = 'completed',
      processed_at = now(),
      triggered_actions = COALESCE(actions, triggered_actions)
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark event as failed
CREATE OR REPLACE FUNCTION mark_event_failed(event_id UUID, error_msg TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE event_log
  SET status = 'failed',
      error_message = error_msg,
      processed_at = now()
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on event tables
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow viewing own events
CREATE POLICY event_log_select_policy ON event_log
  FOR SELECT USING (true);

CREATE POLICY event_log_insert_policy ON event_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY event_log_update_policy ON event_log
  FOR UPDATE USING (true);

CREATE POLICY event_history_select_policy ON event_history
  FOR SELECT USING (true);

CREATE POLICY event_history_insert_policy ON event_history
  FOR INSERT WITH CHECK (true);

-- Grant access
GRANT EXECUTE ON FUNCTION get_pending_events TO authenticated;
GRANT EXECUTE ON FUNCTION mark_event_processed TO authenticated;
GRANT EXECUTE ON FUNCTION mark_event_failed TO authenticated;
