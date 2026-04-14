-- Seed Data: Vehicle Fault Tree - Simple version
-- Insert test vehicle directly

-- 1. CREATE TEST VEHICLE
INSERT INTO vehicles (code, name, vehicle_type, model, year, site, status, purchase_date)
VALUES ('EXC-001', 'Excavadora CAT 390F', 'excavadora', 'CAT 390F', 2019, 'Faena Central', 'operativo', '2019-03-15');

-- 2. CREATE COMPONENT TEMPLATES for Excavadora
-- Root template
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
VALUES ('excavadora', 'Excavadora CAT 390F', 'TMPL-EXC-ROOT', NULL, 0, 'Template raíz para excavadora');

-- Get IDs for use in subsequent inserts
-- Motor subsystem
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Sistema Motor', 'TMPL-MOTOR', id, 1, 'Motor diesel y transmisión'
FROM components_template WHERE code = 'TMPL-EXC-ROOT';

-- Motor diesel component
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Motor Diesel CAT 3412', 'TMPL-MOT-DIESEL', id, 2, 'Motor principal CAT'
FROM components_template WHERE code = 'TMPL-MOTOR';

-- Motor parts
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Bloque Motor', 'TMPL-BLOQUE', id, 3, 'Cilindros y pistones'
FROM components_template WHERE code = 'TMPL-MOT-DIESEL';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Culata', 'TMPL-CULATA', id, 3, 'Válvulas y cámaras'
FROM components_template WHERE code = 'TMPL-MOT-DIESEL';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Turbocompresor', 'TMPL-TURBO', id, 3, 'Incrementa potencia'
FROM components_template WHERE code = 'TMPL-MOT-DIESEL';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Correas y Poleas', 'TMPL-CORREAS', id, 3, 'Transmisión de potencia'
FROM components_template WHERE code = 'TMPL-MOT-DIESEL';

-- Hydraulic subsystem
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Sistema Hidráulico', 'TMPL-HIDRAULICO', id, 1, 'Bomba y circuitos hidráulicos'
FROM components_template WHERE code = 'TMPL-EXC-ROOT';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Bomba Hidráulica', 'TMPL-BOMBA', id, 2, 'Bomba principal'
FROM components_template WHERE code = 'TMPL-HIDRAULICO';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Cilindros Hidráulicos', 'TMPL-CILINDROS', id, 2, 'Actuadores hidráulicos'
FROM components_template WHERE code = 'TMPL-HIDRAULICO';

-- Track/undercarriage subsystem
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Tren de Rodaje', 'TMPL-RODAJE', id, 1, 'Orugas y rodillos'
FROM components_template WHERE code = 'TMPL-EXC-ROOT';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Orugas', 'TMPL-ORUGAS', id, 2, 'Cadenas de tracción'
FROM components_template WHERE code = 'TMPL-RODAJE';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Rodillos', 'TMPL-RODILLOS', id, 2, 'Rodillos de apoyo'
FROM components_template WHERE code = 'TMPL-RODAJE';

-- Cooling system
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Sistema Enfriamiento', 'TMPL-ENFRIAMIENTO', id, 1, 'Radiadores y ventiladores'
FROM components_template WHERE code = 'TMPL-EXC-ROOT';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Radiador', 'TMPL-RADIADOR', id, 2, 'Disipador de calor'
FROM components_template WHERE code = 'TMPL-ENFRIAMIENTO';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Ventilador', 'TMPL-VENTILADOR', id, 2, 'Ventilador eléctrico'
FROM components_template WHERE code = 'TMPL-ENFRIAMIENTO';

-- Electrical system
INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Sistema Eléctrico', 'TMPL-ELECTRICO', id, 1, 'Baterías y alternador'
FROM components_template WHERE code = 'TMPL-EXC-ROOT';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Batería', 'TMPL-BATERIA', id, 2, 'Batería principal'
FROM components_template WHERE code = 'TMPL-ELECTRICO';

INSERT INTO components_template (vehicle_type, name, code, parent_id, level, description)
SELECT 'excavadora', 'Alternador', 'TMPL-ALTERNADOR', id, 2, 'Generador eléctrico'
FROM components_template WHERE code = 'TMPL-ELECTRICO';

-- 3. CREATE FAULT MODES for Motor
INSERT INTO fault_modes (component_template_id, fault_code, fault_name, description, severity, symptoms, probable_causes)
SELECT id, 'FM-MOTOR-001', 'Sobrecalentamiento', 'Motor excede temperatura límite', 'critica', 'Temperatura > 95°C, humo', 'Radiador obstruido, termostato defectuoso, ventilador lento'
FROM components_template WHERE code = 'TMPL-MOT-DIESEL';

INSERT INTO fault_modes (component_template_id, fault_code, fault_name, description, severity, symptoms, probable_causes)
SELECT id, 'FM-MOTOR-002', 'Pérdida de potencia', 'Rendimiento motor disminuido', 'mayor', 'Baja presión, humo negro', 'Inyectores defectuosos, filtro saturado, turbo fallido'
FROM components_template WHERE code = 'TMPL-MOT-DIESEL';

