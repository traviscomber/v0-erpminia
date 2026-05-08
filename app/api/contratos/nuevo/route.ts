import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { contractor_name, contract_name, monto_neto, fecha_inicio, fecha_fin, proyecto, propiedad, estado, descripcion } = body;

    // Crear o obtener contratista
    let { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id')
      .eq('nombre', contractor_name)
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
            nombre: contractor_name,
            email: '',
            telefono: '',
            tipo: 'principal',
          },
        ])
        .select()
        .single();

      if (createError) throw createError;
      contractor = newContractor;
    }

    // Crear contrato (almacenamiento en contratos_hitos como registro maestro)
    const { data: hito, error: hitoError } = await supabase
      .from('contratos_hitos')
      .insert([
        {
          contractor_id: contractor.id,
          hito_number: 1,
          hito_name: contract_name,
          monto_neto: monto_neto,
          fecha_programada: fecha_inicio,
          estado: 'pendiente',
          descripcion: descripcion || `Contrato: ${contract_name}. Proyecto: ${proyecto}. Propiedad: ${propiedad}. Fecha fin: ${fecha_fin}`,
        },
      ])
      .select();

    if (hitoError) throw hitoError;

    // Crear alerta automática
    await supabase.from('contratos_alertas').insert([
      {
        tipo: 'vencimiento',
        contractor_id: contractor.id,
        hito_id: hito[0].id,
        titulo: `Nuevo contrato creado: ${contract_name}`,
        descripcion: `Contrato iniciado con ${contractor_name}`,
        severidad: 'media',
        fecha_alerta: new Date().toISOString().split('T')[0],
        fecha_vencimiento: fecha_fin,
        estado: 'activa',
      },
    ]);

    return NextResponse.json(
      {
        success: true,
        data: hito[0],
        message: `Contrato creado exitosamente`,
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
