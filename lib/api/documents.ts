import { getSupabaseServerClient } from '@/lib/supabase-server';

interface DocumentListFilters {
  status?: string | null;
  category?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

type ProfileRecord = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type DocumentApprovalRow = {
  id: string;
  document_id: string;
  approval_level: number | null;
  approval_level_name?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  comments?: string | null;
  rejection_reason?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
};

type DocumentRow = {
  id: string;
  title: string;
  description?: string | null;
  document_number?: string | null;
  document_type?: string | null;
  category?: string | null;
  status?: string | null;
  current_file_path?: string | null;
  current_file_url?: string | null;
  file_size_mb?: number | null;
  created_at?: string | null;
  created_by?: string | null;
  expiry_date?: string | null;
  documento_nombre?: string | null;
};

type MappedApprovalStep = {
  id: string;
  level: number | null;
  levelName: string;
  status?: string | null;
  assignedToName?: string;
  approvedByName?: string;
  comments?: string;
  rejectionReason?: string;
  approvedAt?: string | null;
};

type MappedDocument = {
  id: string;
  title: string;
  description: string;
  documentNumber: string;
  documentType?: string | null;
  category?: string | null;
  status?: string | null;
  fileUrl?: string;
  fileSize?: number;
  createdAt?: string | null;
  createdByUser?: {
    name: string;
    email: string;
  };
  expiryDate?: string | null;
  daysUntilExpiry?: number;
  steps: MappedApprovalStep[];
};

function getDaysUntilExpiry(expiryDate?: string | null) {
  if (!expiryDate) return undefined;

  const diffMs = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function buildProfileName(profile?: ProfileRecord | null) {
  if (!profile) return undefined;

  return (
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    profile.email ||
    undefined
  );
}

function getDocumentFileUrl(filePath?: string | null) {
  if (!filePath) return undefined;
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const supabase = getSupabaseServerClient();
  const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
  return data.publicUrl || undefined;
}

async function loadProfiles(userIds: Array<string | null | undefined>) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean))) as string[];
  const profileMap = new Map<string, ProfileRecord>();

  if (uniqueIds.length === 0) {
    return profileMap;
  }

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, first_name, last_name')
    .in('id', uniqueIds);

  for (const profile of (data || []) as ProfileRecord[]) {
    profileMap.set(profile.id, profile);
  }

  return profileMap;
}

function mapApprovalStep(approval: DocumentApprovalRow, profiles: Map<string, ProfileRecord>): MappedApprovalStep {
  const assignedProfile = profiles.get(approval.assigned_to);
  const approvedByProfile = profiles.get(approval.approved_by);

  return {
    id: approval.id,
    level: approval.approval_level,
    levelName: approval.approval_level_name || `Nivel ${approval.approval_level}`,
    status: approval.status,
    assignedToName:
      approval.assigned_to_name || buildProfileName(assignedProfile) || undefined,
    approvedByName:
      approval.approved_by_name || buildProfileName(approvedByProfile) || undefined,
    comments: approval.comments || undefined,
    rejectionReason: approval.rejection_reason || undefined,
    approvedAt: approval.approved_at || undefined,
  };
}

function mapDocument(
  document: DocumentRow,
  profiles: Map<string, ProfileRecord>,
  approvals: DocumentApprovalRow[] = []
): MappedDocument {
  const creatorProfile = profiles.get(document.created_by);

  return {
    id: document.id,
    title: document.title,
    description: document.description || '',
    documentNumber: document.document_number || '',
    documentType: document.document_type,
    category: document.category,
    status: document.status,
    fileUrl: getDocumentFileUrl(document.current_file_path || document.current_file_url),
    fileSize: document.file_size_mb
      ? Number(document.file_size_mb) * 1024 * 1024
      : undefined,
    createdAt: document.created_at,
    createdByUser: creatorProfile
      ? {
          name: buildProfileName(creatorProfile) || 'Desconocido',
          email: creatorProfile.email || '',
        }
      : undefined,
    expiryDate: document.expiry_date || undefined,
    daysUntilExpiry: getDaysUntilExpiry(document.expiry_date),
    steps: approvals.map((approval) => mapApprovalStep(approval, profiles)),
  };
}

