export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { read, utils } from 'xlsx';
import { getOrganizationContext } from '@/lib/api/organization-context';

type ImportedCostCenter = {
  code: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeRoute(value: string) {
  return value
    .trim()
    .replace(/[/>]/g, '\\')
    .replace(/\\+/g, '\\')
    .replace(/^\\+|\\+$/g, '');
}

function slugify(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseDate(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const text = String(value).trim();
  if (!text) return undefined;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return undefined;
}

async function parseWorkbookRows(file: File, text: string) {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
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

  const workbook = read(Buffer.from(await file.arrayBuffer()), {
    type: 'buffer',
    cellDates: true,
  });
  const sheetName =
    workbook.SheetNames.find((entry: string) => normalizeHeader(entry).includes('centros de costos')) ||
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });
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

function splitName(value: string, parentCode?: string) {
  const raw = value.trim();
  const match = raw.match(/^([^\s]+)\s+(.+)$/);
  if (match) {
    return {
      code: match[1].trim(),
      name: match[2].trim(),
    };
  }

  const fallbackCode = parentCode ? `${parentCode}-${slugify(raw)}` : slugify(raw);
  return {
    code: fallbackCode || raw,
    name: raw,
  };
}

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
    const rows = await parseWorkbookRows(file, text);

    if (!rows.length) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const parsed = rows
      .map((row) => {
        const nameValue = String(row['nombre'] || '').trim();
        const routeValue = normalizeRoute(String(row['ruta completa'] || ''));
        if (!nameValue || !routeValue) return null;

        const routeSegments = routeValue.split('\\').filter(Boolean);
        const depth = routeSegments.length || 1;
        const parentRouteKey = routeSegments.slice(0, -1).join('\\');

        return {
          nameValue,
          routeValue,
          routeSegments,
          parentRouteKey,
          depth,
          creator: String(row['creador por'] || '').trim(),
          notes: String(row['notas'] || '').trim(),
          discontinued: String(row['discontinuado'] || '').trim().toLowerCase() === 'si',
          createdAt: parseDate(row['fecha de creacion'] || row['fecha de creación']),
          updatedAt: parseDate(row['fecha de modificacion'] || row['fecha de modificación']),
          modifiedBy: String(row['modificado por'] || '').trim(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => a.depth - b.depth || a.routeValue.localeCompare(b.routeValue));

    if (!parsed.length) {
      return NextResponse.json(
        { error: 'No valid data found in file' },
        { status: 400 }
      );
    }

    const routeCodeMap = new Map<string, string>();
    const payload: ImportedCostCenter[] = parsed.map((row) => {
      const parentCode = row.parentRouteKey ? routeCodeMap.get(row.parentRouteKey) : undefined;
      const derived = splitName(row.nameValue, parentCode);
      routeCodeMap.set(row.routeValue, derived.code);

      const descriptionParts = [
        `Ruta completa: ${row.routeValue}`,
        row.creator ? `Creador: ${row.creator}` : '',
        row.modifiedBy ? `Modificado por: ${row.modifiedBy}` : '',
        row.notes ? `Notas: ${row.notes}` : '',
      ].filter(Boolean);

      return {
        code: derived.code,
        name: derived.name,
        description: descriptionParts.join(' | ') || null,
        status: row.discontinued ? 'inactive' : 'active',
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      };
    });

    const { error } = await context.supabase
      .from('cost_centers')
      .upsert(
        payload.map((item) => ({
          organization_id: context.organizationId,
          code: item.code,
          name: item.name,
          description: item.description,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at || new Date().toISOString(),
        })),
        { onConflict: 'organization_id,code' }
      );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${payload.length} cost centers`,
      imported: payload.length,
      roots: parsed.filter((entry) => entry.depth === 1).length,
      children: parsed.filter((entry) => entry.depth > 1).length,
    });
  } catch (error) {
    console.error('[v0] Cost centers import error:', error);
    return NextResponse.json(
      { error: 'Failed to import cost centers', details: String(error) },
      { status: 500 }
    );
  }
}
