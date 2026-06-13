import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build search query
    let dbQuery = supabase
      .from('documents')
      .select('id, title, description, category, status, created_at, created_by, effective_date, expiry_date')
      .order('created_at', { ascending: false });

    // Filter by search query (full-text search on title and description)
    if (query) {
      // PostgreSQL full-text search using OR condition
      dbQuery = dbQuery.or(
        `title.ilike.%${query}%,description.ilike.%${query}%,document_number.ilike.%${query}%`
      );
    }

    // Filter by category
    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category);
    }

    // Filter by status
    if (status && status !== 'all') {
      dbQuery = dbQuery.eq('status', status);
    }

    // Filter by date range
    if (dateFrom) {
      dbQuery = dbQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      dbQuery = dbQuery.lte('created_at', dateTo);
    }

    // Apply limit
    dbQuery = dbQuery.limit(limit);

    const { data: documents, error } = await dbQuery;

    if (error) {
      console.error('[v0] Search error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: documents || [],
      count: documents.length || 0,
      query: {
        q: query,
        category,
        status,
        dateFrom,
        dateTo,
        limit,
      },
    });
  } catch (error) {
    console.error('[v0] Search endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
