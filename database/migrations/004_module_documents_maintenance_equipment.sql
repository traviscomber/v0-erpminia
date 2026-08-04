-- Add maintenance equipment context to module_documents
-- This keeps the original paper/document as the source of truth
-- while linking it to an equipment and a canonical maintenance section.

ALTER TABLE module_documents
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES maintenance_assets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS canonical_section TEXT,
ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_module_documents_asset_id
ON module_documents(asset_id);

CREATE INDEX IF NOT EXISTS idx_module_documents_canonical_section
ON module_documents(canonical_section);

