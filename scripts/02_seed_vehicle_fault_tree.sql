-- Seed Data: Vehicle Fault Tree Templates y Example Vehicles

-- ============================================
-- 1. COMPONENT TEMPLATES (Excavadora CAT 390F)
-- ============================================

-- Root: Excavadora CAT 390F
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
VALUES ('excavadora', 'Excavadora CAT 390F', 'EXC-CAT390F', NULL, 0, 'Excavadora hidráulica de 390 toneladas');

-- Subsystems (Level 1)
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', name, code, id, 1, description
FROM (VALUES
  ('Sistema Motor y Transmisión', 'EXC-MOTOR', 'Sistema de propulsión'),
  ('Sistema Hidráulico', 'EXC-HIDRAULICO', 'Sistema de potencia hidráulica'),
  ('Tren de Rodaje', 'EXC-RODAJE', 'Orugas, rodillos y bastidor'),
  ('Cuchara y Brazo', 'EXC-CUCHARA', 'Brazos hidráulicos y cuchara'),
  ('Sistema Eléctrico', 'EXC-ELECTRICO', 'Baterías, alternador, controles'),
  ('Cabina y Estructura', 'EXC-CABINA', 'Estructura principal y cabina'),
  ('Sistema de Enfriamiento', 'EXC-ENFRIAMIENTO', 'Radiadores y ventiladores'),
  ('Sistema de Lubricación', 'EXC-LUBRICACION', 'Bombas y depósitos de aceite')
) AS t(name, code, description)
WHERE components_template.id = (SELECT id FROM components_template WHERE code = 'EXC-CAT390F');

-- Motor Components (Level 2)
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', name, code, motor_id, 2, description
FROM (VALUES
  ('Motor Diesel CAT 3412', 'EXC-MOT-DIESEL', 'Motor principal'),
  ('Turbocompresor', 'EXC-MOT-TURBO', 'Incrementa potencia'),
  ('Sistema de Inyección', 'EXC-MOT-INYECCION', 'Inyectores diésel')
) AS t(name, code, description)
WHERE motor_id = (SELECT id FROM components_template WHERE code = 'EXC-MOTOR');

-- Subsystems de Motor (Level 3)
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', name, code, diesel_id, 3, description
FROM (VALUES
  ('Bloque Motor', 'EXC-MOT-BLOQUE', 'Cilindros y pistones'),
  ('Culata', 'EXC-MOT-CULATA', 'Válvulas y cámaras'),
  ('Cigüeñal', 'EXC-MOT-CIGUENAL', 'Eje de rotación'),
  ('Bielas', 'EXC-MOT-BIELAS', 'Conexión pistones-cigüeñal'),
  ('Correas y Poleas', 'EXC-MOT-CORREAS', 'Transmisión de potencia')
) AS t(name, code, description)
WHERE diesel_id = (SELECT id FROM components_template WHERE code = 'EXC-MOT-DIESEL');

-- Sistema Hidráulico Components (Level 2)
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', name, code, hidraulico_id, 2, description
FROM (VALUES
  ('Bomba Hidráulica Principal', 'EXC-HID-BOMBA', 'Bomba de desplazamiento variable'),
  ('Cilindros Hidráulicos', 'EXC-HID-CILINDROS', 'Cilindros de accionamiento'),
  ('Válvulas de Control', 'EXC-HID-VALVULAS', 'Válvulas directoras'),
  ('Tanque Hidráulico', 'EXC-HID-TANQUE', 'Depósito de fluido'),
  ('Sistema de Enfriamiento Hidráulico', 'EXC-HID-ENFRIAMIENTO', 'Enfriadores de aceite')
) AS t(name, code, description)
WHERE hidraulico_id = (SELECT id FROM components_template WHERE code = 'EXC-HIDRAULICO');

-- Tren de Rodaje (Level 2)
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', name, code, rodaje_id, 2, description
FROM (VALUES
  ('Orugas', 'EXC-ROD-ORUGAS', 'Cadenas de rodaje'),
  ('Rodillos Inferiores', 'EXC-ROD-RODILLOS', 'Rodillos de contacto'),
  ('Rueda Tensora', 'EXC-ROD-TENSORA', 'Rueda de tensión'),
  ('Rueda Conductora', 'EXC-ROD-CONDUCTORA', 'Rueda motriz'),
  ('Bastidor de Rodaje', 'EXC-ROD-BASTIDOR', 'Estructura de rodaje')
) AS t(name, code, description)
WHERE rodaje_id = (SELECT id FROM components_template WHERE code = 'EXC-RODAJE');

-- ============================================
-- 2. FAULT MODES (Modos de Falla)
-- ============================================

