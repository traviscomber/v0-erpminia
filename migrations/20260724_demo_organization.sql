-- Demo Organization Setup for Client Presentations
-- Organization: "Seguria Spa Demo"
-- User: demo@seguria.tech / seguria2026 (Admin)

-- Insert demo organization
INSERT INTO organizations (id, name, rut, address, city, region, country, phone, email, industry)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Seguria Spa Demo',
  '76123456-7',
  'Calle Demo 1234, Oficina 500',
  'Santiago',
  'Metropolitana',
  'Chile',
  '+56 2 2345 6789',
  'demo@seguria.tech',
  'mining'
)
ON CONFLICT (id) DO NOTHING;

-- Create demo user (if using manual user creation)
-- Note: Better Auth handles user creation via auth system
-- This is a placeholder for organizational profile
INSERT INTO profiles (
  id, email, full_name, role, cargo, phone, organization_id, 
  active, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  'demo@seguria.tech',
  'Demo Admin Seguria',
  'admin',
  'Jefe de Operaciones',
  '+56 9 8765 4321',
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Create demo equipos (20 realistic mining equipment)
INSERT INTO equipment (
  id, organization_id, equipment_code, equipment_name, equipment_type,
  manufacturer, model, serial_number, status, location,
  operational_hours, installation_date, last_maintenance_date
)
VALUES
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-001', 'Excavadora CAT 320', 'excavadora', 'Caterpillar', '320D9L', 'SN12345001', 'operational', 'Sector Norte', 4520.5, '2022-03-15', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-002', 'Excavadora Volvo EC460', 'excavadora', 'Volvo', 'EC460', 'SN12345002', 'operational', 'Sector Sur', 3890.2, '2022-06-20', NOW() - INTERVAL '60 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-003', 'Cargador frontal CAT 980', 'cargador_frontal', 'Caterpillar', '980L', 'SN12345003', 'operational', 'Cancha de Acopio', 5120.8, '2021-11-10', NOW() - INTERVAL '25 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-004', 'Cargador frontal Komatsu', 'cargador_frontal', 'Komatsu', 'WA380-6', 'SN12345004', 'operational', 'Cancha de Acopio', 4780.1, '2022-01-08', NOW() - INTERVAL '35 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-005', 'Camión Tolva Volvo FH16', 'camion_tolva', 'Volvo', 'FH16', 'SN12345005', 'operational', 'Transporte', 6210.3, '2021-09-22', NOW() - INTERVAL '18 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-006', 'Camión Tolva Scania R440', 'camion_tolva', 'Scania', 'R440', 'SN12345006', 'downtime', 'Taller', 5890.7, '2022-02-14', NOW() - INTERVAL '90 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-007', 'Motoniveladora CAT 16', 'motoniveladora', 'Caterpillar', '16M', 'SN12345007', 'operational', 'Caminos', 3450.2, '2022-04-03', NOW() - INTERVAL '55 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-008', 'Motoniveladora Volvo G990', 'motoniveladora', 'Volvo', 'G990', 'SN12345008', 'operational', 'Caminos', 2890.5, '2022-07-11', NOW() - INTERVAL '22 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-009', 'Perforadora Atlas Copco', 'perforadora', 'Atlas Copco', 'D8', 'SN12345009', 'operational', 'Sector Perforación', 1200.3, '2023-01-15', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-010', 'Compresor Sullair', 'compresor', 'Sullair', '250 CFM', 'SN12345010', 'operational', 'Planta Compresores', 8920.1, '2020-08-05', NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-011', 'Planta Chancadora Metso', 'planta_chancadora', 'Metso', 'Cone 1100', 'SN12345011', 'operational', 'Planta Chancado', 7650.2, '2021-05-18', NOW() - INTERVAL '75 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-012', 'Harnero Vibrador', 'harnero', 'Metso', 'Incline Screen', 'SN12345012', 'operational', 'Planta Chancado', 3420.8, '2022-03-02', NOW() - INTERVAL '40 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-013', 'Bomba de Agua LS', 'bomba_agua', 'Losenhausen', '500 L/min', 'SN12345013', 'downtime', 'Sistema Agua', 5670.4, '2021-12-09', NOW() - INTERVAL '120 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-014', 'Generador Diesel CAT', 'generador', 'Caterpillar', 'C500', 'SN12345014', 'operational', 'Sala Generadores', 4890.6, '2021-07-23', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-015', 'Compresor Atlas Copco', 'compresor', 'Atlas Copco', '500 CFM', 'SN12345015', 'operational', 'Planta Compresores', 6120.3, '2022-02-10', NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-016', 'Excavadora Hitachi', 'excavadora', 'Hitachi', 'ZX450', 'SN12345016', 'operational', 'Sector Este', 3210.9, '2022-08-14', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-017', 'Bulldozer CAT D10', 'bulldozer', 'Caterpillar', 'D10T', 'SN12345017', 'operational', 'Movimiento Tierra', 2450.1, '2022-05-20', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-018', 'Camión Tolva Hino', 'camion_tolva', 'Hino', '700', 'SN12345018', 'operational', 'Transporte', 4560.2, '2022-09-03', NOW() - INTERVAL '28 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-019', 'Planta Trituradora', 'trituradora', 'Nordberg', 'HP500', 'SN12345019', 'operational', 'Planta Procesamiento', 8340.7, '2020-11-11', NOW() - INTERVAL '65 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000'::uuid, 'EQ-020', 'Sistema Ventilación', 'ventilador', 'Fral', 'Industrial', 'SN12345020', 'operational', 'Galerías', 1890.3, '2022-06-25', NOW() - INTERVAL '50 days');

