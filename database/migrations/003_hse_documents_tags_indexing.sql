-- Add tags column to module_documents table
-- Tags are stored as JSONB array with predefined system tags

ALTER TABLE module_documents 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS search_keywords TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create full-text search index for multi-field search
CREATE INDEX IF NOT EXISTS module_documents_fts_idx 
ON module_documents 
USING GIN(to_tsvector('spanish', 
  COALESCE(document_name, '') || ' ' || 
  COALESCE(description, '') || ' ' ||
  COALESCE(search_keywords, '')
));

-- Create index on tags for fast filtering
CREATE INDEX IF NOT EXISTS module_documents_tags_idx 
ON module_documents 
USING GIN(tags);

-- Create index for status and expiry filtering
CREATE INDEX IF NOT EXISTS module_documents_status_expiry_idx 
ON module_documents(status, valid_until);

-- Create index for category + module filtering
CREATE INDEX IF NOT EXISTS module_documents_category_module_idx 
ON module_documents(category, module);
