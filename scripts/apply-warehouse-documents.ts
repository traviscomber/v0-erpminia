import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedWarehouseData() {
  console.log('Seeding warehouse data...');

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs?.length) {
    console.error('No organization found');
    return;
  }

  const orgId = orgs[0].id;

  // Seed zones
  const zones = [
    { zone_code: 'Z-01', zone_name: 'ZONA A - Repuestos Menores', organization_id: orgId },
    { zone_code: 'Z-02', zone_name: 'ZONA B - Repuestos Críticos', organization_id: orgId },
    { zone_code: 'Z-03', zone_name: 'ZONA C - Consumibles', organization_id: orgId },
  ];

  const { data: existingZones } = await supabase
    .from('warehouse_zones')
    .select('zone_code')
    .eq('organization_id', orgId);

  if (!existingZones?.length) {
    const { error } = await supabase.from('warehouse_zones').insert(zones);
    if (!error) console.log('✓ Zones created');
    else console.error('Zone error:', error.message);
  } else {
    console.log('✓ Zones already exist');
  }

  // Get first zone
  const { data: zoneData } = await supabase
    .from('warehouse_zones')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1);

  if (!zoneData?.length) return;
  const zoneId = zoneData[0].id;

  // Seed racks
  const racks = [
    { rack_code: 'R-001', rack_name: 'Rack 1', capacity_units: 500, zone_id: zoneId },
    { rack_code: 'R-002', rack_name: 'Rack 2', capacity_units: 500, zone_id: zoneId },
  ];

  const { data: existingRacks } = await supabase
    .from('warehouse_racks')
    .select('rack_code')
    .eq('zone_id', zoneId);

  if (!existingRacks?.length) {
    const { error } = await supabase.from('warehouse_racks').insert(racks);
    if (!error) console.log('✓ Racks created');
    else console.error('Rack error:', error.message);
  } else {
    console.log('✓ Racks already exist');
  }

  // Get first rack
  const { data: rackData } = await supabase
    .from('warehouse_racks')
    .select('id')
    .eq('zone_id', zoneId)
    .limit(1);

  if (!rackData?.length) return;
  const rackId = rackData[0].id;

  // Seed bins
  const bins = [
    { bin_code: 'B-001', bin_location: 'A-1-1', capacity_units: 100, rack_id: rackId },
    { bin_code: 'B-002', bin_location: 'A-1-2', capacity_units: 100, rack_id: rackId },
  ];

  const { data: existingBins } = await supabase
    .from('warehouse_bins')
    .select('bin_code')
    .eq('rack_id', rackId);

  if (!existingBins?.length) {
    const { error } = await supabase.from('warehouse_bins').insert(bins);
    if (!error) console.log('✓ Bins created');
    else console.error('Bin error:', error.message);
  } else {
    console.log('✓ Bins already exist');
  }

  // Get first bin
  const { data: binData } = await supabase
    .from('warehouse_bins')
    .select('id')
    .eq('rack_id', rackId)
    .limit(1);

  if (!binData?.length) return;
  const binId = binData[0].id;

  // Seed stock
  const stocks = [
    {
      part_code: 'SKU-001',
      part_name: 'Correa de transmisión',
      organization_id: orgId,
      bin_id: binId,
      quantity_on_hand: 15,
      reorder_level: 5,
      reorder_quantity: 10,
      unit_cost: 250,
    },
    {
      part_code: 'SKU-002',
      part_name: 'Rodamientos SKF 6008',
      organization_id: orgId,
      bin_id: binId,
      quantity_on_hand: 8,
      reorder_level: 3,
      reorder_quantity: 5,
      unit_cost: 450,
    },
    {
      part_code: 'SKU-003',
      part_name: 'Aceite Hidráulico ISO 46',
      organization_id: orgId,
      bin_id: binId,
      quantity_on_hand: 50,
      reorder_level: 10,
      reorder_quantity: 25,
      unit_cost: 120,
    },
  ];

  const { data: existingStock } = await supabase
    .from('warehouse_stock')
    .select('part_code')
    .eq('organization_id', orgId);

  if (!existingStock?.length) {
    const { error } = await supabase.from('warehouse_stock').insert(stocks);
    if (!error) console.log('✓ Stock items created');
    else console.error('Stock error:', error.message);
  } else {
    console.log('✓ Stock items already exist');
  }
}

async function seedDocuments() {
  console.log('Seeding documents...');

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs?.length) return;

  const orgId = orgs[0].id;

  const documents = [
    {
      nombre_documento: 'Procedimiento de Seguridad en Altura',
      descripcion: 'Procedimiento para trabajos en altura',
      tipo: 'Procedimiento',
      estado: 'vigente',
      version_actual: '1.0',
      areas_aplica: ['Operaciones', 'Mantenimiento'],
      cargos_aplica: ['Operario', 'Técnico'],
    },
    {
      nombre_documento: 'Manual de Equipos de Protección',
      descripcion: 'Guía de uso y mantenimiento de EPP',
      tipo: 'Manual',
      estado: 'vigente',
      version_actual: '2.1',
      areas_aplica: ['HSE', 'Todas'],
      cargos_aplica: ['Todos'],
    },
    {
      nombre_documento: 'Política de Medio Ambiente',
      descripcion: 'Compromiso organizacional ambiental',
      tipo: 'Política',
      estado: 'vigente',
      version_actual: '1.2',
      areas_aplica: ['Todas'],
      cargos_aplica: ['Gerencia', 'Coordinadores'],
    },
  ];

  const { data: existingDocs } = await supabase
    .from('hse_master_documents')
    .select('nombre_documento');

  if (!existingDocs?.length) {
    const { error } = await supabase
      .from('hse_master_documents')
      .insert(documents.map(d => ({ ...d, organization_id: orgId, created_by: null })));
    if (!error) console.log('✓ Documents created');
    else console.error('Document error:', error.message);
  } else {
    console.log('✓ Documents already exist');
  }
}

async function main() {
  try {
    await seedWarehouseData();
    await seedDocuments();
    console.log('\n✅ All operations completed');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
