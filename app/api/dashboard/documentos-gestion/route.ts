export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { listDocumentsForOrganization } from '@/lib/api/documents';

const CATEGORY_DEFINITIONS = [
  {
    id: 'seguridad',
    name: 'Documentos de Seguridad',
    description: 'Protocolos, procedimientos, reportes y evidencias de seguridad',
    keywords: ['seguridad', 'hse', 'safety', 'prevencion', 'prevención', 'riesgo'],
  },
  {
    id: 'ambiental',
    name: 'Documentos Ambientales',
    description: 'Impacto ambiental, residuos, monitoreo y cumplimiento ambiental',
    keywords: ['ambiental', 'medio ambiente', 'medioambiente', 'residuos', 'impacto'],
  },
  {
    id: 'operacional',
    name: 'Documentos Operacionales',
    description: 'Procedimientos, instructivos, planes y control operativo',
    keywords: ['operacional', 'operaciones', 'operativo', 'procedimiento', 'instructivo', 'plan'],
  },
  {
    id: 'laboral',
    name: 'Documentos Laborales',
    description: 'Reglamentos, permisos, capacitaciones y relaciones laborales',
    keywords: ['laboral', 'rrhh', 'capacitacion', 'capacitación', 'permiso', 'contrato'],
  },
];

function normalizeText(value: unknown) {
  return String(value || '').toLowerCase();
}

function matchesCategory(document: any, keywords: string[]) {
  const haystack = [
    document.category,
    document.documentType,
    document.title,
    document.description,
    document.documentNumber,
  ]
    .map(normalizeText)
    .join(' ');

  return keywords.some((keyword) => haystack.includes(keyword));
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await listDocumentsForOrganization(auth.organizationId, {
      limit: 250,
    });

    const documents = Array.isArray(result.documents) ? result.documents : [];

    const categories = CATEGORY_DEFINITIONS.map((definition) => {
      const matchedDocuments = documents.filter((document) => matchesCategory(document, definition.keywords));
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        count: matchedDocuments.length,
        pendingApprovals: matchedDocuments.filter((document: any) =>
          ['draft', 'submitted', 'under_review'].includes(String(document.status || '').toLowerCase())
        ).length,
      };
    });

    const pendingApprovals = documents.flatMap((document: any) => {
      const steps = Array.isArray(document.steps) ? document.steps : [];
      return steps
        .filter((step: any) => String(step.status || '').toLowerCase() === 'pending')
        .map((step: any) => ({
          id: `${document.id}-${step.id}`,
          documentId: document.id,
          nombre: document.title,
          version: document.documentNumber || 'v1',
          estado: 'pendiente_validador1',
          createdBy: document.createdByUser?.name || 'Desconocido',
          pendingBy: step.assignedToName || step.levelName || 'Revisor',
          pendingRole: step.levelName || 'Revisor',
        }));
    });

    const recentDocuments = [...documents]
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
      .map((document: any) => ({
        documentId: document.documentNumber || document.id,
        nombre: document.title,
        version: document.documentNumber || 'v1',
        estado: document.status,
        creador: document.createdByUser?.name || 'Desconocido',
        fechaCreacion: document.createdAt,
        validador1: document.steps?.[0]?.assignedToName || null,
      }));

    const expiringDocuments = documents
      .filter((document: any) => typeof document.daysUntilExpiry === 'number' && document.daysUntilExpiry <= 7)
      .slice(0, 5);

    return NextResponse.json({
      categories,
      pendingApprovals,
      recentDocuments,
      expiringDocuments,
      stats: {
        total: documents.length,
        pending: pendingApprovals.length,
        expiring: expiringDocuments.length,
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching documentos-gestion data:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los documentos' }, { status: 500 });
  }
}