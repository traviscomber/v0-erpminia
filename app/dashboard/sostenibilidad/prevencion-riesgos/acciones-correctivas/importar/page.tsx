'use client';

import Link from 'next/link';
import { useRef, useState, type DragEvent } from 'react';
import * as XLSX from 'xlsx';
import { AlertCircle, ArrowRight, CheckCircle2, Download, Loader2, Upload } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ImportResult = {
  success: boolean;
  message: string;
  created?: number;
  updated?: number;
  failed?: number;
  error?: string;
};

type NormalizedRow = {
  ncId: string;
  ncNumber: string;
  actionDescription: string;
  priority: string;
  scheduledCompletionDate: string;
  status: string;
};

const HEADER_ALIASES = {
  ncId: ['NC_ID', 'NCID', 'NCID_REFERENCIA', 'NC_REF', 'NC'],
  ncNumber: ['NC_NUMBER', 'NCNUMERO', 'NUMERO_NC', 'NO_CONFORMIDAD', 'NO_CONFORMIDAD_NUMERO'],
  actionDescription: ['ACTION_DESCRIPTION', 'DESCRIPCION_ACCION', 'DESCRIPCION', 'ACCION', 'PLAN_DE_ACCION'],
  priority: ['PRIORITY', 'PRIORIDAD'],
  scheduledCompletionDate: ['SCHEDULED_COMPLETION_DATE', 'FECHA_COMPROMISO', 'FECHA_PLANIFICADA', 'FECHA_VENCIMIENTO'],
  status: ['STATUS', 'ESTADO'],
} as const;

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase();
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeStatus(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'planned';
  if (['planned', 'planificada', 'abierta', 'open'].includes(text)) return 'planned';
  if (['in_progress', 'en_progreso', 'progreso'].includes(text)) return 'in_progress';
  if (['completed', 'cerrada', 'closed', 'completada'].includes(text)) return 'completed';
  if (['verified', 'verificada'].includes(text)) return 'verified';
  return 'planned';
}

function normalizePriority(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  if (['alta', 'high', 'urgent', 'critical'].includes(text)) return 'alta';
  if (['baja', 'low'].includes(text)) return 'baja';
  return 'media';
}

function readCell(row: Record<string, unknown>, aliases: readonly string[]) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const match = entries.find(([key]) => normalizeKey(key) === target);
    if (match && match[1] !== undefined && match[1] !== null && String(match[1]).trim() !== '') {
      return String(match[1]).trim();
    }
  }
  return '';
}

function toIsoDate(value: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).trim();
  return parsed.toISOString().slice(0, 10);
}

