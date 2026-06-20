export const dynamic = 'force-dynamic';

import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { createContract, listContractsForOrganization } from '@/lib/api/contracts';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function uploadContractFile(organizationId: string, file: File) {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
    throw new Error('Tipo de archivo no permitido. Usa PDF, DOC o DOCX.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('El archivo excede el limite de 50MB.');
  }

  const blobPath = `legal-contracts/${organizationId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const blob = await put(blobPath, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return {
    fileUrl: blob.url,
    filePath: blob.pathname,
    fileName: file.name,
    fileSizeBytes: file.size,
    fileMimeType: file.type,
  };
}

async function parseContractRequest(request: NextRequest, organizationId: string, userId: string) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    const uploadedFile =
      file instanceof File && file.size > 0
        ? await uploadContractFile(organizationId, file)
        : null;

    return {
      organizationId,
      createdBy: userId,
      title: String(formData.get('title') || '').trim(),
      contractNumber:
        String(formData.get('contractNumber') || '').trim() ||
        `CNT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      description: String(formData.get('description') || '').trim() || undefined,
      contractType: String(formData.get('contractType') || 'Principal').trim(),
      status: String(formData.get('status') || 'En Revisión').trim(),
      contractValue: Number(formData.get('contractValue') || 0),
      currency: String(formData.get('currency') || 'CLP').trim(),
      paidAmount: Number(formData.get('paidAmount') || 0),
      startDate: String(formData.get('startDate') || '').trim() || undefined,
      endDate: String(formData.get('endDate') || '').trim() || undefined,
      reviewDueDate: String(formData.get('reviewDueDate') || '').trim() || undefined,
      responsiblePerson: String(formData.get('responsiblePerson') || '').trim() || undefined,
      responsibleArea: String(formData.get('responsibleArea') || '').trim() || undefined,
      contractorName: String(formData.get('contractorName') || '').trim() || undefined,
      propertyName: String(formData.get('propertyName') || '').trim() || undefined,
      projectName: String(formData.get('projectName') || '').trim() || undefined,
      royaltyRate: Number(formData.get('royaltyRate') || 0),
      guaranteeAmount: Number(formData.get('guaranteeAmount') || 0),
      complianceStatus: String(formData.get('complianceStatus') || 'Pendiente').trim(),
      complianceNotes: String(formData.get('complianceNotes') || '').trim() || undefined,
      ...uploadedFile,
    };
  }

  const body = await request.json();
  return {
    organizationId,
    createdBy: userId,
    title: String(body.title || body.contract_name || body.nombreContrato || '').trim(),
    contractNumber:
      String(body.contractNumber || body.contract_number || '').trim() ||
      `CNT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
    description: String(body.description || body.nombreContrato || '').trim() || undefined,
    contractType: String(body.contractType || body.contract_type || 'Principal').trim(),
    status: String(body.status || body.estado || 'En Revisión').trim(),
    contractValue: Number(body.contractValue || body.contract_value || body.monto_total || 0),
    currency: String(body.currency || 'CLP').trim(),
    paidAmount: Number(body.paidAmount || body.paid_amount || 0),
    startDate: String(body.startDate || body.start_date || body.fecha_inicio || '').trim() || undefined,
    endDate: String(body.endDate || body.end_date || body.fecha_fin || '').trim() || undefined,
    reviewDueDate: String(body.reviewDueDate || body.review_due_date || '').trim() || undefined,
    responsiblePerson: String(body.responsiblePerson || body.responsible_person || '').trim() || undefined,
    responsibleArea: String(body.responsibleArea || body.responsible_area || '').trim() || undefined,
    contractorName: String(body.contractorName || body.contractor_name || body.contratista || '').trim() || undefined,
    propertyName: String(body.propertyName || body.property_name || body.propiedad || '').trim() || undefined,
    projectName: String(body.projectName || body.project_name || body.proyecto || '').trim() || undefined,
    royaltyRate: Number(body.royaltyRate || body.royalty_rate || 0),
    guaranteeAmount: Number(body.guaranteeAmount || body.guarantee_amount || 0),
    complianceStatus: String(body.complianceStatus || body.compliance_status || 'Pendiente').trim(),
    complianceNotes: String(body.complianceNotes || body.compliance_notes || '').trim() || undefined,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const search = new URL(request.url).searchParams.get('search');
    const result = await listContractsForOrganization(auth.organizationId, search);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los contratos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId || !auth.user) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const payload = await parseContractRequest(request, auth.organizationId, auth.user.id);

    if (!payload.title) {
      return NextResponse.json(
        { error: 'title es obligatorio' },
        { status: 400 }
      );
    }

    const contract = await createContract(payload);
    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el contrato';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
