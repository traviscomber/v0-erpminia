import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authentication token' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const module = searchParams.get('module');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Validate module parameter
    if (!module) {
      return NextResponse.json(
        { error: 'El parámetro "module" es requerido' },
        { status: 400 }
      );
    }

    // Verify user has access to this module
    const { data: moduleAccess, error: accessError } = await supabase
      .from('user_module_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('module_id', module)
      .eq('status', 'active')
      .maybeSingle();

    if (accessError || !moduleAccess) {
      console.error('[v0] Module access denied:', {
        userId: user.id,
        module,
        error: accessError,
      });
      return NextResponse.json(
        {
          error: `No tienes acceso al módulo "${module}"`,
        },
        { status: 403 }
      );
    }

    // Build query - RLS will automatically filter based on user's role
    let query = supabase
      .from('module_documents')
      .select('*')
      .eq('module', module)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('document_name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[v0] Query error:', error);
      return NextResponse.json(
        { error: `Error al obtener documentos: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documents: data || [],
      count: data?.length || 0,
      userRole: moduleAccess.role,
    });
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
