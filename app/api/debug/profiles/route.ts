import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 });
  }

  // Create client with default schema explicitly set
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
      schema: 'public'
    },
    headers: {
      'X-Client-Info': 'supabase-js/debug'
    }
  });

  // Try a simple count query
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({ 
      success: true,
      totalProfiles: count
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      code: err.code
    });
  }
}

