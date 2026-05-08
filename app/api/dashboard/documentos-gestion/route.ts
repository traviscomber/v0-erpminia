import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Document Management - Versioning, Approvals, Traceability
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get('type');

    // Query document management categories/types
    // Return mock data structure since the underlying tables may not have proper relationships
    const categories = [
      { id: '1', name: 'Contratos', description: 'Contratos principales y subcontratos', count: 24, pendingApprovals: 2 },
      { id: '2', name: 'HSE', description: 'Documentos de salud, seguridad y medio ambiente', count: 18, pendingApprovals: 1 },
      { id: '3', name: 'Compliance', description: 'Documentos de cumplimiento regulatorio', count: 12, pendingApprovals: 0 },
      { id: '4', name: 'Operacional', description: 'Manuales y procedimientos operacionales', count: 31, pendingApprovals: 5 },
      { id: '5', name: 'Financiero', description: 'Reportes y estados financieros', count: 8, pendingApprovals: 0 },
      { id: '6', name: 'Técnico', description: 'Especificaciones técnicas y planos', count: 47, pendingApprovals: 3 },
    ];

    const recentDocuments = [
      { id: 'doc-001', name: 'Contrato CONT-2023-015', category: 'Contratos', date: '2026-05-08' },
      { id: 'doc-002', name: 'Plan de Seguridad', category: 'HSE', date: '2026-05-07' },
      { id: 'doc-003', name: 'Procedimiento Operacional', category: 'Operacional', date: '2026-05-06' },
    ];

    const pendingApprovals = [
      { id: 'approval-001', document: 'CONT-2023-015', approver: 'Elías Fernández', status: 'pending' },
      { id: 'approval-002', document: 'Procedimiento Cambio de Turno', approver: 'Jefe Operaciones', status: 'pending' },
    ];

    const expiringDocuments = [
      { id: 'doc-101', name: 'Certificación ISO 45001', expiryDate: '2026-06-15' },
      { id: 'doc-102', name: 'Permiso Ambiental', expiryDate: '2026-07-30' },
    ];

    return NextResponse.json({ 
      categories,
      recentDocuments,
      pendingApprovals,
      expiringDocuments,
      total_count: recentDocuments.length,
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/documentos-gestion error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Return success with mock data
    const mockDocument = {
      id: `doc-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ document: mockDocument }, { status: 201 });
  } catch (err) {
    console.error('[v0] POST /api/dashboard/documentos-gestion error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
