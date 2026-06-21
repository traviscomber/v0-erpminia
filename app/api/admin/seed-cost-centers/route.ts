export const dynamic = 'force-dynamic';

import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function normalizeText(value: string) {
  return String(value || '')
    .trim()
    .replaceAll('ï¿½', '')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeRoute(value: string) {
  return normalizeText(value)
    .replace(/[/>]/g, '\\')
    .replace(/\\+/g, '\\')
    .replace(/^\\+|\\+$/g, '');
}

function parseDate(value: string) {
  if (!value || value === '---') return null;
  const [datePart, timePart] = value.trim().split(' ');
  if (!datePart || !timePart) return null;
  const [day, month, year] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  if (!day || !month || !year || Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const parsed = new Date(year, month - 1, day, hours, minutes, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function splitCsvLine(line: string) {
  return line.split(';').map((value) => normalizeText(value));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveCodeAndName(rawName: string, parentCode?: string) {
  const raw = normalizeText(rawName);

  const match = raw.match(/^([0-9]+(?:-[0-9]+)*)\s+(.+)$/);
  if (match) {
    return {
      code: match[1].trim(),
      name: normalizeText(match[2]),
    };
  }

  if (parentCode) {
    return {
      code: `${parentCode}-${slugify(raw)}`,
      name: raw,
    };
  }

  return {
    code: slugify(raw) || raw,
    name: raw,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const csvPath = join(process.cwd(), 'scripts', 'import-centros-costos.csv');
    const content = readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'El archivo base de centros está vacío' }, { status: 400 });
    }

    const records = lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      const routeValue = normalizeRoute(values[8] || '');

      return {
        creator: values[0] || '',
        code: values[1] || '',
        discontinued: (values[2] || '').toLowerCase() === 'si',
        createdAt: parseDate(values[3]) || new Date().toISOString(),
        updatedAt: parseDate(values[4]) || new Date().toISOString(),
        modifiedBy: values[5] || '',
        nameValue: values[6] || '',
        notes: values[7] || '',
        routeValue,
        routeDepth: routeValue ? routeValue.split('\\').filter(Boolean).length : 0,
      };
    });

    const routeCodeMap = new Map<string, string>();
    const payload = records
      .filter((row) => row.nameValue && row.routeValue && !row.discontinued)
      .sort((a, b) => a.routeDepth - b.routeDepth || a.routeValue.localeCompare(b.routeValue))
      .map((row) => {
        const routeSegments = row.routeValue.split('\\').filter(Boolean);
        const parentRouteKey = routeSegments.slice(0, -1).join('\\');
        const parentCode = parentRouteKey ? routeCodeMap.get(parentRouteKey) : undefined;
        const derived = deriveCodeAndName(row.nameValue, parentCode);
        const code = normalizeText(row.code || derived.code);
        const name = normalizeText(derived.name);

        routeCodeMap.set(row.routeValue, code);

        const description = [
          `Ruta completa: ${row.routeValue}`,
          row.creator ? `Creador: ${row.creator}` : '',
          row.modifiedBy ? `Modificado por: ${row.modifiedBy}` : '',
          row.createdAt ? `Fecha creación: ${row.createdAt}` : '',
          row.updatedAt ? `Fecha modificación: ${row.updatedAt}` : '',
          row.notes ? `Notas: ${row.notes}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        return {
          organization_id: auth.organizationId,
          code,
          name,
          description: description || null,
          status: 'active',
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        };
      });

    const { error: deleteError } = await supabase
      .from('cost_centers')
      .delete()
      .eq('organization_id', auth.organizationId);

    if (deleteError) {
      throw deleteError;
    }

    const { error } = await supabase.from('cost_centers').insert(payload);
    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      imported: payload.length,
      message: `Se cargaron ${payload.length} centros de costo desde la base de referencia`,
    });
  } catch (error) {
    console.error('[v0] Seed cost centers error:', error);
    return NextResponse.json(
      { error: 'No se pudo cargar la base de centros de costo', details: String(error) },
      { status: 500 }
    );
  }
}
