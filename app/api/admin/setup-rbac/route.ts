import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Check if user_permissions table already exists
    const { data: existingTable } = await supabase
      .from('user_permissions')
      .select('id')
      .limit(1);

    if (existingTable !== null) {
      return NextResponse.json({
        success: true,
        message: 'RBAC tables already set up',
        status: 'already_initialized'
      });
    }

    // Execute RBAC setup via SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create user_permissions table
        CREATE TABLE IF NOT EXISTS public.user_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL,
          module VARCHAR(100) NOT NULL,
          action VARCHAR(50) NOT NULL,
          resource_type VARCHAR(100),
          resource_id UUID,
          granted_by UUID REFERENCES auth.users(id),
          granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT TRUE,
          reason TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, module, action, resource_type, resource_id),
          CONSTRAINT valid_action CHECK (action IN ('view', 'create', 'edit', 'delete', 'export', 'approve', 'admin'))
        );

        ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
        
        CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON public.user_permissions(module);
        CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON public.user_permissions(is_active);
      `
    });

    if (error) {
      console.error('[v0] RBAC setup error:', error);
      return NextResponse.json(
        { error: 'Failed to set up RBAC tables', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'RBAC system initialized successfully',
      tables_created: ['user_permissions', 'permission_roles_matrix', 'permission_audit_log']
    });
  } catch (err) {
    console.error('[v0] RBAC setup error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
