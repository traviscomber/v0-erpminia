export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const orgId = auth.organizationId;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const search = searchParams.get('search') || '';

  const validPageSize = Math.min(Math.max(pageSize, 10), 500);
  const validPage = Math.max(page, 0);
  const offset = validPage * validPageSize;

  let query = supabase
    .from('suppliers')
    .select('id, name, rut, email, phone, address, contact_person, organization_id, created_at', { count: 'exact' });
  if (orgId) query = query.eq('organization_id', orgId);

  if (search) {
    query = query.or(`name.ilike.%${search}%,rut.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%`);
  }

  const { data, error, count } = await query.order('name').range(offset, offset + validPageSize - 1);


  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    suppliers: data || [],
    pagination: {
      page: validPage,
      pageSize: validPageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / validPageSize),
    },
  });
}
