import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test the RPC function
  const { data, error } = await supabase.rpc('get_user_login', { 
    p_email: 'juan@n3uralia.com'
  });

  return NextResponse.json({
    success: !error,
    error: error?.message,
    data,
  });
}
