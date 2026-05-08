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

    // Map category slugs and IDs to table names
    const categoryTableMap: Record<string, string> = {
      '1': 'contracts',
      'contratos': 'contracts',
      '2': 'hse_inspections',
      'hse-compliance': 'hse_inspections',
      'hse': 'hse_inspections',
      '3': 'compliance_documents',
      'compliance': 'compliance_documents',
      '4': 'operational_documents',
      'operacional': 'operational_documents',
      '5': 'financial_documents',
      'financiero': 'financial_documents',
      '6': 'technical_documents',
      'tecnico': 'technical_documents',
    };

    const tableName = categoryTableMap[categoryId];

    if (!tableName) {
      return NextResponse.json(
        { error: 'Unknown category' },
        { status: 400 }
      );
    }

    // Fetch category details - first try to find by slug name match
    let categoryData;
    let categoryError;
    
    if (isNaN(Number(categoryId))) {
      // It's a slug, convert to find matching category
      const slugToName: Record<string, string> = {
        'contratos': 'Contratos',
        'hse-compliance': 'HSE',
        'compliance': 'Compliance',
        'operacional': 'Operacional',
        'financiero': 'Financiero',
        'tecnico': 'Técnico',
      };
      
      const name = slugToName[categoryId];
      if (name) {
        const result = await supabase
          .from('document_categories')
          .select('id, name, description, count, pending_approvals')
          .ilike('name', `%${name}%`)
          .single();
        categoryData = result.data;
        categoryError = result.error;
      }
    } else {
      // It's an ID
      const result = await supabase
        .from('document_categories')
        .select('id, name, description, count, pending_approvals')
        .eq('id', categoryId)
        .single();
      categoryData = result.data;
      categoryError = result.error;
    }

    if (categoryError) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Fetch documents from the specific category table
    const { data: documents, error: docsError } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error(`Error fetching from ${tableName}:`, docsError);
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
