-- Persist maintenance expedient records by asset/key and canonical section.
-- This stores the extracted structure separately from raw document uploads.

CREATE TABLE IF NOT EXISTS maintenance_expedient_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  expedient_key TEXT NOT NULL,
  asset_label TEXT NOT NULL,
  asset_location TEXT,
  source_filename TEXT NOT NULL,
  record_date DATE NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  canonical_section TEXT NOT NULL,
  summary TEXT NOT NULL,
  cause TEXT,
  solution TEXT,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_index INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_expedient_records_unique
ON maintenance_expedient_records(organization_id, expedient_key, source_filename, title);

CREATE INDEX IF NOT EXISTS idx_maintenance_expedient_records_key
ON maintenance_expedient_records(organization_id, expedient_key);

CREATE INDEX IF NOT EXISTS idx_maintenance_expedient_records_section
ON maintenance_expedient_records(organization_id, canonical_section);

CREATE OR REPLACE FUNCTION update_maintenance_expedient_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_expedient_records_updated_at ON maintenance_expedient_records;
CREATE TRIGGER maintenance_expedient_records_updated_at
  BEFORE UPDATE ON maintenance_expedient_records
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_expedient_records_updated_at();
