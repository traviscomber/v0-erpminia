export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const moduleId = searchParams.get('moduleId');
  const documentType = searchParams.get('documentType');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let sqlQuery = supabase
    .from('module_documents')
    .select(`
      id,
      document_name,
      description,
      document_type,
      status,
      module,
      uploaded_by,
      created_at,
      updated_at,
      expires_at
    `);

  // Full-text search
  if (query) {
    sqlQuery = sqlQuery.ilike('search_text', `%${query}%`);
  }

  // Filters
  if (moduleId) {
    sqlQuery = sqlQuery.eq('module', moduleId);
  }

  if (documentType) {
    sqlQuery = sqlQuery.eq('document_type', documentType);
  }

  if (status) {
    sqlQuery = sqlQuery.eq('status', status);
  }

  // Apply ordering and pagination
  const { data, count, error } = await sqlQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    documents: data || [],
    total: count || 0,
    limit,
    offset,
  });
}
