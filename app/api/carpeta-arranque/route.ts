import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET  /api/carpeta-arranque  — list all carpetas (with doc counts per carpeta)
export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const { data: carpetas, error } = await supabase
    .from('carpetas_arranque')
    .select(`
      id, empresa_nombre, empresa_rut, contacto_email, status,
      revisor_l1_nombre, revisor_l1_status, revisor_l1_fecha,
      revisor_l2_nombre, revisor_l2_status, revisor_l2_fecha,
      submitted_at, created_at, updated_at,
      carpeta_documentos ( id, slot_index, file_name, l1_status, l2_status )
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ carpetas: carpetas ?? [] });
}

// POST /api/carpeta-arranque  — create a new carpeta + pre-seed 19 document slots
export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const { empresa_nombre, empresa_rut, contacto_email } = body;

  if (!empresa_nombre || !contacto_email) {
    return NextResponse.json({ error: 'Nombre de empresa y correo son requeridos' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: carpeta, error: carpetaError } = await supabase
    .from('carpetas_arranque')
    .insert({
      empresa_nombre,
      empresa_rut: empresa_rut || null,
      contacto_email,
      created_by: auth.user.id,
      status: 'pendiente',
    })
    .select()
    .single();

  if (carpetaError) return NextResponse.json({ error: carpetaError.message }, { status: 500 });

  const DOCUMENTOS = [
    'Certificado de afiliacion y cotizacion a Organismo Administrador',
    'Certificado de Accidentabilidad (ultimos 2 anos)',
    'Reglamento interno de orden, higiene y seguridad',
    'Copia IRL de todos sus colaboradores',
    'Contratos de trabajos de su personal',
    'Registro de entrega de EPP',
    'Registro interno de la empresa contratista',
    'Recepcion firmada del Sistema de Gestion y Seguridad en el Trabajo',
    'Examenes pre-ocupacionales (ultimos 3 anos)',
    'Examenes ocupacionales (agentes como ruido, silice)',
    'Documentacion de trabajadores extranjeros',
    'Procedimientos de trabajos actualizados con NRCT',
    'Procedimiento en caso de accidente',
    'Politica de empresa contratista en control de riesgos',
    'Copia carnet de identidad de todos los colaboradores',
    'Licencias de conduccion vigentes',
    'Recepcion de conductores por reglamento interno',
    'Programa de supervision a cargo personal',
    'Matriz de Identificacion de Peligros (MIPER)',
  ];

  const slots = DOCUMENTOS.map((nombre, i) => ({
    carpeta_id: carpeta.id,
    slot_index: i + 1,
    documento_nombre: nombre,
  }));

  const { error: slotsError } = await supabase.from('carpeta_documentos').insert(slots);
  if (slotsError) {
    await supabase.from('carpetas_arranque').delete().eq('id', carpeta.id);
    return NextResponse.json({ error: slotsError.message }, { status: 500 });
  }

  return NextResponse.json({ carpeta }, { status: 201 });
}
