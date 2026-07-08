import { NextRequest, NextResponse } from 'next/server';
import { read, utils } from 'xlsx';
import { getAuthContext } from '@/lib/api/auth-session';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get auth context
    const auth = await getAuthContext(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or manager
    if (!['superadmin', 'admin', 'manager'].includes(auth.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only admins and managers can import EECC' }, { status: 403 });
    }

    // Get form data with file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file as buffer
    const buffer = await file.arrayBuffer();
    const workbook = read(new Uint8Array(buffer));

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: 'No sheets found in workbook' }, { status: 400 });
    }

    // Convert sheet to JSON
    const rows = utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in spreadsheet' }, { status: 400 });
    }

    // Get organization ID from user's org
    const supabase = await createServerClient();
    
    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', auth.userId)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
    }

    const organizationId = userOrg.organization_id;

    // Parse and validate rows
    const eeccRecords: Array<{
      name: string;
      rut: string;
      representative?: string;
      email?: string;
      phone?: string;
    }> = [];

    for (const row of rows) {
      const record = row as Record<string, any>;

      // Map column names (case-insensitive, handle variations)
      const name =
        record['EMPRESA'] ||
        record['Empresa'] ||
        record['empresa'] ||
        record['NAME'] ||
        record['Nombre'] ||
        record['nombre'];

      const rut =
        record['RUT'] ||
        record['Rut'] ||
        record['rut'] ||
        record['ID'] ||
        record['id'];

      const representative =
        record['REPRESENTANTE'] ||
        record['Representante'] ||
        record['representante'] ||
        record['CONTACT'] ||
        record['Contact'] ||
        record['contact'];

      const email =
        record['CORREO'] ||
        record['Correo'] ||
        record['correo'] ||
        record['EMAIL'] ||
        record['Email'] ||
        record['email'];

      const phone =
        record['TELÉFONO'] ||
        record['Telefono'] ||
        record['telefono'] ||
        record['PHONE'] ||
        record['Phone'] ||
        record['phone'];

      if (!name || !rut) {
        continue; // Skip rows without name or RUT
      }

      eeccRecords.push({
        name: String(name).trim(),
        rut: String(rut).trim(),
        representative: representative ? String(representative).trim() : undefined,
        email: email ? String(email).trim() : undefined,
        phone: phone ? String(phone).trim() : undefined,
      });
    }

    if (eeccRecords.length === 0) {
      return NextResponse.json({ error: 'No valid EECC records found in file' }, { status: 400 });
    }

    // Insert/update EECC records
    const { data, error } = await supabase
      .from('eecc')
      .upsert(
        eeccRecords.map((record) => ({
          organization_id: organizationId,
          name: record.name,
          rut: record.rut,
          representative: record.representative,
          email: record.email,
          phone: record.phone,
          is_active: true,
          created_by: auth.userId,
        })),
        {
          onConflict: 'organization_id,rut',
        }
      )
      .select();

    if (error) {
      console.error('[v0] Error upserting EECC:', error);
      return NextResponse.json(
        { error: `Failed to import EECC: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${eeccRecords.length} empresas importadas exitosamente`,
      imported: data?.length || eeccRecords.length,
    });
  } catch (error) {
    console.error('[v0] Import EECC error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
