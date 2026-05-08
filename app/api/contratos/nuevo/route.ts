import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { 
      contractor_name, 
      contract_name, 
      monto_total, 
      monto_neto,
      fecha_inicio, 
      fecha_fin, 
      proyecto, 
      propiedad, 
      estado 
    } = body;

    const monto = monto_neto || monto_total || 0;

    // Crear o obtener contratista
    let { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id')
      .eq('name', contractor_name)
      .single();

    if (contractorError && contractorError.code !== 'PGRST116') {
      throw contractorError;
    }

    // Si no existe, crear nuevo contratista
    if (!contractor) {
      const { data: newContractor, error: createError } = await supabase
        .from('contractors')
        .insert([
          {
            name: contractor_name,
            contact_email: '',
            contact_phone: '',
            business_type: 'principal',
            registration_status: 'activo',
          },
        ])
        .select()
        .single();

      if (createError) throw createError;
      contractor = newContractor;
    }

    // Crear contrato en tabla contracts (mejor que hitos para contratos maestros)
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert([
        {
          contractor_id: contractor.id,
          contract_number: `CONT-${Date.now()}`,
          title: contract_name,
          contract_value: monto,
          start_date: fecha_inicio,
          end_date: fecha_fin,
          status: 'active',
          contract_type: proyecto || 'principal',
          description: `Proyecto: ${proyecto}. Propiedad: ${propiedad}.`,
          currency: 'CLP',
          payment_terms: 'A convenir',
        },
      ])
      .select();

    if (contractError) throw contractError;

    return NextResponse.json(
      {
        success: true,
        data: contract[0],
        message: `Contrato "${contract_name}" creado exitosamente con ${contractor_name}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error creating contract:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
