import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: Fetch documents for current user's organization with approval status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');

    let query = supabase
      .from('documents')
      .select(
        `
        *,
        document_approvals (
          id,
          approval_level,
          approval_level_name,
          required_role,
          status,
          assigned_to,
          assigned_to_name,
          approved_by,
          approved_by_name,
          comments,
          rejection_reason,
          approved_at
        ),
        created_by_user:users(id, email, full_name),
        submitted_by_user:users(id, email, full_name),
        approved_by_user:users(id, email, full_name)
      `
      )
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (userId) {
      query = query.or(`created_by.eq.${userId},submitted_by.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[v0] Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[v0] Error in GET /api/sostenibilidad/documentos-flujo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new document with initial status='draft'
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      title,
      description,
      category,
      document_type,
      created_by,
      file_url,
      file_size_mb,
      file_mime_type,
    } = body;

    // Validaciones
    if (!organization_id || !title || !category || !created_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Crear documento
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        organization_id,
        title,
        description,
        category,
        document_type: document_type || 'document',
        status: 'draft',
        created_by,
        current_file_url: file_url,
        file_size_mb,
        file_mime_type,
      })
      .select()
      .single();

    if (docError) {
      console.error('[v0] Error creating document:', docError);
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      );
    }

    // Crear approval chain inicial (2 niveles: Jefe + Gerente)
    const approvals = [
      {
        document_id: document.id,
        approval_level: 1,
        approval_level_name: 'Jefe de Sostenibilidad',
        required_role: 'jefe_sostenibilidad',
        status: 'pending',
      },
      {
        document_id: document.id,
        approval_level: 2,
        approval_level_name: 'Gerente General',
        required_role: 'gerente_general',
        status: 'pending',
      },
    ];

    const { error: appError } = await supabase
      .from('document_approvals')
      .insert(approvals);

    if (appError) {
      console.error('[v0] Error creating approvals:', appError);
      return NextResponse.json(
        { error: 'Failed to create approval chain' },
        { status: 500 }
      );
    }

    // Log audit
    await supabase.from('document_audit_logs').insert({
      document_id: document.id,
      action: 'created',
      user_id: created_by,
      details: `Document created: ${title}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Document created successfully',
        data: document,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error in POST /api/sostenibilidad/documentos-flujo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
