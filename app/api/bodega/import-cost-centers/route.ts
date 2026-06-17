export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type ImportedCostCenter = {
  code: string;
  name: string;
  description: string | null;
  depth: number;
};

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 1) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const normalizeHeader = (value: string) =>
      value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const headers = lines[0].split(';').map(normalizeHeader);
    const codigoIdx = headers.findIndex(h => h.includes('codigo'));
    const nombreIdx = headers.findIndex(h => h.includes('nombre'));
    const rutaIdx = headers.findIndex(h => h.includes('ruta'));
    const notasIdx = headers.findIndex(h => h.includes('notas'));

    const imported: ImportedCostCenter[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());

      if (values.length < 2 || codigoIdx < 0 || !values[codigoIdx]) continue;

      const code = values[codigoIdx];
      const name = values[nombreIdx] || code;
      const route = values[rutaIdx] || '';
      const notes = values[notasIdx] || '';
      const depth = Math.max(1, route ? route.split(' > ').length : 1);

      const descriptionParts = [
        route ? `Ruta: ${route}` : '',
        notes ? `Notas: ${notes}` : '',
      ].filter(Boolean);

      imported.push({
        code,
        name,
        description: descriptionParts.join(' | ') || null,
        depth,
      });
    }

    if (imported.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in file' },
        { status: 400 }
      );
    }

    const payload = imported.map((item) => ({
      organization_id: context.organizationId,
      code: item.code,
      name: item.name,
      description: item.description,
      status: 'active',
      updated_at: new Date().toISOString(),
    }));

    const { error } = await context.supabase
      .from('cost_centers')
      .upsert(payload, { onConflict: 'organization_id,code' });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${imported.length} cost centers`,
      imported: imported.length,
      roots: imported.filter((entry) => entry.depth === 1).length,
      children: imported.filter((entry) => entry.depth > 1).length,
    });
  } catch (error) {
    console.error('[v0] Cost centers import error:', error);
    return NextResponse.json(
      { error: 'Failed to import cost centers', details: String(error) },
      { status: 500 }
    );
  }
}
