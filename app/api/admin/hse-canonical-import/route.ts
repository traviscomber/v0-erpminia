export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { read, utils } from 'xlsx/xlsx.mjs';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

// Canonical data belongs to the real (non-demo) organization.
const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

// The HSE import is disabled by default. It only runs when
// HSE_CANONICAL_IMPORT_ENABLED is explicitly set to 'true', so a normal deploy can
// never accidentally expose it. The import has already been driven to completion.
const IMPORT_ENABLED = process.env.HSE_CANONICAL_IMPORT_ENABLED === 'true';

type DatasetKey = 'hse_roles' | 'hse_commitments' | 'hse_facilities' | 'status';

type FileSpec = {
  fileName: string;
  blobUrl: string;
  logicalName: string;
};

const FILES: Record<string, FileSpec> = {
  roles: {
    fileName: 'ROLES-INTRANET-d4ae24.xlsx',
    blobUrl: 'https://blobs.vusercontent.net/blob/ROLES-INTRANET-d4ae24.xlsx',
    logicalName: 'ROLES-INTRANET.xlsx',
  },
  commitments: {
    fileName: 'Registro-Maestro-Compromisos-Ambientales-Javito-dc3afa.xlsx',
    blobUrl: 'https://blobs.vusercontent.net/blob/Registro-Maestro-Compromisos-Ambientales-Javito-dc3afa.xlsx',
    logicalName: 'Registro-Maestro-Compromisos-Ambientales.xlsx',
  },
  facilities: {
    fileName: 'LISTADO-EECC-2f5c74.xlsx',
    blobUrl: 'https://blobs.vusercontent.net/blob/LISTADO-EECC-2f5c74.xlsx',
    logicalName: 'LISTADO-EECC.xlsx',
  },
};

// ---------- helpers ----------

function isAuthorized(req: NextRequest) {
  const token = process.env.ADMIN_INIT_TOKEN;
  if (!token) return false;
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const xToken = req.headers.get('x-admin-token') || '';
  return bearer === token || xToken === token;
}

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === '---') return null;
  return text;
}

function toDateString(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = cleanText(value);
  if (!text) return null;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function hashRow(file: string, sheet: string, row: number): string {
  return createHash('sha256').update(`${file}::${sheet}::${row}`).digest('hex');
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) out[key.trim()] = row[key];
  return out;
}

// ---------- workbook cache & loading ----------

const workbookCache = new Map<string, ReturnType<typeof read>>();

async function loadWorkbook(spec: FileSpec) {
  if (workbookCache.has(spec.fileName)) return workbookCache.get(spec.fileName)!;
  let buffer: Buffer;
  try {
    // Keep the filesystem trace statically scoped to data/ so Turbopack does not
    // include the whole repository in this serverless function.
    buffer = readFileSync(path.join(process.cwd(), 'data', spec.fileName));
  } catch {
    const res = await fetch(spec.blobUrl);
    if (!res.ok) throw new Error(`No se pudo leer ${spec.logicalName} (fs y blob fallaron)`);
    buffer = Buffer.from(await res.arrayBuffer());
  }
  const wb = read(buffer, { type: 'buffer', cellDates: true });
  workbookCache.set(spec.fileName, wb);
  return wb;
}

function sheetRows(wb: ReturnType<typeof read>, sheet: string): Record<string, unknown>[] {
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`Hoja "${sheet}" no encontrada`);
  return (utils.sheet_to_json(ws, { defval: null }) as unknown as Record<string, unknown>[]).map(normalizeRow);
}

// ---------- pg client ----------

