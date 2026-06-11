import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const advancedSearchSchema = z.object({
  query: z.string().min(0).max(500),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(['draft', 'en_revision_l1', 'en_revision_l2', 'aprobado', 'rechazado']).optional(),
  category: z.string().optional(),
  module: z.string().default('prevención'),
  expiryFilter: z.enum(['all', 'active', 'expiring_30_days', 'expired']).optional().default('all'),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(10).max(100).default(50),
});

type AdvancedSearchParams = z.infer<typeof advancedSearchSchema>;

// Helper: Calculate days until expiry
function getDaysUntilExpiry(validUntil: string | null): number | null {
  if (!validUntil) return null;
  const today = new Date();
  const expiry = new Date(validUntil);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: Check if document is expiring soon
function isExpiringStatus(validUntil: string | null): 'active' | 'expiring_soon' | 'expired' {
  const days = getDaysUntilExpiry(validUntil);
  if (days === null) return 'active';
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'active';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = advancedSearchSchema.parse(body);

    // Build query
    let query = supabase
      .from('module_documents')
      .select(
        `id, document_name, description, category, status, 
         valid_until, valid_from, tags, file_url, 
         uploaded_by, reviewed_by_l1, reviewed_by_l2,
         created_at, updated_at, version`
      )
      .eq('module', params.module);

    // Full-text search filter
    if (params.query && params.query.trim()) {
      query = query.or(
        `document_name.ilike.%${params.query}%,description.ilike.%${params.query}%,search_keywords.ilike.%${params.query}%`
      );
    }

    // Status filter
    if (params.status) {
      query = query.eq('status', params.status);
    }

    // Category filter
    if (params.category) {
      query = query.eq('category', params.category);
    }

    // Tags filter (AND logic: all selected tags must be present)
    if (params.tags.length > 0) {
      params.tags.forEach((tag) => {
        query = query.contains('tags', `"${tag}"`);
      });
    }

    // Expiry filter
    const now = new Date().toISOString();
    if (params.expiryFilter === 'active') {
      query = query.gt('valid_until', now);
    } else if (params.expiryFilter === 'expiring_30_days') {
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query
        .lte('valid_until', thirtyDaysLater)
        .gt('valid_until', now);
    } else if (params.expiryFilter === 'expired') {
      query = query.lte('valid_until', now);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('module_documents')
      .select('id', { count: 'exact', head: true })
      .eq('module', params.module);

    // Pagination
    const offset = (params.page - 1) * params.pageSize;
    query = query
      .range(offset, offset + params.pageSize - 1)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Enrich with computed fields
    const enrichedData = (data || []).map((doc: any) => ({
      ...doc,
      daysUntilExpiry: getDaysUntilExpiry(doc.valid_until),
      expiryStatus: isExpiringStatus(doc.valid_until),
    }));

    return NextResponse.json(
      {
        data: enrichedData,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / params.pageSize),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Advanced search error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
