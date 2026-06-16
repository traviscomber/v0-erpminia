export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { otId, fileName, fileType } = await request.json();

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

  // Store evidence metadata
  const filePath = `mantenimiento/${otId}/${Date.now()}_${fileName}`;
  const { data, error } = await supabase
    .from('mantenimiento_evidencia')
    .insert({
      ot_id: otId,
      file_name: fileName,
      file_path: filePath,
      file_type: fileType,
      uploaded_by: user.id,
    })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get signed URL for upload
  const { data: signedUrl } = await supabase.storage
    .from('mantenimiento-evidencia')
    .createSignedUploadUrl(filePath);

  return NextResponse.json({
    evidence: data?.[0],
    signed_url: signedUrl?.signedUrl,
  }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const otId = searchParams.get('otId');

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

  if (!otId) {
    return NextResponse.json({ error: 'otId required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mantenimiento_evidencia')
    .select('*')
    .eq('ot_id', otId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get signed URLs for all files
  const evidence = await Promise.all(
    (data || []).map(async (file) => {
      const { data: signedUrl } = await supabase.storage
        .from('mantenimiento-evidencia')
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      return {
        ...file,
        signed_url: signedUrl?.signedUrl,
      };
    })
  );

  return NextResponse.json({ evidence });
}
