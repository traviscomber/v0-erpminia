import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Get or create contractor
    const { data: contractors, error: contractorError } = await supabase
      .from('contractors')
      .select('id')
      .limit(1);

    let contractorId = contractors?.[0]?.id;

    if (!contractorId) {
      const { data: newContractor, error: createError } = await supabase
        .from('contractors')
        .insert({
          name: 'Prestadores La Patagua SpA',
          rut: '78.012.300-8',
          business_type: 'Servicios Operacionales',
          country: 'Chile',
          region: 'Aysén',
          city: 'Villa O\'Higgins',
          contact_email: 'info@lapatagua.cl',
          contact_phone: '+56912345678',
        })
        .select('id')
        .single();

      if (createError) throw createError;
      contractorId = newContractor.id;
      console.log('[v0] Created new contractor:', contractorId);
    }

    // Mock contract data
    const mockContracts = [
      {
        title: 'Contrato Principal Operaciones La Patagua 2024',
        contract_number: 'CNT-2024-001',
        contract_type: 'Principal',
        status: 'Vigente',
        description: 'Contrato marco para servicios operacionales minería La Patagua',
        start_date: '2024-01-15',
        end_date: '2025-01-14',
        contract_value: 50000000,
        currency: 'CLP',
        payment_terms: 'A 30 días',
        responsible_person: 'Juan Pérez',
        responsible_area: 'Operaciones',
        contractor_id: contractorId,
        execution_percentage: 45,
      },
      {
        title: 'Subcontrato Mantención Preventiva Equipos Críticos',
        contract_number: 'CNT-2024-002',
        contract_type: 'Subcontrato',
        status: 'Por Vencer',
        description: 'Mantención preventiva y correctiva de equipos críticos',
        start_date: '2024-02-01',
        end_date: '2024-12-31',
        contract_value: 8500000,
        currency: 'CLP',
        payment_terms: 'A 15 días',
        responsible_person: 'Carlos López',
        responsible_area: 'Mantenimiento',
        contractor_id: contractorId,
        execution_percentage: 68,
      },
      {
        title: 'Contrato Arrendamiento de Equipos Pesados',
        contract_number: 'CNT-2024-003',
        contract_type: 'Principal',
        status: 'Vigente',
        description: 'Arrendamiento de excavadoras, cargadores y volquetas',
        start_date: '2024-03-01',
        end_date: '2025-02-28',
        contract_value: 15000000,
        currency: 'CLP',
        payment_terms: 'Mensual vencido',
        responsible_person: 'María González',
        responsible_area: 'Operaciones',
        contractor_id: contractorId,
        execution_percentage: 30,
      },
      {
        title: 'Enmienda al Contrato CNT-2024-001',
        contract_number: 'CNT-2024-001-A1',
        contract_type: 'Enmienda',
        status: 'En Revisión',
        description: 'Aumento de alcance y valor en servicios adicionales',
        start_date: '2024-06-15',
        end_date: '2025-01-14',
        contract_value: 5000000,
        currency: 'CLP',
        payment_terms: 'A 30 días',
        responsible_person: 'Juan Pérez',
        responsible_area: 'Legal',
        contractor_id: contractorId,
        execution_percentage: 0,
      },
      {
        title: 'Contrato Servicios de Seguridad Operacional',
        contract_number: 'CNT-2024-004',
        contract_type: 'Principal',
        status: 'Vencido',
        description: 'Servicios de seguridad industrial y salud ocupacional',
        start_date: '2023-04-01',
        end_date: '2024-03-31',
        contract_value: 3500000,
        currency: 'CLP',
        payment_terms: 'Mensual anticipado',
        responsible_person: 'Patricia Ruiz',
        responsible_area: 'HSE',
        contractor_id: contractorId,
        execution_percentage: 100,
      },
      {
        title: 'Contrato Suministro de Repuestos Críticos',
        contract_number: 'CNT-2024-005',
        contract_type: 'Principal',
        status: 'Vigente',
        description: 'Suministro y almacenamiento de repuestos y componentes críticos',
        start_date: '2024-05-01',
        end_date: '2025-04-30',
        contract_value: 12000000,
        currency: 'CLP',
        payment_terms: 'A 45 días',
        responsible_person: 'Roberto Silva',
        responsible_area: 'Compras',
        contractor_id: contractorId,
        execution_percentage: 25,
      },
    ];

    // Check if contracts already exist
    const { data: existingContracts } = await supabase
      .from('contracts')
      .select('contract_number')
      .in('contract_number', mockContracts.map(c => c.contract_number));

    if (existingContracts && existingContracts.length > 0) {
      // Delete existing contracts to avoid duplicates
      const existingNumbers = existingContracts.map(c => c.contract_number);
      await supabase
        .from('contracts')
        .delete()
        .in('contract_number', existingNumbers);
      console.log('[v0] Deleted existing contracts');
    }

    // Insert contracts
    const { data: insertedContracts, error: insertError } = await supabase
      .from('contracts')
      .insert(mockContracts)
      .select();

    if (insertError) {
      console.error('[v0] Error inserting contracts:', insertError);
      throw insertError;
    }

    console.log('[v0] Successfully seeded contracts:', insertedContracts?.length);

    return NextResponse.json({
      success: true,
      message: `Seeded ${insertedContracts?.length || 0} contracts`,
      contracts: insertedContracts,
    });
  } catch (error) {
    console.error('[v0] Seeding error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