function buildTemplateCsv() {
  const headers = [
    'NC_ID',
    'NC_NUMBER',
    'ACTION_DESCRIPTION',
    'PRIORITY',
    'SCHEDULED_COMPLETION_DATE',
    'STATUS',
  ];
  const rows = [
    ['uuid-nc-1', 'NC-2026-0001', 'Inspeccionar y corregir hallazgo principal', 'alta', '2026-07-15', 'planned'],
    ['', 'NC-2026-0002', 'Cerrar observación secundaria', 'media', '2026-07-20', 'in_progress'],
  ];
  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export default function CorrectiveActionsImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-acciones-correctivas.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const loadNcMap = async () => {
    const response = await fetch('/api/sostenibilidad/nonconformances?limit=1000', {
      credentials: 'include',
    });
    const payload = await response.json().catch(() => ({}));
    const records = Array.isArray(payload.data) ? payload.data : [];
    const map = new Map<string, string>();

    for (const record of records) {
      if (record?.id) map.set(normalizeKey(String(record.id)), String(record.id));
      if (record?.nc_number) map.set(normalizeKey(String(record.nc_number)), String(record.id));
    }

    return map;
  };

  const parseFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const xlsx = XLSX as any;
    const workbook = xlsx.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) return [];

    const rows = xlsx.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    }) as Record<string, unknown>[];

    return rows.map((row) => ({
      ncId: readCell(row, HEADER_ALIASES.ncId),
      ncNumber: readCell(row, HEADER_ALIASES.ncNumber),
      actionDescription: readCell(row, HEADER_ALIASES.actionDescription),
      priority: normalizePriority(readCell(row, HEADER_ALIASES.priority)),
      scheduledCompletionDate: toIsoDate(readCell(row, HEADER_ALIASES.scheduledCompletionDate)),
      status: normalizeStatus(readCell(row, HEADER_ALIASES.status)),
    }));
  };

  const uploadFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const valid = name.endsWith('.csv') || name.endsWith('.xls') || name.endsWith('.xlsx');
    if (!valid) {
      setResult({ success: false, message: 'Solo aceptamos CSV, XLS o XLSX', error: 'Formato no valido' });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const ncMap = await loadNcMap();
      const rows = await parseFile(file);
      let created = 0;
      let updated = 0;
      let failed = 0;
      type CachedAction = { id: string; action_description?: string | null };
      const actionsCache = new Map<string, CachedAction[]>();

      for (const row of rows) {
        const resolvedNcId = row.ncId || (row.ncNumber ? ncMap.get(normalizeKey(row.ncNumber)) || '' : '');

        if (!resolvedNcId || !row.actionDescription) {
          failed += 1;
          continue;
        }

        let existingActions = actionsCache.get(resolvedNcId) || [];
        if (!actionsCache.has(resolvedNcId)) {
          const response = await fetch(`/api/sostenibilidad/corrective-actions?ncId=${encodeURIComponent(resolvedNcId)}`, {
            credentials: 'include',
          });
          const payload = await response.json().catch(() => ({}));
          existingActions = Array.isArray(payload.data) ? (payload.data as CachedAction[]) : [];
          actionsCache.set(resolvedNcId, existingActions);
        }

        const existingAction = existingActions.find(
          (action) => normalizeText(String(action.action_description || '')) === normalizeText(row.actionDescription)
        );

        const payload = {
          nc_id: resolvedNcId,
          action_description: row.actionDescription,
          priority: row.priority || 'media',
          scheduled_completion_date: row.scheduledCompletionDate || null,
          status: row.status || 'planned',
        };

        const response = await fetch('/api/sostenibilidad/corrective-actions', {
          method: existingAction ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(existingAction ? { id: existingAction.id, ...payload } : payload),
        });

        if (!response.ok) {
          failed += 1;
          continue;
        }

        if (existingAction) {
          updated += 1;
        } else {
          created += 1;
        }
      }

      setResult({
        success: failed === 0,
        message:
          failed === 0
            ? 'Acciones correctivas importadas correctamente'
            : 'Importacion terminada con observaciones',
        created,
        updated,
        failed,
      });
    } catch (error) {
      setResult({
        success: false,
        message: 'Error al subir el archivo',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar acciones correctivas</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Carga planes correctivos desde Excel para mantener trazabilidad con la no conformidad de origen.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button asChild>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/acciones-correctivas">
              <ArrowRight className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            Cargar archivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">Arrastra tu archivo o haz clic para seleccionar</p>
            <p className="mt-1 text-sm text-muted-foreground">Formato: CSV, XLS o XLSX</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-semibold">Columnas esperadas:</p>
              <div className="rounded bg-muted p-2 font-mono text-sm">
                NC_ID | NC_NUMBER | ACTION_DESCRIPTION | PRIORITY | SCHEDULED_COMPLETION_DATE | STATUS
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Usa <span className="font-medium">NC_ID</span> si lo tienes disponible. Si no, puedes usar <span className="font-medium">NC_NUMBER</span> para buscar la no conformidad.
              </p>
            </AlertDescription>
          </Alert>

          {result && (
            <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <p className={result.success ? 'font-semibold text-green-900' : 'font-semibold text-red-900'}>
                  {result.message}
                </p>
                {result.created !== undefined ? <p className="mt-1 text-sm">Procesadas: {result.created}</p> : null}
                {result.updated !== undefined ? <p className="mt-1 text-sm">Actualizadas: {result.updated}</p> : null}
                {result.failed !== undefined ? <p className="mt-1 text-sm">Fallidas: {result.failed}</p> : null}
                {result.error ? <p className="mt-1 text-sm text-red-700">{result.error}</p> : null}
              </AlertDescription>
            </Alert>
          )}

          {isImporting && (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando archivo...
            </div>
          )}

          <Button variant="outline" className="w-full" type="button" onClick={() => fileInputRef.current?.click()}>
            Seleccionar archivo Excel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
