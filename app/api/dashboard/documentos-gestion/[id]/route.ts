import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;

    // Fetch category details
    const { data: categoryData, error: categoryError } = await supabase
      .from('document_categories')
      .select('id, name, description, count, pending_approvals')
      .eq('id', categoryId)
      .single();

    if (categoryError) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Fetch documents in this category
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, name, code, description, status, version, created_date, expiry_date, file_url')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });

    if (docsError) {
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      category: categoryData,
      documents: documents || [],
    });
  } catch (error) {
    console.error('Error fetching category documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
