export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Get documents expiring in the next 30 days
  const { data: expiringDocs, error: expError } = await supabase
    .from('module_documents')
    .select(`
      id,
      document_name,
      expires_at,
      module,
      document_type,
      status
    `)
    .gte('expires_at', today.toISOString())
    .lte('expires_at', thirtyDaysFromNow.toISOString())
    .order('expires_at', { ascending: true });

  // Get documents already expired
  const { data: expiredDocs, error: expiredError } = await supabase
    .from('module_documents')
    .select(`
      id,
      document_name,
      expires_at,
      module,
      document_type,
      status
    `)
    .lt('expires_at', today.toISOString())
    .order('expires_at', { ascending: false });

  if (expError || expiredError) {
    return NextResponse.json({ error: 'No se pudieron cargar los alertas de vencimiento' }, { status: 500 });
  }

  return NextResponse.json({
    expiring_soon: expiringDocs || [],
    already_expired: expiredDocs || [],
    total_expiring: (expiringDocs?.length || 0) + (expiredDocs?.length || 0),
  });
}
