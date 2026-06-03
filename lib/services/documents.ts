import { getSupabaseClient } from '@/lib/db/supabase';
import type { Document, DocumentVersion } from '@/lib/types';

export const documentsService = {
  // Get all documents for a company
  async getDocuments(companyId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get documents by category
  async getDocumentsByCategory(companyId: string, category: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get documents expiring soon
  async getExpiringDocuments(companyId: string, daysWindow: number = 30) {
    const supabase = getSupabaseClient();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysWindow);
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', companyId)
      .not('expiration_date', 'is', null)
      .lte('expiration_date', futureDate.toISOString().split('T')[0])
      .gt('expiration_date', new Date().toISOString().split('T')[0])
      .order('expiration_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Create document
  async createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('documents')
      .insert([document])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update document
  async updateDocument(id: string, updates: Partial<Document>) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get document versions
  async getDocumentVersions(documentId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Create document version
  async createDocumentVersion(version: Omit<DocumentVersion, 'id' | 'created_at'>) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('document_versions')
      .insert([version])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get document approvals
  async getDocumentApprovals(documentId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('document_approvals')
      .select('*, user:users(full_name, email)')
      .eq('document_id', documentId);
    
    if (error) throw error;
    return data;
  },

  // Update approval status
  async updateApprovalStatus(approvalId: string, status: string, comments?: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('document_approvals')
      .update({ status, comments })
      .eq('id', approvalId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete document
  async deleteDocument(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  // Get compliance report
  async getComplianceReport(companyId: string) {
    const supabase = getSupabaseClient();
    const { data: documents, error } = await supabase
      .from('documents')
      .select('compliance_requirement, status, expiration_date')
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    const compliance: Record<string, { total: number; compliant: number; expiring: number }> = {};
    
    documents?.forEach((doc) => {
      const req = doc.compliance_requirement || 'otros';
      if (!compliance[req]) {
        compliance[req] = { total: 0, compliant: 0, expiring: 0 };
      }
      compliance[req].total++;
      
      if (doc.status === 'vigente') {
        compliance[req].compliant++;
      }
      
      if (doc.expiration_date) {
        const expiryDate = new Date(doc.expiration_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          compliance[req].expiring++;
        }
      }
    });
    
    return compliance;
  },
};
