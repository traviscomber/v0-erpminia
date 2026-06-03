// Document Full-Text Search Service
import { createClient } from '@supabase/supabase-js';

export interface DocumentSearchResult {
  id: string;
  title: string;
  description?: string;
  category: string;
  document_type: string;
  status: string;
  created_at: string;
  created_by_name?: string;
  relevance_score?: number;
}

export class DocumentSearchService {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Search documents using full-text search
   */
  async searchDocuments(
    query: string,
    organizationId: string,
    filters?: {
      category?: string;
      status?: string;
      documentType?: string;
    }
  ): Promise<DocumentSearchResult[]> {
    try {
      let queryBuilder = this.supabase
        .from('documents')
        .select('id, title, description, category, document_type, status, created_at')
        .eq('organization_id', organizationId);

      // Apply text search
      if (query) {
        queryBuilder = queryBuilder.or(
          `title.ilike.%${query}%,description.ilike.%${query}%`
        );
      }

      // Apply filters
      if (filters?.category) {
        queryBuilder = queryBuilder.eq('category', filters.category);
      }
      if (filters?.status) {
        queryBuilder = queryBuilder.eq('status', filters.status);
      }
      if (filters?.documentType) {
        queryBuilder = queryBuilder.eq('document_type', filters.documentType);
      }

      const { data, error } = await queryBuilder.limit(20);

      if (error) {
        console.error('[v0] Search error:', error);
        return [];
      }

      return (data || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        document_type: doc.document_type,
        status: doc.status,
        created_at: doc.created_at,
      }));
    } catch (err) {
      console.error('[v0] Search service error:', err);
      return [];
    }
  }

  /**
   * Search by category
   */
  async searchByCategory(
    category: string,
    organizationId: string
  ): Promise<DocumentSearchResult[]> {
    return this.searchDocuments('', organizationId, { category });
  }

  /**
   * Search by status
   */
  async searchByStatus(
    status: string,
    organizationId: string
  ): Promise<DocumentSearchResult[]> {
    return this.searchDocuments('', organizationId, { status });
  }

  /**
   * Get recent documents
   */
  async getRecentDocuments(
    organizationId: string,
    limit: number = 10
  ): Promise<DocumentSearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('id, title, description, category, document_type, status, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[v0] Error fetching recent documents:', error);
        return [];
      }

      return (data || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        document_type: doc.document_type,
        status: doc.status,
        created_at: doc.created_at,
      }));
    } catch (err) {
      console.error('[v0] Error:', err);
      return [];
    }
  }
}
