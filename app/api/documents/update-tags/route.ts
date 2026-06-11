import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const updateDocumentTagsSchema = z.object({
  documentId: z.string().uuid(),
  tags: z.array(z.string()),
  searchKeywords: z.string().optional(),
  module: z.string().default('prevención'),
});

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, tags, searchKeywords, module } = updateDocumentTagsSchema.parse(body);

    const { error } = await supabase
      .from('module_documents')
      .update({
        tags,
        search_keywords: searchKeywords || '',
        last_indexed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('module', module);

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        documentId,
        tags,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Update document tags error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
