import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Document Management - Versioning, Approvals, Traceability
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get('type');

    let query = supabase
      .from('document_audit_log')
      .select('*, document_approvals(*)')
      .order('timestamp', { ascending: false });

    if (docType) {
      query = query.eq('document_type', docType);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('[v0] Error fetching documents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      documents: documents || [],
      total_count: documents?.length || 0,
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/documentos-gestion error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('document_audit_log')
      .insert([body])
      .select();

    if (error) {
      console.error('[v0] Error creating document record:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ document: data?.[0] }, { status: 201 });
  } catch (err) {
    console.error('[v0] POST /api/dashboard/documentos-gestion error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
