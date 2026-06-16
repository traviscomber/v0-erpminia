-- Create cost_centers table (jerárquica para minas y áreas)
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_rec_elec TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  ruta_completa TEXT NOT NULL,
  parent_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  nivel INTEGER,
  activo BOOLEAN DEFAULT true,
  creador_por TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modificado_por TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_cost_centers_codigo ON cost_centers(codigo_rec_elec);
CREATE INDEX idx_cost_centers_parent ON cost_centers(parent_id);
CREATE INDEX idx_cost_centers_ruta ON cost_centers(ruta_completa);

-- Add cost_center_id to bodega_inventory
ALTER TABLE bodega_inventory
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id),
ADD COLUMN IF NOT EXISTS codigo TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS familia TEXT,
ADD COLUMN IF NOT EXISTS sub_familia TEXT,
ADD COLUMN IF NOT EXISTS equipo TEXT;

-- Create index for bodega_inventory
CREATE INDEX IF NOT EXISTS idx_bodega_cost_center ON bodega_inventory(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_bodega_codigo ON bodega_inventory(codigo);
CREATE INDEX IF NOT EXISTS idx_bodega_familia ON bodega_inventory(familia);

-- Enable RLS on cost_centers
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

-- RLS Policy for cost_centers
CREATE POLICY "Allow authenticated users to read cost_centers" 
  ON cost_centers FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert cost_centers" 
  ON cost_centers FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update cost_centers" 
  ON cost_centers FOR UPDATE 
  TO authenticated 
  USING (true);
