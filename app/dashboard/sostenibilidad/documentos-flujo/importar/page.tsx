'use client';

import Link from 'next/link';
import { useRef, useState, type DragEvent } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Download, Loader2, Upload } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ImportResult = {
  success: boolean;
  message: string;
  imported?: number;
  updated?: number;
  failed?: number;
  error?: string;
};

type ImportRow = {
  title: string;
  description: string;
  category: string;
  documentType: string;
  status: string;
  fileUrl: string;
  fileSizeMb: number | null;
  fileMimeType: string;
};

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

function readCell(row: Record<string, unknown>, aliases: string[]) {
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

function normalizeStatus(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'draft';
  if (['draft', 'borrador'].includes(text)) return 'draft';
  if (['submitted', 'pendiente_validador1', 'pendiente', 'under_review'].includes(text)) return 'submitted';
  if (['approved', 'aprobado_final', 'aprobado'].includes(text)) return 'approved';
  if (['rejected', 'rechazado'].includes(text)) return 'rejected';
  return 'draft';
}

function buildTemplateCsv() {
  const headers = [
    'TITLE',
    'DESCRIPTION',
    'CATEGORY',
    'DOCUMENT_TYPE',
    'STATUS',
    'FILE_URL',
    'FILE_SIZE_MB',
    'FILE_MIME_TYPE',
  ];
  const rows = [
    ['Procedimiento de seguridad', 'Control operacional de seguridad', 'sostenibilidad', 'procedure', 'draft', 'https://...', '1.2', 'application/pdf'],
    ['Matriz documental', 'Listado maestro de documentos', 'sostenibilidad', 'spreadsheet', 'submitted', '', '', ''],
  ];
  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export default function DocumentosFlujoImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-documentos-flujo.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const loadExistingDocuments = async () => {
    const response = await fetch('/api/sostenibilidad/documentos-flujo', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    const records = Array.isArray(payload.data) ? payload.data : [];
    const map = new Map<string, any>();

    for (const record of records) {
      const key = normalizeKey(
        [record?.title || record?.documento_nombre || '', record?.category || '', record?.document_type || ''].join('|')
      );
      if (key) map.set(key, record);
    }

    return map;
  };

  const parseFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.csv')) {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (rows.length === 0) return [];

      const headers = rows[0].split(';').map((value) => value.replace(/^"|"$/g, '').trim());
      return rows.slice(1).map((line) => {
        const cells = line.split(';').map((value) => value.replace(/^"|"$/g, '').trim());
        const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
        return row as Record<string, unknown>;
      });
    }

    const xlsx = (await import('xlsx')) as any;
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];
    return xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
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
      const existingDocs = await loadExistingDocuments();
      const rows = await parseFile(file);
      let imported = 0;
      let updated = 0;
      let failed = 0;

      for (const row of rows) {
        const parsed: ImportRow = {
          title: readCell(row, ['TITLE', 'TITULO', 'NOMBRE', 'DOCUMENTO_NOMBRE']),
          description: readCell(row, ['DESCRIPTION', 'DESCRIPCION']),
          category: readCell(row, ['CATEGORY', 'CATEGORIA']) || 'sostenibilidad',
          documentType: readCell(row, ['DOCUMENT_TYPE', 'TIPO_DOCUMENTO']) || 'document',
          status: normalizeStatus(readCell(row, ['STATUS', 'ESTADO'])),
          fileUrl: readCell(row, ['FILE_URL', 'ARCHIVO_URL']),
          fileSizeMb: (() => {
            const raw = readCell(row, ['FILE_SIZE_MB', 'TAMANO_ARCHIVO_MB']);
            const value = Number(raw);
            return Number.isFinite(value) ? value : null;
          })(),
          fileMimeType: readCell(row, ['FILE_MIME_TYPE', 'TIPO_MIME']) || '',
        };

        if (!parsed.title) {
          failed += 1;
          continue;
        }

        const lookupKey = normalizeKey([parsed.title, parsed.category, parsed.documentType].join('|'));
        const existing = existingDocs.get(lookupKey);

        const payload = {
          title: parsed.title,
          description: parsed.description || null,
          category: parsed.category,
          document_type: parsed.documentType,
          status: parsed.status,
          file_url: parsed.fileUrl || null,
          file_size_mb: parsed.fileSizeMb,
          file_mime_type: parsed.fileMimeType || null,
        };

        const response = await fetch('/api/sostenibilidad/documentos-flujo', {
          method: existing ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(existing ? { id: existing.id, ...payload } : payload),
        });

        if (!response.ok) {
          failed += 1;
          continue;
        }

        if (existing) {
          updated += 1;
        } else {
          imported += 1;
        }
      }

      setResult({
        success: failed === 0,
        message: failed === 0 ? 'Documentos importados correctamente' : 'Importacion terminada con observaciones',
        imported,
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
          <h1 className="text-3xl font-bold">Importar flujo documental</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Carga o actualiza documentos y su estado de aprobación desde Excel para mantener la base viva.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button asChild>
            <Link href="/dashboard/sostenibilidad/documentos-flujo">
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
                TITLE | DESCRIPTION | CATEGORY | DOCUMENT_TYPE | STATUS | FILE_URL | FILE_SIZE_MB | FILE_MIME_TYPE
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Si existe un documento con la misma combinación de título, categoría y tipo, se actualiza.
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
                {result.imported !== undefined ? <p className="mt-1 text-sm">Importados: {result.imported}</p> : null}
                {result.updated !== undefined ? <p className="text-sm">Actualizados: {result.updated}</p> : null}
                {result.failed !== undefined ? <p className="text-sm">Fallidos: {result.failed}</p> : null}
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
        </CardContent>
      </Card>
    </div>
  );
}
