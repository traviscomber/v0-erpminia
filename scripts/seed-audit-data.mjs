import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedProductionSensors() {
  console.log('Seeding production sensor data...');
  
  const equipment = [
    { name: 'Filtro Vacío 1', type: 'Filtering', criticality: 'high', status: 'operational' },
    { name: 'Filtro Vacío 2', type: 'Filtering', criticality: 'high', status: 'operational' },
    { name: 'Hidrociclones', type: 'Hydrocyclone', criticality: 'medium', status: 'operational' },
    { name: 'Molino Bolas 1', type: 'Mill', criticality: 'high', status: 'maintenance' },
    { name: 'Molino SAG', type: 'Mill', criticality: 'critical', status: 'operational' },
  ];

  for (const eq of equipment) {
    // Insert equipment
    const { data: eqData } = await supabase
      .from('equipment')
      .insert(eq)
      .select()
      .single();

    if (eqData) {
      // Seed sensor data
      const sensorTypes = [
        { name: 'Temperatura', unit: '°C', value: Math.round((65 + Math.random() * 20) * 100) / 100 },
        { name: 'Presión', unit: 'PSI', value: Math.round((80 + Math.random() * 30) * 100) / 100 },
        { name: 'Vibración', unit: 'mm/s', value: Math.round((2 + Math.random() * 3) * 100) / 100 },
      ];

      for (const sensor of sensorTypes) {
        await supabase
          .from('sensor_readings')
          .insert({
            equipment_id: eqData.id,
            sensor_type: sensor.name,
            value: sensor.value,
            unit: sensor.unit,
            timestamp: new Date().toISOString(),
            status: 'normal',
          });
      }
    }
  }
  
  console.log('✅ Sensor data seeded successfully!');
}

async function seedInventory() {
  console.log('Seeding inventory data...');
  
  const inventory = [
    { name: 'Filtros de tela', sku: 'FT-001', quantity: 45, min_stock: 10, max_stock: 100, location: 'A1', category: 'Consumibles' },
    { name: 'Tubería acero 2"', sku: 'TA-2IN', quantity: 120, min_stock: 20, max_stock: 200, location: 'B2', category: 'Materiales' },
    { name: 'Cojinetes SKF', sku: 'SKF-6205', quantity: 8, min_stock: 5, max_stock: 50, location: 'C3', category: 'Repuestos' },
    { name: 'Correas de transmisión', sku: 'CORREA-V', quantity: 32, min_stock: 5, max_stock: 80, location: 'D1', category: 'Repuestos' },
    { name: 'Lubricante industrial', sku: 'LUB-ISO32', quantity: 250, min_stock: 50, max_stock: 500, location: 'E2', category: 'Consumibles' },
    { name: 'Sellos mecánicos', sku: 'SELLO-BR', quantity: 15, min_stock: 5, max_stock: 40, location: 'F3', category: 'Repuestos' },
    { name: 'Acoplamiento elástico', sku: 'ACOPL-90', quantity: 6, min_stock: 2, max_stock: 15, location: 'A3', category: 'Repuestos' },
    { name: 'Tornillos inox M16', sku: 'TORN-M16', quantity: 500, min_stock: 100, max_stock: 1000, location: 'B1', category: 'Materiales' },
  ];

  for (const item of inventory) {
    await supabase
      .from('inventory')
      .insert(item);
  }

  console.log('✅ Inventory seeded successfully!');
}

async function seedDocuments() {
  console.log('Seeding documents...');
  
  const documents = [
    { 
      name: 'Procedimiento Mantenimiento Preventivo', 
      type: 'Procedimiento', 
      status: 'Aprobado', 
      created_by: 'admin',
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    },
    { 
      name: 'Manual de Seguridad Operacional', 
      type: 'Manual', 
      status: 'Aprobado', 
      created_by: 'admin',
      expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString()
    },
    { 
      name: 'Política de Control de Cambios', 
      type: 'Política', 
      status: 'Pendiente', 
      created_by: 'admin',
      expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    { 
      name: 'Checklist Inspección Equipos', 
      type: 'Checklist', 
      status: 'Aprobado', 
      created_by: 'admin',
      expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    },
  ];

  for (const doc of documents) {
    await supabase
      .from('documents')
      .insert(doc);
  }

  console.log('✅ Documents seeded successfully!');
}

async function main() {
  try {
    console.log('\n🌱 Starting data seeding...\n');
    await seedProductionSensors();
    await seedInventory();
    await seedDocuments();
    console.log('\n✅ All data seeded successfully!\n');
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
  }
}

main();
