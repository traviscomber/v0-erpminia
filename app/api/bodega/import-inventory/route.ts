export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getOrganizationContext } from '@/lib/api/organization-context';

function normalizeHeader(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseCSVRows(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';').map(normalizeHeader);
  return lines.slice(1).map(line => {
    const values = line.split(';').map(v => v.trim());
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    return record;
  });
}

async function parseWorkbookRows(file: File, text: string) {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
    return parseCSVRows(text);
  }

  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), {
    type: 'buffer',
    cellDates: true,
  });
  const sheetName =
    workbook.SheetNames.find((entry) => normalizeHeader(entry).includes('productos')) ||
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });
  if (!rows.length) return [];

  const headers = (rows[0] as unknown[]).map((header) => normalizeHeader(String(header ?? '')));
  return rows.slice(1).map((row) => {
    const values = row as unknown[];
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });
}

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const costCenterId = formData.get('costCenterId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();
    const rows = await parseWorkbookRows(file, text);

    if (rows.length < 1) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    const data: any[] = [];
    for (const row of rows) {
      const codigo = String(row['codigo'] || '').trim();
      const familia = String(row['familia'] || '').trim();
      const subFamilia = String(row['sub-familia'] || row['subfamilia'] || '').trim();
      const equipo = String(row['equipo'] || '').trim();
      const nombre = String(row['producto'] || familia || codigo).trim();

      if (!codigo || !nombre) continue;

      data.push({
        codigo: codigo,
        name: nombre,
        sku: codigo,
        familia,
        sub_familia: subFamilia,
        equipo,
        category: familia || 'General',
        cost_center_id: costCenterId || null,
        quantity: 0,
        description: `${familia} ${subFamilia} ${equipo}`.trim(),
        location: '',
        unit_cost: 0,
        min_stock: 5,
        max_stock: 500,
      });
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in file' },
        { status: 400 }
      );
    }

    if (costCenterId) {
      const { data: selectedCostCenter, error: costCenterError } = await context.supabase
        .from('cost_centers')
        .select('id')
        .eq('id', costCenterId)
        .eq('organization_id', context.organizationId)
        .eq('status', 'active')
        .maybeSingle();

      if (costCenterError) throw costCenterError;
      if (!selectedCostCenter) {
        return NextResponse.json(
          { error: 'Invalid cost center selected for this organization' },
          { status: 400 }
        );
      }
    }

    // Insert into bodega_inventory
    const { error: insertError } = await context.supabase
      .from('bodega_inventory')
      .upsert(
        data.map(d => ({
          sku: d.sku,
          name: d.name,
          codigo: d.codigo,
          familia: d.familia,
          sub_familia: d.sub_familia,
          equipo: d.equipo,
          category: d.category,
          cost_center_id: d.cost_center_id,
          quantity: d.quantity,
          description: d.description,
          location: d.location,
          unit_cost: d.unit_cost,
          min_stock: d.min_stock,
          max_stock: d.max_stock,
        })),
        { onConflict: 'sku' }
      );

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${data.length} inventory items`,
      imported: data.length,
      costCenterId: costCenterId || null,
      sampleItems: data.slice(0, 3),
    });
  } catch (error) {
    console.error('[v0] Bodega inventory import error:', error);
    return NextResponse.json(
      { error: 'Failed to import inventory', details: String(error) },
      { status: 500 }
    );
  }
}
