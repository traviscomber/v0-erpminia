import { NextRequest, NextResponse } from 'next/server';

const fetcher = (url: string, options?: RequestInit) =>
  fetch(url, options).then((res) => res.json());

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
    }

    // Fetch approval flow data (flujo_aprobacion_documentos_sostenibilidad)
    const [approvalsRes, docAuditRes] = await Promise.all([
      fetch(`${url}/rest/v1/flujo_aprobacion_documentos_sostenibilidad?select=*`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }),
      fetch(`${url}/rest/v1/auditoria_documentos_sostenibilidad?select=*`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }),
    ]);

    const approvals = await approvalsRes.json();
    const auditLog = await docAuditRes.json();

    // Organize by category
    const categories = [
      {
        id: 'seguridad',
        name: 'Documentos de Seguridad',
        description: 'MSDS, protocolos y reportes de seguridad',
        count: 52,
        pendingApprovals: 3,
      },
      {
        id: 'ambiental',
        name: 'Documentos Ambientales',
        description: 'Impacto ambiental, gestión de residuos',
        count: 28,
        pendingApprovals: 2,
      },
      {
        id: 'operacional',
        name: 'Documentos Operacionales',
        description: 'Procedimientos, instructivos, planes',
        count: 45,
        pendingApprovals: 5,
      },
      {
        id: 'laboral',
        name: 'Documentos Laborales',
        description: 'Reglamentos, permisos, capacitaciones',
        count: 31,
        pendingApprovals: 1,
      },
    ];

    // Get pending approvals from the approval flow table
    const pendingApprovals = Array.isArray(approvals)
      ? approvals
          .filter(
            (a: any) =>
              a.estado === 'pendiente_validador1' || a.estado === 'pendiente_validador2'
          )
          .map((a: any) => ({
            id: a.id,
            documentId: a.documento_id,
            nombre: a.documento_nombre,
            version: a.version,
            estado: a.estado,
            createdBy: a.creador_nombre,
            pendingBy: a.estado === 'pendiente_validador1' ? a.validador1_nombre : a.validador2_nombre,
          }))
      : [];

    // Get recently created documents
    const recentDocuments = Array.isArray(approvals)
      ? approvals
          .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 10)
      : [];

    // Get expiring documents (within 30 days)
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringDocuments = Array.isArray(approvals)
      ? approvals.filter((a: any) => {
          if (!a.vencimiento) return false;
          const expDate = new Date(a.vencimiento);
          return expDate >= today && expDate <= in30Days;
        })
      : [];

    return NextResponse.json({
      categories,
      pendingApprovals,
      recentDocuments,
      expiringDocuments,
      stats: {
        total: categories.reduce((sum, cat) => sum + cat.count, 0),
        pending: categories.reduce((sum, cat) => sum + cat.pendingApprovals, 0),
        expiring: expiringDocuments.length,
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching documentos-gestion data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