export async function listDocumentsForOrganization(
  organizationId: string,
  filters: DocumentListFilters = {}
) {
  const supabase = getSupabaseServerClient();
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  let query = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (filters.status === 'pending') {
    query = query.in('status', ['draft', 'submitted', 'under_review']);
  } else if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,document_number.ilike.%${filters.search}%,search_text.ilike.%${filters.search}%`
    );
  }

  const { data: documents, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const typedDocuments = (documents || []) as DocumentRow[];
  const documentIds = typedDocuments.map((document) => document.id);
  const { data: approvals } = documentIds.length
    ? await supabase
        .from('document_approvals')
        .select('*')
        .in('document_id', documentIds)
        .order('approval_level', { ascending: true })
    : { data: [] as DocumentApprovalRow[] };

  const typedApprovals = (approvals || []) as DocumentApprovalRow[];
  const approvalsByDocument = new Map<string, DocumentApprovalRow[]>();
  for (const approval of typedApprovals) {
    const current = approvalsByDocument.get(approval.document_id) || [];
    current.push(approval);
    approvalsByDocument.set(approval.document_id, current);
  }

  const profiles = await loadProfiles([
    ...typedDocuments.map((document) => document.created_by),
    ...typedApprovals.flatMap((approval) => [approval.assigned_to, approval.approved_by]),
  ]);

  return {
    documents: typedDocuments.map((document) =>
      mapDocument(document, profiles, approvalsByDocument.get(document.id) || [])
    ),
    total: count || 0,
  };
}

export async function listPendingApprovalsForUser(
  organizationId: string,
  userId: string
) {
  const supabase = getSupabaseServerClient();
  const { data: pendingApprovals, error } = await supabase
    .from('document_approvals')
    .select('*')
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const documentIds = Array.from(
    new Set((pendingApprovals || []).map((approval) => approval.document_id))
  );

  const { data: documents } = documentIds.length
    ? await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .in('id', documentIds)
    : { data: [] as DocumentRow[] };

  const { data: allApprovals } = documentIds.length
    ? await supabase
        .from('document_approvals')
        .select('*')
        .in('document_id', documentIds)
        .order('approval_level', { ascending: true })
    : { data: [] as DocumentApprovalRow[] };

  const typedDocuments = (documents || []) as DocumentRow[];
  const typedApprovals = (allApprovals || []) as DocumentApprovalRow[];
  const documentMap = new Map(typedDocuments.map((document) => [document.id, document]));
  const approvalsByDocument = new Map<string, DocumentApprovalRow[]>();

  for (const approval of typedApprovals) {
    const current = approvalsByDocument.get(approval.document_id) || [];
    current.push(approval);
    approvalsByDocument.set(approval.document_id, current);
  }

  const profiles = await loadProfiles([
    ...typedDocuments.map((document) => document.created_by),
    ...typedApprovals.flatMap((approval) => [approval.assigned_to, approval.approved_by]),
  ]);

  return (pendingApprovals || [])
    .map((approval) => {
      const document = documentMap.get(approval.document_id);
      if (!document) return null;

      const mappedDocument = mapDocument(
        document,
        profiles,
        approvalsByDocument.get(document.id) || []
      );

      return {
        id: approval.id,
        documentId: document.id,
        approvalLevel: approval.approval_level,
        levelName: approval.approval_level_name || `Nivel ${approval.approval_level}`,
        document: mappedDocument,
        steps: mappedDocument.steps,
      };
    })
    .filter(Boolean);
}

export async function getLegalComplianceOverview(organizationId: string) {
  const supabase = getSupabaseServerClient();
  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('organization_id', organizationId)
    .in('category', ['compliance', 'regulatory']);

  if (error) {
    throw error;
  }

  const profiles = await loadProfiles((documents || []).map((document) => document.created_by));
  const mappedDocuments = (documents || []).map((document) =>
    mapDocument(document, profiles, [])
  );

  const summary = {
    total: mappedDocuments.length,
    approved: mappedDocuments.filter((document) => document.status === 'approved').length,
    pending: mappedDocuments.filter((document) =>
      ['draft', 'submitted', 'under_review'].includes(document.status)
    ).length,
    expired: mappedDocuments.filter((document) => document.status === 'expired').length,
    expiringSoon: mappedDocuments.filter((document) => {
      const daysUntilExpiry = document.daysUntilExpiry;
      return typeof daysUntilExpiry === 'number' && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
    }).length,
  };

  const byType = Object.values(
    mappedDocuments.reduce<Record<string, { type: string; total: number }>>((acc, document) => {
      const key = document.documentType || 'otros';
      acc[key] = acc[key] || { type: key, total: 0 };
      acc[key].total += 1;
      return acc;
    }, {})
  );

  return {
    summary,
    byType,
    expiringDocuments: mappedDocuments
      .filter((document) => typeof document.daysUntilExpiry === 'number')
      .sort(
        (left, right) =>
          (left.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER) -
          (right.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER)
      )
      .slice(0, 10),
  };
}