async function withPgClient<T>(handler: (client: Client) => Promise<T>) {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('No hay conexión Postgres disponible');
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  await client.connect();
  try {
    return await handler(client);
  } finally {
    await client.end();
    if (prevTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
  }
}

// ---------- dataset builders ----------

async function loadHseRoles(client: Client, offset: number, limit: number) {
  const wb = await loadWorkbook(FILES.roles);
  const rows = sheetRows(wb, 'ROLES');
  const slice = rows.slice(offset, offset + limit);
  const records = slice.map((row, idx) => ({
    name: cleanText(row['Rol']) || 'Sin nombre',
    description: cleanText(row['Descripción']),
    permissions: cleanText(row['Permisos']),
    is_active: cleanText(row['Activo']) === 'Sí',
    source_row: offset + idx + 2,
    source_hash: hashRow(FILES.roles.logicalName, 'ROLES', offset + idx + 2),
    source_payload: row,
  }));

  const result = await client.query(
    `INSERT INTO hse_roles (organization_id, name, description, permissions, is_active, source_row, source_hash, source_payload, source_file)
     SELECT $1, r.name, r.description, r.permissions, r.is_active, r.source_row, r.source_hash, r.source_payload::jsonb, $2
     FROM jsonb_to_recordset($3::jsonb) AS r(name text, description text, permissions text, is_active boolean, source_row int, source_hash text, source_payload jsonb)
     ON CONFLICT (organization_id, source_hash) DO UPDATE SET
       description = EXCLUDED.description,
       permissions = EXCLUDED.permissions,
       is_active = EXCLUDED.is_active
     RETURNING id`,
    [ORG_ID, FILES.roles.logicalName, JSON.stringify(records)],
  );

  return { processed: slice.length, inserted: result.rowCount || 0 };
}

async function loadHseCommitments(client: Client, offset: number, limit: number) {
  const wb = await loadWorkbook(FILES.commitments);
  const rows = sheetRows(wb, 'Hoja1');
  const slice = rows.slice(offset, offset + limit);
  const records = slice.map((row, idx) => ({
    commitment_id: cleanText(row['ID Compromiso']) || `C${offset + idx}`,
    description: cleanText(row['Descripción del Compromiso']),
    requirement: cleanText(row['Requisito']),
    responsible: cleanText(row['Responsable']),
    due_date: toDateString(row['Fecha Vencimiento']),
    status: cleanText(row['Estado']) || 'Pendiente',
    source_row: offset + idx + 2,
    source_hash: hashRow(FILES.commitments.logicalName, 'Hoja1', offset + idx + 2),
    source_payload: row,
  }));

  const result = await client.query(
    `INSERT INTO hse_commitments (organization_id, commitment_id, description, requirement, responsible, due_date, status, source_row, source_hash, source_payload, source_file)
     SELECT $1, r.commitment_id, r.description, r.requirement, r.responsible, r.due_date, r.status, r.source_row, r.source_hash, r.source_payload::jsonb, $2
     FROM jsonb_to_recordset($3::jsonb) AS r(commitment_id text, description text, requirement text, responsible text, due_date date, status text, source_row int, source_hash text, source_payload jsonb)
     ON CONFLICT (organization_id, source_hash) DO UPDATE SET
       description = EXCLUDED.description,
       status = EXCLUDED.status
     RETURNING id`,
    [ORG_ID, FILES.commitments.logicalName, JSON.stringify(records)],
  );

  return { processed: slice.length, inserted: result.rowCount || 0 };
}

async function loadHseFacilities(client: Client, offset: number, limit: number) {
  const wb = await loadWorkbook(FILES.facilities);
  const rows = sheetRows(wb, 'Hoja1');
  const slice = rows.slice(offset, offset + limit);
  const records = slice.map((row, idx) => ({
    code: cleanText(row['Código']) || `F${offset + idx}`,
    name: cleanText(row['Nombre']) || cleanText(row['Instalación']) || 'Sin nombre',
    location: cleanText(row['Ubicación']),
    type: cleanText(row['Tipo']),
    risk_level: cleanText(row['Nivel Riesgo']) || 'Medio',
    source_row: offset + idx + 2,
    source_hash: hashRow(FILES.facilities.logicalName, 'Hoja1', offset + idx + 2),
    source_payload: row,
  }));

  const result = await client.query(
    `INSERT INTO hse_facilities (organization_id, code, name, location, type, risk_level, source_row, source_hash, source_payload, source_file)
     SELECT $1, r.code, r.name, r.location, r.type, r.risk_level, r.source_row, r.source_hash, r.source_payload::jsonb, $2
     FROM jsonb_to_recordset($3::jsonb) AS r(code text, name text, location text, type text, risk_level text, source_row int, source_hash text, source_payload jsonb)
     ON CONFLICT (organization_id, source_hash) DO UPDATE SET
       name = EXCLUDED.name,
       location = EXCLUDED.location
     RETURNING id`,
    [ORG_ID, FILES.facilities.logicalName, JSON.stringify(records)],
  );

  return { processed: slice.length, inserted: result.rowCount || 0 };
}

async function getImportStatus(client: Client) {
  const roles = await client.query('SELECT count(*) as cnt FROM hse_roles WHERE organization_id=$1', [
    ORG_ID,
  ]);
  const commitments = await client.query('SELECT count(*) as cnt FROM hse_commitments WHERE organization_id=$1', [
    ORG_ID,
  ]);
  const facilities = await client.query('SELECT count(*) as cnt FROM hse_facilities WHERE organization_id=$1', [
    ORG_ID,
  ]);

  return {
    hse_roles: parseInt(roles.rows[0].cnt) || 0,
    hse_commitments: parseInt(commitments.rows[0].cnt) || 0,
    hse_facilities: parseInt(facilities.rows[0].cnt) || 0,
  };
}

// ---------- handlers ----------

export async function GET(req: NextRequest) {
  if (!IMPORT_ENABLED) {
    return NextResponse.json({ error: 'Importador deshabilitado' }, { status: 403 });
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get('dataset') || 'status';

    return await withPgClient(async (client) => {
      if (dataset === 'status') {
        const status = await getImportStatus(client);
        return NextResponse.json({ status, enabled: IMPORT_ENABLED });
      }

      return NextResponse.json({ error: 'GET: use POST' }, { status: 400 });
    });
  } catch (error) {
    console.error('[API] HSE import GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!IMPORT_ENABLED) {
    return NextResponse.json({ error: 'Importador deshabilitado' }, { status: 403 });
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { dataset?: string; offset?: number; limit?: number };
    const dataset = body.dataset || 'hse_roles';
    const offset = Math.max(body.offset || 0, 0);
    const limit = Math.min(Math.max(body.limit || 100, 10), 1000);

    return await withPgClient(async (client) => {
      let result;

      if (dataset === 'hse_roles') {
        result = await loadHseRoles(client, offset, limit);
      } else if (dataset === 'hse_commitments') {
        result = await loadHseCommitments(client, offset, limit);
      } else if (dataset === 'hse_facilities') {
        result = await loadHseFacilities(client, offset, limit);
      } else {
        return NextResponse.json({ error: `Dataset desconocido: ${dataset}` }, { status: 400 });
      }

      return NextResponse.json({
        ...result,
        nextOffset: offset + limit,
        done: result.processed < limit,
      });
    });
  } catch (error) {
    console.error('[API] HSE import POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    );
  }
}
