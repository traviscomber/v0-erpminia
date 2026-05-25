import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[v0] Health check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing Supabase config',
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey,
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test query with simple SELECT
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'juan@n3uralia.com')
      .limit(1);

    return NextResponse.json({
      ok: true,
      supabaseConnected: !error,
      userExists: !!data,
      error: error?.message,
    });
  } catch (error) {
    console.error('[v0] Health check error:', error);
    return NextResponse.json({
      error: String(error),
      ok: false,
    }, { status: 500 });
  }
}
