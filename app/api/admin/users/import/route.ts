import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

type XlsxModule = {
  read: (
    buffer: Buffer,
    options: { type: 'buffer' }
  ) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: (sheet: unknown) => Array<Record<string, unknown>>;
  };
};

export async function POST(request: NextRequest) {
  try {
    // Get auth context
    const auth = await resolveAuthContext(request);
    if (!auth?.user?.id || (auth.role !== 'admin' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file as buffer and parse
    const buffer = Buffer.from(await file.arrayBuffer());
    const xlsx = (await import('xlsx')) as unknown as XlsxModule;
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: 'No sheet found in file' }, { status: 400 });
    }

    // Convert sheet to JSON
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]) as Array<Record<string, unknown>>;
    if (!rows.length) {
      return NextResponse.json({ error: 'No data found in sheet' }, { status: 400 });
    }

    // Map columns with flexible naming
    const mappedRows = rows
      .map((row) => {
        // Find columns with flexible naming
        const keys = Object.keys(row);
        const emailKey = keys.find((k) => /email/i.test(k)) || 'EMAIL';
        const nameKey = keys.find((k) => /full.?name|nombre|name/i.test(k)) || 'FULL_NAME';
        const roleKey = keys.find((k) => /role|rol/i.test(k)) || 'ROLE';

        const email = String(row[emailKey] || '').trim().toLowerCase();
        const fullName = String(row[nameKey] || '').trim();
        const role = String(row[roleKey] || '').trim().toLowerCase();

        return { email, full_name: fullName, role };
      })
      .filter((row) => row.email && row.full_name && row.role);

    if (!mappedRows.length) {
      return NextResponse.json({ error: 'No valid rows after mapping columns' }, { status: 400 });
    }

    // Validate roles
    const validRoles = ['superadmin', 'admin', 'manager', 'technician', 'warehouse_staff', 'finance_officer', 'viewer'];
    const invalidRows = mappedRows.filter((row) => !validRoles.includes(row.role));
    if (invalidRows.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid roles found: ${invalidRows.map((r) => r.role).join(', ')}. Valid roles: ${validRoles.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = getSupabaseServerClient();

    // Upsert users via RPC call (update_users_from_import)
    // First, prepare the data in SQL-friendly format
    const { data: result, error: rpcError } = await supabase.rpc('import_users_from_csv', {
      users_data: mappedRows.map((row) => ({
        email: row.email,
        full_name: row.full_name,
        role: row.role,
      })),
    });

    if (rpcError) {
      console.error('[v0] RPC error:', rpcError);
      // Fallback: insert directly if RPC not available
      const { data: existingUsers } = await supabase.from('users').select('email').in(
        'email',
        mappedRows.map((r) => r.email)
      );
      const existingEmails = new Set((existingUsers || []).map((u: any) => u.email));

      const newUsers = mappedRows.filter((row) => !existingEmails.has(row.email));
      if (newUsers.length > 0) {
        const { error: insertError } = await supabase.from('users').insert(
          newUsers.map((row) => ({
            email: row.email,
            full_name: row.full_name,
            role: row.role,
            created_by: auth.user.id,
          }))
        );
        if (insertError) throw insertError;
      }

      // Update existing users' roles
      const updatePromises = mappedRows
        .filter((row) => existingEmails.has(row.email))
        .map((row) =>
          supabase.from('users').update({ role: row.role }).eq('email', row.email)
        );
      await Promise.all(updatePromises);

      return NextResponse.json({
        success: true,
        message: 'Usuarios importados correctamente (sin RPC)',
        imported: mappedRows.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuarios importados correctamente',
      imported: result || mappedRows.length,
    });
  } catch (error) {
    console.error('[v0] Import error:', error);
    return NextResponse.json(
      {
        error: 'Error processing file',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
