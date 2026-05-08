-- Insert Mock Contracts into La Patagua Mining System
-- Run this SQL in Supabase SQL Editor

INSERT INTO public.contracts (
  id,
  title,
  contract_number,
  contract_type,
  status,
  description,
  start_date,
  end_date,
  contract_value,
  currency,
  payment_terms,
  responsible_person,
  responsible_area,
  document_url,
  file_path,
  execution_percentage,
  created_at,
  updated_at
) VALUES
-- Contract 1: Main Operations
(
  gen_random_uuid(),
  'Contrato Principal Operaciones La Patagua 2024',
  'CNT-2024-001',
  'Principal',
  'Vigente',
  'Contrato marco para servicios operacionales de la mina La Patagua incluye mantención preventiva, reparaciones y suministros críticos.',
  '2024-01-15'::date,
  '2025-01-14'::date,
  45000000,
  'CLP',
  'A 30 días desde emisión de factura',
  'Juan García López',
  'Operaciones',
  'https://example.com/CNT-2024-001.pdf',
  '/documents/contracts/CNT-2024-001.pdf',
  65,
  NOW(),
  NOW()
),

-- Contract 2: Preventive Maintenance
(
  gen_random_uuid(),
  'Subcontrato Mantención Preventiva Equipos Críticos',
  'CNT-2024-002',
  'Subcontrato',
  'Por Vencer',
  'Servicios de mantención preventiva para equipos críticos con ciclos de 500 horas de operación.',
  '2024-03-01'::date,
  '2024-12-31'::date,
  8500000,
  'CLP',
  'A 15 días',
  'Carlos Mendoza Silva',
  'Mantención',
  'https://example.com/CNT-2024-002.pdf',
  '/documents/contracts/CNT-2024-002.pdf',
  82,
  NOW(),
  NOW()
),

-- Contract 3: Equipment Leasing
(
  gen_random_uuid(),
  'Contrato Arrendamiento de Equipos Pesados CAT',
  'CNT-2024-003',
  'Principal',
  'Vigente',
  'Arrendamiento de excavadora CAT 320 y cargador frontal CAT 950H con operador incluido.',
  '2024-02-01'::date,
  '2025-02-01'::date,
  28000000,
  'CLP',
  'A 10 días de recibida factura',
  'Patricia Ruiz González',
  'Operaciones',
  'https://example.com/CNT-2024-003.pdf',
  '/documents/contracts/CNT-2024-003.pdf',
  48,
  NOW(),
  NOW()
),

-- Contract 4: Amendment to Main Contract
(
  gen_random_uuid(),
  'Enmienda al Contrato CNT-2024-001 - Aumento de Alcance',
  'CNT-2024-001-A1',
  'Enmienda',
  'En Revisión',
  'Enmienda que aumenta el alcance original del contrato principal incluyendo servicios adicionales de ingeniería.',
  '2024-06-15'::date,
  '2024-12-31'::date,
  5200000,
  'CLP',
  'Incluida en términos principales',
  'Juan García López',
  'Legal',
  'https://example.com/CNT-2024-001-A1.pdf',
  '/documents/contracts/CNT-2024-001-A1.pdf',
  25,
  NOW(),
  NOW()
),

-- Contract 5: Security Services (Expired)
(
  gen_random_uuid(),
  'Contrato Servicios de Seguridad Operacional',
  'CNT-2024-004',
  'Principal',
  'Vencido',
  'Servicios de seguridad operacional, vigilancia de instalaciones y control de acceso.',
  '2023-01-01'::date,
  '2023-12-31'::date,
  12000000,
  'CLP',
  'A 7 días',
  'Roberto Fuentes Díaz',
  'Administración',
  'https://example.com/CNT-2024-004.pdf',
  '/documents/contracts/CNT-2024-004.pdf',
  100,
  NOW(),
  NOW()
),

-- Contract 6: Critical Parts Supply
(
  gen_random_uuid(),
  'Contrato Suministro de Repuestos Críticos',
  'CNT-2024-005',
  'Principal',
  'Vigente',
  'Suministro de repuestos críticos para equipos CAT, filtros hidráulicos, correas y componentes de motor.',
  '2024-04-01'::date,
  '2025-03-31'::date,
  6500000,
  'CLP',
  'A 20 días',
  'Miguel Rodríguez Pérez',
  'Compras',
  'https://example.com/CNT-2024-005.pdf',
  '/documents/contracts/CNT-2024-005.pdf',
  55,
  NOW(),
  NOW()
);

-- Verify insertion
SELECT COUNT(*) as total_contracts, 
       COUNT(CASE WHEN status = 'Vigente' THEN 1 END) as vigente,
       COUNT(CASE WHEN status = 'Por Vencer' THEN 1 END) as por_vencer,
       COUNT(CASE WHEN status = 'En Revisión' THEN 1 END) as en_revision,
       COUNT(CASE WHEN status = 'Vencido' THEN 1 END) as vencido
FROM public.contracts
WHERE created_at >= NOW() - INTERVAL '1 hour';
