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

type DocumentFlowRow = {
  id: string | number;
  category?: string | null;
  documentType?: string | null;
  title?: string | null;
  description?: string | null;
  documentNumber?: string | null;
  status?: string | null;
  createdAt?: string | null;
  createdByUser?: { name?: string | null } | null;
  steps?: Array<{
    id?: string | number | null;
    status?: string | null;
    assignedToName?: string | null;
    levelName?: string | null;
  }>;
  daysUntilExpiry?: number | null;
};

type DashboardCategorySummary = {
  id: string;
  name: string;
  description: string;
  count: number;
  pendingApprovals: number;
};

type PendingApprovalSummary = {
  id: string;
  documentId: string | number;
  nombre?: string | null;
  version: string | number;
  estado: string;
  createdBy: string;
  pendingBy: string;
  pendingRole: string;
};

type RecentDocumentSummary = {
  documentId: string | number;
  nombre?: string | null;
  version: string | number;
  estado?: string | null;
  creador: string;
  fechaCreacion?: string | null;
  validador1?: string | null;
};

function matchesCategory(document: DocumentFlowRow, keywords: string[]) {
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

    const documents = (Array.isArray(result.documents) ? result.documents : []) as DocumentFlowRow[];

    const categories = CATEGORY_DEFINITIONS.map<DashboardCategorySummary>((definition) => {
      const matchedDocuments = documents.filter((document) => matchesCategory(document, definition.keywords));
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        count: matchedDocuments.length,
        pendingApprovals: matchedDocuments.filter((document) =>
          ['draft', 'submitted', 'under_review'].includes(String(document.status || '').toLowerCase())
        ).length,
      };
    });

    const pendingApprovals = documents.flatMap<PendingApprovalSummary>((document) => {
      const steps = Array.isArray(document.steps) ? document.steps : [];
      return steps
        .filter((step) => String(step.status || '').toLowerCase() === 'pending')
        .map((step) => ({
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
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
      .map<RecentDocumentSummary>((document) => ({
        documentId: document.documentNumber || document.id,
        nombre: document.title,
        version: document.documentNumber || 'v1',
        estado: document.status,
        creador: document.createdByUser?.name || 'Desconocido',
        fechaCreacion: document.createdAt,
        validador1: document.steps?.[0]?.assignedToName || null,
      }));

    const expiringDocuments = documents
      .filter((document) => typeof document.daysUntilExpiry === 'number' && document.daysUntilExpiry <= 7)
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
