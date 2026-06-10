import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Execute RLS policy creation SQL
    const { error } = await supabaseAdmin.rpc('execute_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "module_documents_allow_authenticated_select"
        ON public.module_documents
        FOR SELECT
        USING (auth.role() = 'authenticated');

        CREATE POLICY IF NOT EXISTS "module_documents_allow_authenticated_insert"
        ON public.module_documents
        FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY IF NOT EXISTS "module_documents_allow_authenticated_update"
        ON public.module_documents
        FOR UPDATE
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY IF NOT EXISTS "module_documents_allow_authenticated_delete"
        ON public.module_documents
        FOR DELETE
        USING (auth.role() = 'authenticated');
      `,
    });

    if (error) {
      console.error('[v0] RLS policy error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'RLS policies created successfully' },
      { status: 200 }
    );
  } catch (err) {
    console.error('[v0] Setup error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
