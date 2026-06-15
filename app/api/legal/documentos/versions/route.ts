import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!documentId) {
    return NextResponse.json({ error: 'documentId required' }, { status: 400 });
  }

  // Get document versions for audit trail
  const { data, error } = await supabase
    .from('document_versions')
    .select(`
      id,
      version_number,
      action,
      observations,
      changed_by,
      created_at,
      changes
    `)
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ versions: data || [] });
}

export async function POST(request: NextRequest) {
  const { documentId, action, observations, changes } = await request.json();

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get next version number
  const { data: lastVersion } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion = (lastVersion?.[0]?.version_number || 0) + 1;

  // Insert audit trail entry
  const { data, error } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version_number: nextVersion,
      action,
      observations,
      changes,
      changed_by: user.id,
    })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ version: data?.[0] }, { status: 201 });
}
