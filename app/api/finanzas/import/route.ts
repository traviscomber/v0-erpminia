export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext, type OrganizationSuccessContext } from '@/lib/api/organization-context';
import { loadXlsxModule, sheetToMatrix } from '@/lib/xlsx';

const CANDIDATE_TABLES = ['finance_movements', 'finanzas_movements', 'movements'];

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseCsvRows(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    date: pickIndex(headers, ['date', 'fecha']),
    description: pickIndex(headers, ['description', 'descripcion', 'detalle', 'glosa']),
    amount: pickIndex(headers, ['amount', 'monto', 'valor']),
    type: pickIndex(headers, ['type', 'tipo']),
    category: pickIndex(headers, ['category', 'categoria']),
    cost_center_id: pickIndex(headers, ['cost_center', 'centro']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const description = values[columns.description] || '';
    if (!description) return [];

    return [
      {
        date: values[columns.date] || new Date().toISOString().slice(0, 10),
        description,
        amount: parseNumber(values[columns.amount]),
        type: (values[columns.type] || 'ingreso').toLowerCase(),
        category: values[columns.category] || 'general',
        cost_center_id: values[columns.cost_center_id] || null,
      },
    ];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = await loadXlsxModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = sheetToMatrix(xlsx, sheet, true);
  if (!rows.length) return [];

  const csvText = [rows[0].map((value) => normalizeText(value)).join(';'), ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';'))].join('\n');
  return parseCsvRows(csvText);
}

async function parseImportFile(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.csv')) return parseCsvRows(await file.text());
  if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) return parseWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

async function insertRows(context: OrganizationSuccessContext, rows: any[]) {
  for (const table of CANDIDATE_TABLES) {
    const { error } = await context.supabase.from(table).insert(
      rows.map((row) => ({
        organization_id: context.organizationId,
        ...row,
      }))
    );

    if (!error) return table;
  }

  throw new Error('No se pudo insertar en la tabla de movimientos financieros');
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 });
    }

    const rows = await parseImportFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron movimientos validos' }, { status: 400 });
    }

    await insertRows(context, rows);

    return NextResponse.json({
      success: true,
      message: `Se importaron ${rows.length} movimientos financieros`,
      imported: rows.length,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message, imported: 0 }, { status: 500 });
  }
}