-- Create 8 demo technicians with realistic cargos
INSERT INTO profiles (
  id, email, full_name, role, cargo, phone, organization_id,
  active, created_at, updated_at
)
VALUES
  (gen_random_uuid(), 'tecnico1@seguria.tech', 'Carlos Rodríguez', 'technician', 'Técnico Especialista Excavadoras', '+56 9 1111 1111', '550e8400-e29b-41d4-a716-446655440000'::uuid, true, NOW(), NOW()),
  (gen_random_uuid(), 'tecnico2@seguria.tech', 'Juan Martínez', 'technician', 'Técnico Especialista Cargadores', '+56 9 2222 2222', '550e8400-e29b-41d4-a716-446655440000'::uuid, true, NOW(), NOW()),
  (gen_random_uuid(), 'tecnico3@seguria.tech', 'Miguel López', 'technician', 'Técnico Electromecanico', '+56 9 3333 3333', '550e8400-e29b-41d4-a716-446655440000'::uuid, true, NOW(), NOW()),
  (gen_random_uuid(), 'tecnico4@seguria.tech', 'Roberto Flores', 'technician', 'Técnico Hidráulica', '+56 9 4444 4444', '550e8400-e29b-41d4-a716-446655440000'::uuid, true, NOW(), NOW()),
  (gen_random_uuid(), 'tecnico5@seguria.tech', 'Antonio Sánchez', 'technician', 'Técnico Motores Diésel', '+56 9 5555 5555', '550e8400-e29b-41d4-a716-446655440000'::uuid, true, NOW(), NOW()),
  (gen_random_uuid(), 'tecnico6@seguria.tech', 'David Torres', 'technician', 'Técnico Equipos Menores', '+56 9 6666 6666', '550e8400-e29b-41d4-a716-446655440000'::uuid, true, NOW(), NOW()),
  (gen_random_uuid(), 'tecnico7@seguria.tech', 'Fernando García', 'supervisor', 'Supervisor Mantenimiento', '+56 9 7777 7777', '550e8400-e29b-41d4-a716-446655440000'::uuid, true, NOW(), NOW()),
  (gen_random_uuid(), 'tecnico8@seguria.tech', 'Guillermo Ramírez', 'supervisor', 'Jefe Taller', '+56 9 8888 8888', '550e8400-e29b-41d4-a716-446655440000'::uuid, true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
