import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Public health check endpoint
 * Returns minimal info - no internal signals exposed
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Return minimal healthy response if no Supabase config
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ status: 'ok' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Simple connectivity check - no data exposed
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      // Don't expose error details publicly
      return NextResponse.json({ status: 'degraded' }, { status: 503 });
    }

    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
