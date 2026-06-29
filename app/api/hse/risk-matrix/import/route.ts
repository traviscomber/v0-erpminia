export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { loadXlsxModule } from '@/lib/xlsx';

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeHeader(value: unknown) {
  return normalizeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseCsvRows(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    title: pickIndex(headers, ['title', 'titulo', 'riesgo']),
    hazard: pickIndex(headers, ['hazard', 'peligro', 'amenaza']),
    risk_level: pickIndex(headers, ['risk_level', 'nivel', 'criticidad']),
    status: pickIndex(headers, ['status', 'estado']),
    control_measure: pickIndex(headers, ['control', 'medida', 'mitigacion']),
    location: pickIndex(headers, ['location', 'ubicacion', 'faena', 'area']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const title = values[columns.title] || values[columns.hazard] || '';
    if (!title) return [];
    return [{
      title,
      hazard: values[columns.hazard] || '',
      risk_level: values[columns.risk_level] || 'media',
      status: values[columns.status] || 'active',
      control_measure: values[columns.control_measure] || '',
      location: values[columns.location] || '',
    }];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = await loadXlsxModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
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

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing config');
  return { url, key };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Se requiere archivo CSV, XLS o XLSX' }, { status: 400 });
    }
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No se proporciono archivo', imported: 0, updated: 0 }, { status: 400 });

    const rows = await parseImportFile(file);
    if (rows.length === 0) return NextResponse.json({ error: 'No se encontraron riesgos validos en el archivo', imported: 0, updated: 0 }, { status: 400 });

    const { url, key } = getClient();
    let imported = 0;
    let updated = 0;

    for (const row of rows) {
      const body = {
        title: row.title,
        hazard: row.hazard,
        risk_level: row.risk_level,
        status: row.status,
        control_measure: row.control_measure,
        location: row.location,
      };

      const lookup = await fetch(
        `${url}/rest/v1/risk_matrix?select=id&title=eq.${encodeURIComponent(row.title)}&location=eq.${encodeURIComponent(row.location)}`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      if (!lookup.ok) throw new Error(await lookup.text());
      const existing = (await lookup.json()) as Array<{ id: string }>;

      if (existing.length > 0) {
        const response = await fetch(`${url}/rest/v1/risk_matrix?id=eq.${encodeURIComponent(existing[0].id)}`, {
          method: 'PATCH',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await response.text());
        updated += 1;
      } else {
        const response = await fetch(`${url}/rest/v1/risk_matrix`, {
          method: 'POST',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await response.text());
        imported += 1;
      }
    }

    return NextResponse.json({ success: true, message: `Se procesaron ${rows.length} riesgos`, imported, updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron importar los riesgos';
    console.error('[hse][risk-matrix][import] error:', message);
    return NextResponse.json({ error: message, imported: 0, updated: 0 }, { status: 500 });
  }
}
