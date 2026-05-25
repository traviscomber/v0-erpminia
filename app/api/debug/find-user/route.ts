import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
  });

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, password_hash')
      .eq('email', email);

    return NextResponse.json({ 
      success: !error,
      error: error?.message,
      count: data?.length,
      profiles: data
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
