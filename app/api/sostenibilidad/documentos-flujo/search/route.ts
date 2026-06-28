export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    const supabase = context.supabase;

    let dbQuery = supabase
      .from('documents')
      .select('id, title, description, category, status, created_at, created_by, effective_date, expiry_date')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (query) {
      dbQuery = dbQuery.or(
        `title.ilike.%${query}%,description.ilike.%${query}%,document_number.ilike.%${query}%`
      );
    }

    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category);
    }

    if (status && status !== 'all') {
      dbQuery = dbQuery.eq('status', status);
    }

    if (dateFrom) {
      dbQuery = dbQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      dbQuery = dbQuery.lte('created_at', dateTo);
    }

    dbQuery = dbQuery.limit(limit);

    const { data: documents, error } = await dbQuery;

    if (error) {
      console.error('[v0] Search error:', error);
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        query: { q: query, category, status, dateFrom, dateTo, limit },
      });
    }

    return NextResponse.json({
      success: true,
      data: documents || [],
      count: documents?.length || 0,
      query: { q: query, category, status, dateFrom, dateTo, limit },
    });
  } catch (error) {
    console.error('[v0] Search endpoint error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      query: { q: query, category, status, dateFrom, dateTo, limit },
    });
  }
}