INSERT INTO fault_modes (component_template_id, fault_code, fault_name, description, severity, symptoms, probable_causes)
SELECT id, 'FM-MOTOR-003', 'Fuga de aceite', 'Pérdida de aceite del motor', 'mayor', 'Manchas bajo máquina, bajo nivel', 'Sello defectuoso, junta quemada, grieta en bloque'
FROM components_template WHERE code = 'TMPL-MOT-DIESEL';

-- 4. CREATE WEAR PARTS for Motor faults
INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_current, stock_min)
SELECT id, 'PART-RAD-001', 'Radiador', 'Radiador completo CAT 390F', 'Dealer CAT Chile', 4500.00, 7, true, 0, 1
FROM fault_modes WHERE fault_code = 'FM-MOTOR-001';

INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_current, stock_min)
SELECT id, 'PART-TERM-001', 'Termostato', 'Termostato regulable', 'Dealer CAT Chile', 450.00, 3, true, 2, 1
FROM fault_modes WHERE fault_code = 'FM-MOTOR-001';

INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_current, stock_min)
SELECT id, 'PART-VEN-001', 'Ventilador', 'Ventilador hidráulico', 'Dealer CAT Chile', 2800.00, 5, true, 1, 1
FROM fault_modes WHERE fault_code = 'FM-MOTOR-001';

INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_current, stock_min)
SELECT id, 'PART-INY-001', 'Juego Inyectores', '6 Inyectores diésel', 'Dealer CAT Chile', 1800.00, 10, true, 0, 1
FROM fault_modes WHERE fault_code = 'FM-MOTOR-002';

INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_current, stock_min)
SELECT id, 'PART-TURBO-001', 'Turbocompresor', 'Turbo completo', 'Dealer CAT Chile', 8900.00, 14, true, 0, 1
FROM fault_modes WHERE fault_code = 'FM-MOTOR-002';

INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_current, stock_min)
SELECT id, 'PART-SELLO-001', 'Kit sellos motor', 'Sellos y juntas completos', 'Distribuidor Local', 550.00, 2, false, 3, 2
FROM fault_modes WHERE fault_code = 'FM-MOTOR-003';

-- 5. CREATE FAULT MODES for Hydraulic System
INSERT INTO fault_modes (component_template_id, fault_code, fault_name, description, severity, symptoms, probable_causes)
SELECT id, 'FM-HID-001', 'Baja presión hidráulica', 'Presión menor a límite operacional', 'critica', 'Movimientos lentos, sin fuerza', 'Bomba desgastada, fuga interna, filtro sucio'
FROM components_template WHERE code = 'TMPL-BOMBA';

INSERT INTO fault_modes (component_template_id, fault_code, fault_name, description, severity, symptoms, probable_causes)
SELECT id, 'FM-HID-002', 'Fuga hidráulica', 'Pérdida de fluido', 'mayor', 'Manchas, bajo nivel depósito', 'Manguera rota, sello defectuoso, conexión suelta'
FROM components_template WHERE code = 'TMPL-BOMBA';

-- 6. CREATE WEAR PARTS for Hydraulic faults
INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_current, stock_min)
SELECT id, 'PART-BOMBA-001', 'Bomba Hidráulica', 'Bomba de desplazamiento variable', 'Dealer CAT Chile', 12500.00, 21, true, 0, 1
FROM fault_modes WHERE fault_code = 'FM-HID-001';

INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_current, stock_min)
SELECT id, 'PART-FILTRO-HID-001', 'Filtro Hidráulico', 'Elemento filtrante 100µ', 'Distribuidor Local', 180.00, 1, false, 5, 2
FROM fault_modes WHERE fault_code = 'FM-HID-001';

INSERT INTO wear_parts (fault_mode_id, part_code, part_name, description, supplier, unit_cost, lead_time_days, is_critical, stock_current, stock_min)
SELECT id, 'PART-MANGUERA-001', 'Juego Mangueras', 'Mangueras de alta presión', 'Distribuidor Local', 2200.00, 3, false, 2, 1
FROM fault_modes WHERE fault_code = 'FM-HID-002';

-- 7. CREATE COMPONENT INSTANCES for the test vehicle
-- Motor instance
INSERT INTO components (vehicle_id, template_id, code, name, parent_id, status)
SELECT v.id, ct.id, 'MOTOR-EXC-001', 'Motor Principal', NULL, 'operativo'
FROM vehicles v, components_template ct
WHERE v.code = 'EXC-001' AND ct.code = 'TMPL-MOT-DIESEL';

-- Hydraulic components
INSERT INTO components (vehicle_id, template_id, code, name, parent_id, status)
SELECT v.id, ct.id, 'HIDRO-BOMBA-001', 'Bomba Hidráulica', NULL, 'operativo'
FROM vehicles v, components_template ct
WHERE v.code = 'EXC-001' AND ct.code = 'TMPL-BOMBA';

-- Commit message
SELECT 'Seed data - Excavadora CAT 390F con árbol de fallas completo insertado exitosamente' as message;
