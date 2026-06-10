import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Get all documents from Prevention module
    const { data: documents, error } = await supabase
      .from('module_documents')
      .select('document_name, status, document_type, l1_status, l2_status, uploaded_at, created_at')
      .eq('module', 'Prevención')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Expected documents from user's list
    const expectedDocuments = [
      'Evaluación procedimiento trabajos con soldadura y oxicorte DPRMA-CMLP-E-TSYO-...',
      'Evaluación reglamento fortificación DPRMA-CMLP-E-RIFMIN-005.pdf',
      'Evaluación procedimiento trabajo en altura DPRMA-CMLP-E-TEA-013 (1).pdf',
      'Evaluación procedimiento operación DTM DPRMA-CMLP-E-DTM-011.pdf',
      'Evaluación procedimiento transporte, almacenamiento y manejo de explosivos DPRM...',
      'Asistencia a capacitación manual de comunicación radial.doc',
      'Evaluación reglamento acuñadura DPRMA-CMLP-E-RIACU-004.pdf',
      'Registro capacitación procedimiento emergencia en caso de accidente.doc',
      'Evaluación procedimiento perforación máquina Iviana DPRMA-CMLP-E-PPML-17.pdf',
      'Evaluación reglamento interno de explosivos DPRMA-CMLP-E-RITAME-006.pdf',
      'Evaluación procedimiento operación camión Tolva DPRMA-CMLP-E-OPCAT-028.pdf',
      'Registro capacitación procedimiento trabajo en altura 27-07-17.doc',
      'Evaluación procedimiento operación cargador frontal DPRMA-CMLP-E-OCF-012.pdf',
      'Registro capacitación procedimiento emergencia mina Don Jaime.doc',
      'Evaluación procedimiento operación y limpieza máquinas de muestreo DPRMA-CMLP...',
      'Registro capacitación DTM.doc',
      'Procedimiento con máquina Iviana 06-10-2020.doc',
      'Evaluación procedimiento cambio y reposición de EPP DPRMA-CMLP-E-PCREPP-022-...',
      'Evaluación procedimiento perforación máquina Iviana DPRMA-CMLP-E-PPML-17 (1)...',
      'Evaluación procedimiento de emergencia en caso de accidente o enfermedad grave ...',
      'Registro capacitación trabajos en ambientes confinados.doc',
      'Registro capacitación Procedimiento de Emergencia en Caso de Incendio en Mina.doc',
      'Evaluación reglamento tránsito interior mina DPRMA-CMLP-E-RITMIN-007.pdf',
      'Registro capacitación Procedimiento con máquina Iviana.doc',
      'Seguimiento y control Instructivos de SGSSO.xls',
    ];

    // Group uploaded documents by name pattern
    const uploadedNames = documents?.map(d => d.document_name) || [];
    
    const summary = {
      total_uploaded: uploadedNames.length,
      total_expected: expectedDocuments.length,
      uploaded_documents: uploadedNames,
      documents: documents,
      status_breakdown: {
        draft: documents?.filter(d => d.status === 'draft').length || 0,
        pending_l1: documents?.filter(d => d.l1_status === 'pending').length || 0,
        pending_l2: documents?.filter(d => d.l2_status === 'pending').length || 0,
        approved: documents?.filter(d => d.status === 'approved').length || 0,
      }
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[v0] Check uploads error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