-- Fallas del Motor Diesel
INSERT INTO fault_modes (component_template_id, fault_code, fault_name, description, severity, symptoms, probable_causes)
SELECT id, fault_code, fault_name, description, severity, symptoms, probable_causes
FROM (VALUES
  ('EXC-MOT-DIESEL', 'FM-001', 'Sobrecalentamiento Motor', 'Temperatura excedemax 95°C', 'critica', 'Temperatura alta, pérdida potencia', 'Radiador sucio, termostato fallido, falta de agua'),
  ('EXC-MOT-DIESEL', 'FM-002', 'Pérdida de Potencia', 'RPM no alcanzan límite', 'mayor', 'Baja potencia, aceleración lenta', 'Turbo fallido, inyectores sucios, filtro aire'),
  ('EXC-MOT-DIESEL', 'FM-003', 'Ruidos Anormales', 'Golpes o chirridos', 'mayor', 'Ruidos metálicos, vibraciones', 'Bielas flojas, cigüeñal desgastado'),
  ('EXC-MOT-BLOQUE', 'FM-004', 'Pérdida de Aceite', 'Goteos de aceite', 'mayor', 'Manchas de aceite, bajo nivel', 'Juntas gastadas, grietas en bloque'),
  ('EXC-MOT-CORREAS', 'FM-005', 'Ruptura de Correas', 'Correas dañadas', 'critica', 'Ruidos chirriantes, avería del motor', 'Desgaste, desalineación de poleas, tensión incorrecta')
) AS t(component_code, fault_code, fault_name, description, severity, symptoms, probable_causes)
INNER JOIN components_template ct ON ct.code = t.component_code;

-- Fallas del Sistema Hidráulico
INSERT INTO fault_modes (component_template_id, fault_code, fault_name, description, severity, symptoms, probable_causes)
SELECT id, fault_code, fault_name, description, severity, symptoms, probable_causes
FROM (VALUES
  ('EXC-HID-BOMBA', 'FM-010', 'Pérdida de Presión', 'Presión baja (<250 bar)', 'critica', 'Movimientos lentos, falta de potencia', 'Bomba desgastada, filtro obstruido, válvula defectuosa'),
  ('EXC-HID-CILINDROS', 'FM-011', 'Cilindro con Fuga', 'Goteos de aceite', 'mayor', 'Movimiento errático, pérdida potencia', 'Sellos gastados, vástagos dañados'),
  ('EXC-HID-VALVULAS', 'FM-012', 'Válvula Atascada', 'No responde comando', 'mayor', 'Direcciones no funcionan', 'Sedimento en válvula, aceite contaminado'),
  ('EXC-HID-TANQUE', 'FM-013', 'Contaminación de Aceite', 'Aceite sucio o turbio', 'mayor', 'Fallos intermitentes, daño de componentes', 'Filtros sucios, entrada de agua/polvo'),
  ('EXC-HID-ENFRIAMIENTO', 'FM-014', 'Sobrecalentamiento Hidráulico', 'Temp aceite >60°C', 'mayor', 'Falta de presión, sistema lento', 'Enfriador obstruido, radiador sucio')
) AS t(component_code, fault_code, fault_name, description, severity, symptoms, probable_causes)
INNER JOIN components_template ct ON ct.code = t.component_code;

-- Fallas del Tren de Rodaje
INSERT INTO fault_modes (component_template_id, fault_code, fault_name, description, severity, symptoms, probable_causes)
SELECT id, fault_code, fault_name, description, severity, symptoms, probable_causes
FROM (VALUES
  ('EXC-ROD-ORUGAS', 'FM-020', 'Ruptura de Oruga', 'Cadena rota', 'critica', 'Pérdida de tracción, vehículo inmovilizado', 'Desgaste extremo, impacto, sobrecarga'),
  ('EXC-ROD-RODILLOS', 'FM-021', 'Rodillo Desgastado', 'Rodillo desalineado', 'mayor', 'Vibración, ruido, desplazamiento lento', 'Desgaste normal por uso, falta de lubricación'),
  ('EXC-ROD-TENSORA', 'FM-022', 'Rueda Tensora Floja', 'Tensión incorrecta', 'menor', 'Chirridos, vibración leve', 'Pernos sueltos, rodamiento desgastado'),
  ('EXC-ROD-CONDUCTORA', 'FM-023', 'Rueda Conductora Dañada', 'Dientes rotos', 'critica', 'No hay tracción, vehículo inmovilizado', 'Sobrecarga, impacto, desgaste')
) AS t(component_code, fault_code, fault_name, description, severity, symptoms, probable_causes)
INNER JOIN components_template ct ON ct.code = t.component_code;

-- ============================================
-- 3. WEAR PARTS (Piezas de Desgaste)
-- ============================================

