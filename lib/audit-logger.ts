import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface AuditLogEntry {
  document_id: string;
  action: 'created' | 'updated' | 'submitted' | 'approved' | 'rejected' | 'viewed' | 'downloaded' | 'expired' | 'renewed';
  user_id: string;
  user_role?: string;
  previous_state?: string;
  new_state?: string;
  details?: string;
}

/**
 * Log an audit trail entry for document actions
 * Used for compliance, security, and traceability
 */
export async function logDocumentAction(entry: AuditLogEntry) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('document_audit_logs').insert({
      document_id: entry.document_id,
      action: entry.action,
      user_id: entry.user_id,
      details: entry.details || `${entry.action} by ${entry.user_id}${entry.user_role ? ` (${entry.user_role})` : ''}`,
    });

    if (error) {
      console.error('[v0] Error logging audit trail:', error);
    }
  } catch (error) {
    console.error('[v0] Exception in logDocumentAction:', error);
  }
}

/**
 * Get audit trail for a specific document
 */
export async function getDocumentAuditTrail(documentId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('document_audit_logs')
      .select(
        `
        *,
        user:users(id, email, full_name)
      `
      )
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[v0] Error fetching audit trail:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[v0] Exception in getDocumentAuditTrail:', error);
    return [];
  }
}

/**
 * Get audit trail for all documents in an organization
 */
export async function getOrganizationAuditTrail(organizationId: string, limit: number = 100) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('document_audit_logs')
      .select(
        `
        *,
        document:documents(id, title, status),
        user:users(id, email, full_name)
      `
      )
      .eq('documents.organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[v0] Error fetching organization audit trail:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[v0] Exception in getOrganizationAuditTrail:', error);
    return [];
  }
}
