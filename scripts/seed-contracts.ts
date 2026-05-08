import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedContracts() {
  try {
    // First, ensure we have contractors
    const { data: contractors, error: contractorError } = await supabase
      .from('contractors')
      .select('id')
      .limit(1);

    if (contractorError) {
      console.error('Error fetching contractors:', contractorError);
      return;
    }

    let contractorId = contractors?.[0]?.id;

    // If no contractors exist, create one
    if (!contractorId) {
      const { data: newContractor, error: createError } = await supabase
        .from('contractors')
        .insert({
          name: 'Constructora Patagua SPA',
          rut: '76.123.456-K',
          business_type: 'Construcción y Minería',
          contact_email: 'contacto@constructorapatagua.cl',
          contact_phone: '+56 9 8765 4321',
          address: 'Avenida Principal 1000',
          city: 'Santiago',
          region: 'Región Metropolitana',
          country: 'Chile',
          legal_representative: 'Carlos Mendoza Torres',
          registration_status: 'Activo',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating contractor:', createError);
        return;
      }

      contractorId = newContractor.id;
    }

    // Now insert contracts
    const contracts = [
      {
        title: 'Contrato Principal Operaciones La Patagua 2024',
        contract_number: 'CNT-2024-001',
        contract_type: 'Principal',
        description: 'Contrato principal para servicios de operación y mantenimiento de equipos mineros',
        start_date: '2024-01-15',
        end_date: '2024-12-31',
        contract_value: 50000000,
        currency: 'CLP',
        payment_terms: 'A 30 días desde facturación',
        status: 'Vigente',
        responsible_person: 'Juan Carlos González',
        responsible_area: 'Operaciones',
        contractor_id: contractorId,
        file_path: '/contracts/CNT-2024-001.pdf',
        document_url: 'https://example.com/CNT-2024-001.pdf',
        created_at: new Date('2024-01-01').toISOString(),
      },
      {
        title: 'Subcontrato Mantención Preventiva',
        contract_number: 'CNT-2024-002',
        contract_type: 'Subcontrato',
        description: 'Servicios de mantención preventiva para equipos críticos de la operación',
        start_date: '2024-02-01',
        end_date: '2025-01-31',
        contract_value: 25000000,
        currency: 'CLP',
        payment_terms: 'A 45 días desde facturación',
        status: 'Por Vencer',
        responsible_person: 'María Elena Rodríguez',
        responsible_area: 'Mantenimiento',
        contractor_id: contractorId,
        file_path: '/contracts/CNT-2024-002.pdf',
        document_url: 'https://example.com/CNT-2024-002.pdf',
        created_at: new Date('2024-01-15').toISOString(),
        execution_percentage: 45,
      },
      {
        title: 'Contrato Arrendamiento de Equipos Pesados',
        contract_number: 'CNT-2024-003',
        contract_type: 'Principal',
        description: 'Arrendamiento de excavadoras, cargadores y camiones para operaciones de extracción',
        start_date: '2024-03-01',
        end_date: '2024-09-30',
        contract_value: 75000000,
        currency: 'CLP',
        payment_terms: 'A 30 días desde facturación',
        status: 'Vigente',
        responsible_person: 'Roberto Fernández',
        responsible_area: 'Operaciones',
        contractor_id: contractorId,
        file_path: '/contracts/CNT-2024-003.pdf',
        document_url: 'https://example.com/CNT-2024-003.pdf',
        created_at: new Date('2024-02-01').toISOString(),
        execution_percentage: 65,
      },
      {
        title: 'Enmienda al Contrato CNT-2024-001',
        contract_number: 'CNT-2024-001-A1',
        contract_type: 'Enmienda',
        description: 'Ampliación de servicios incluidos en contrato principal con incremento de 20%',
        start_date: '2024-06-01',
        end_date: '2024-12-31',
        contract_value: 60000000,
        currency: 'CLP',
        payment_terms: 'A 30 días desde facturación',
        status: 'En Revisión',
        responsible_person: 'Juan Carlos González',
        responsible_area: 'Legal',
        contractor_id: contractorId,
        file_path: '/contracts/CNT-2024-001-A1.pdf',
        document_url: 'https://example.com/CNT-2024-001-A1.pdf',
        created_at: new Date('2024-05-01').toISOString(),
      },
      {
        title: 'Contrato Servicios de Seguridad Operacional',
        contract_number: 'CNT-2024-004',
        contract_type: 'Principal',
        description: 'Servicios de seguridad, vigilancia y cumplimiento normativo HSE',
        start_date: '2024-01-01',
        end_date: '2025-12-31',
        contract_value: 15000000,
        currency: 'CLP',
        payment_terms: 'Mensual a prorrateo',
        status: 'Vencido',
        responsible_person: 'Patricia Sánchez',
        responsible_area: 'RRHH/Seguridad',
        contractor_id: contractorId,
        file_path: '/contracts/CNT-2024-004.pdf',
        document_url: 'https://example.com/CNT-2024-004.pdf',
        created_at: new Date('2023-12-01').toISOString(),
        execution_percentage: 100,
      },
      {
        title: 'Contrato Suministro de Repuestos Críticos',
        contract_number: 'CNT-2024-005',
        contract_type: 'Principal',
        description: 'Suministro y abastecimiento de repuestos para equipos mineros críticos',
        start_date: '2024-04-01',
        end_date: '2024-12-31',
        contract_value: 18000000,
        currency: 'CLP',
        payment_terms: 'A 15 días desde recepción',
        status: 'Vigente',
        responsible_person: 'Luis Martínez',
        responsible_area: 'Compras',
        contractor_id: contractorId,
        file_path: '/contracts/CNT-2024-005.pdf',
        document_url: 'https://example.com/CNT-2024-005.pdf',
        created_at: new Date('2024-03-01').toISOString(),
        execution_percentage: 78,
      },
    ];

    const { data, error } = await supabase
      .from('contracts')
      .insert(contracts)
      .select();

    if (error) {
      console.error('Error inserting contracts:', error);
      return;
    }

    console.log(`✓ Successfully seeded ${data?.length || 0} contracts`);
    console.log('Sample contracts created:');
    data?.forEach((contract: any) => {
      console.log(`  - ${contract.contract_number}: ${contract.title} (${contract.status})`);
    });
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

seedContracts();