-- Piezas para FM-001 (Sobrecalentamiento)
INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
SELECT id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min
FROM (VALUES
  ('FM-001', 'P-001', 'Termostato CAT', 'Termostato de 82°C', 'CAT Parts', 450.00, 3, true, 2),
  ('FM-001', 'P-002', 'Correa Radiador', 'Correa de transmisión radiador', 'Gates', 120.00, 2, false, 3),
  ('FM-001', 'P-003', 'Agua Destilada (Garrafón)', '5 litros agua destilada', 'General', 15.00, 1, false, 5)
) AS t(fault_code, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
INNER JOIN fault_modes fm ON fm.fault_code = t.fault_code;

-- Piezas para FM-005 (Ruptura de Correas)
INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
SELECT id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min
FROM (VALUES
  ('FM-005', 'P-010', 'Correa Serpentina CAT 3412', 'Correa principal motor', 'CAT Parts', 280.00, 5, true, 2),
  ('FM-005', 'P-011', 'Polea Cigüeñal', 'Polea motriz', 'CAT Parts', 350.00, 7, true, 1),
  ('FM-005', 'P-012', 'Tensor de Correa', 'Tensor automático', 'CAT Parts', 180.00, 5, false, 2)
) AS t(fault_code, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
INNER JOIN fault_modes fm ON fm.fault_code = t.fault_code;

-- Piezas para FM-010 (Pérdida de Presión Hidráulica)
INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
SELECT id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min
FROM (VALUES
  ('FM-010', 'P-020', 'Filtro Hidráulico Principal', 'Filtro de 10 micras', 'Parker', 95.00, 2, true, 3),
  ('FM-010', 'P-021', 'Kit Reparación Bomba Hidráulica', 'Sellos y empaques', 1200.00, 14, true, 1),
  ('FM-010', 'P-022', 'Aceite Hidráulico ISO 46', 'Barril de 208 litros', 'Shell Tellus', 380.00, 3, true, 2)
) AS t(fault_code, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
INNER JOIN fault_modes fm ON fm.fault_code = t.fault_code;

-- Piezas para FM-011 (Cilindro con Fuga)
INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
SELECT id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min
FROM (VALUES
  ('FM-011', 'P-030', 'Kit Sellos Cilindro', 'Set de sellos y empaques', 'Eaton', 280.00, 7, true, 2),
  ('FM-011', 'P-031', 'Vástago de Cilindro', 'Vástago cromado 3.5"', 'Parker', 420.00, 10, true, 1)
) AS t(fault_code, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
INNER JOIN fault_modes fm ON fm.fault_code = t.fault_code;

-- Piezas para FM-020 (Ruptura de Oruga)
INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
SELECT id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min
FROM (VALUES
  ('FM-020', 'P-040', 'Oruga Completa CAT 390F', 'Cadena de rodaje completa', 'CAT Parts', 15000.00, 30, true, 0),
  ('FM-020', 'P-041', 'Eslabón de Oruga', 'Eslabón individual', 'CAT Parts', 280.00, 5, false, 10),
  ('FM-020', 'P-042', 'Pasador de Eslabón', 'Pasador de acero', 'General', 45.00, 2, false, 20)
) AS t(fault_code, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
INNER JOIN fault_modes fm ON fm.fault_code = t.fault_code;

-- Piezas para FM-023 (Rueda Conductora Dañada)
INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
SELECT id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min
FROM (VALUES
  ('FM-023', 'P-050', 'Rueda Conductora CAT 390F', 'Rueda motriz completa', 'CAT Parts', 8500.00, 21, true, 1),
  ('FM-023', 'P-051', 'Diente de Rueda', 'Diente de reemplazo', 'CAT Parts', 180.00, 7, false, 5),
  ('FM-023', 'P-052', 'Rodamiento Rueda Conductora', 'Rodamiento SKF', 'SKF', 450.00, 5, true, 2)
) AS t(fault_code, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_min)
INNER JOIN fault_modes fm ON fm.fault_code = t.fault_code;

-- ============================================
-- 4. EXAMPLE VEHICLE (Excavadora Real)
-- ============================================

INSERT INTO vehicles (code, name, vehicle_type, model, year, site, status)
VALUES ('EXC-001', 'Excavadora Amarilla #1', 'excavadora', 'CAT 390F', 2018, 'Faena Mapocho', 'operativo');

-- Crear instancias de componentes para esta excavadora
WITH vehicle_id AS (
  SELECT id FROM vehicles WHERE code = 'EXC-001'
),
template_tree AS (
  SELECT id, code, name, level
  FROM components_template
  WHERE vehicle_type = 'excavadora'
)
INSERT INTO components (vehicle_id, template_id, code, name, parent_id, status)
SELECT v.id, t.id, 'INST-' || t.code, t.name, NULL, 'operativo'
FROM vehicle_id v, template_tree t
WHERE t.level <= 2;
