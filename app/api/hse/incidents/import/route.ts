export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { loadXlsxModule } from '@/lib/xlsx';

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeKey(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeHeader(value: unknown) {
  return normalizeKey(value);
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function normalizeSeverity(value: unknown) {
  const severity = normalizeKey(value);
  if (severity.includes('crit')) return 'critica';
  if (severity.includes('alta')) return 'alta';
  if (severity.includes('media')) return 'media';
  if (severity.includes('baja')) return 'baja';
  return severity || 'media';
}

function normalizeStatus(value: unknown) {
  const status = normalizeKey(value);
  if (status.includes('cerr')) return 'cerrado';
  if (status.includes('abier') || status.includes('open')) return 'abierto';
  if (status.includes('invest')) return 'en_investigacion';
  return status || 'abierto';
}

function normalizeDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const text = normalizeText(value);
  if (!text) return '';

  const iso = text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return text;
}

type IncidentRow = {
  title: string;
  description: string;
  severity: string;
  status: string;
  date_reported: string;
  location: string;
};

function parseCsvRows(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    title: pickIndex(headers, ['title', 'titulo', 'incidente']),
    description: pickIndex(headers, ['description', 'descripcion', 'detalle', 'observacion']),
    severity: pickIndex(headers, ['severity', 'severidad', 'gravedad']),
    status: pickIndex(headers, ['status', 'estado']),
    date_reported: pickIndex(headers, ['date_reported', 'fecha', 'report']),
    location: pickIndex(headers, ['location', 'ubicacion', 'area', 'faena']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const title = values[columns.title] || values[0] || '';
    const description = values[columns.description] || '';
    const date_reported = normalizeDateValue(values[columns.date_reported]);
    if (!title || !date_reported) return [];

    return [{
      title,
      description,
      severity: normalizeSeverity(values[columns.severity]),
      status: normalizeStatus(values[columns.status]),
      date_reported,
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

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Se requiere archivo CSV, XLS o XLSX' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    const rows = await parseImportFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron incidentes validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    const { url, key } = (() => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) throw new Error('Missing config');
      return { url: supabaseUrl, key: supabaseKey };
    })();

    let imported = 0;
    let updated = 0;

    for (const row of rows as IncidentRow[]) {
      const body = {
        title: row.title,
        description: row.description,
        severity: row.severity,
        status: row.status,
        date_reported: row.date_reported,
        location: row.location,
      };
      const query = [
        `title=eq.${encodeURIComponent(row.title)}`,
        `date_reported=eq.${encodeURIComponent(row.date_reported)}`,
        `location=eq.${encodeURIComponent(row.location || '')}`,
      ].join('&');

      const existingResponse = await fetch(`${url}/rest/v1/incidents?${query}&select=id`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });
      if (!existingResponse.ok) throw new Error(await existingResponse.text());
      const existing = (await existingResponse.json()) as Array<{ id: string }>;

      if (existing.length > 0) {
        const response = await fetch(`${url}/rest/v1/incidents?id=eq.${encodeURIComponent(existing[0].id)}`, {
          method: 'PATCH',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await response.text());
        updated += 1;
      } else {
        const response = await fetch(`${url}/rest/v1/incidents`, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await response.text());
        imported += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se procesaron ${rows.length} incidentes`,
      imported,
      updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron importar los incidentes';
    console.error('[hse][incidents][import] error:', message);
    return NextResponse.json({ error: message, imported: 0, updated: 0 }, { status: 500 });
  }
}
