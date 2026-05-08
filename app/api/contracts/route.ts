import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[v0] Error fetching contracts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contracts', details: error.message },
        { status: 500 }
      );
    }

    console.log('[v0] Fetched contracts:', contracts?.length || 0);

    return NextResponse.json({
      contracts: contracts || [],
      count: contracts?.length || 0,
    });
  } catch (error) {
    console.error('[v0] Error in contracts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
