'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type DragEvent, type RefObject } from 'react';
import { AlertCircle, ArrowLeft, Download, Loader2, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ImportMode = 'audits' | 'events';

type ImportResult = {
  success: boolean;
  message: string;
  imported?: number;
  updated?: number;
  error?: string;
};

function buildTemplateCsv(mode: ImportMode) {
  if (mode === 'audits') {
    const headers = ['AUDIT_NAME', 'CATEGORY', 'COMPLIANCE_STATUS', 'AUDITOR', 'EVIDENCE_COUNT'];
    const rows = [
      ['Auditoría ISO 45001 julio', 'ISO', 'in_progress', 'Maria Perez', '3'],
      ['Revisión SERNAGEOMIN Q3', 'SERNAGEOMIN', 'compliant', 'Carlos Diaz', '5'],
    ];
    return [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
  }

  const headers = ['TITLE', 'DESCRIPTION', 'EVENT_TYPE', 'DUE_DATE', 'FREQUENCY', 'NEXT_DATE', 'STATUS'];
  const rows = [
    ['Revisión legal de permisos', 'Control mensual de vencimientos', 'legal', '2026-07-15', 'monthly', '2026-08-15', 'pending'],
    ['Auditoría interna HSE', 'Preparación de hallazgos y evidencia', 'audit', '2026-07-20', 'quarterly', '2026-10-20', 'completed'],
  ];

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export default function ComplianceImportPage() {
  const [activeMode, setActiveMode] = useState<ImportMode>('audits');
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<Record<ImportMode, ImportResult | null>>({
    audits: null,
    events: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentResult = result[activeMode];
  const modeTitle = useMemo(() => (activeMode === 'audits' ? 'auditorías de cumplimiento' : 'eventos de cumplimiento'), [activeMode]);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv(activeMode)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = activeMode === 'audits' ? 'plantilla-auditorías-compliance.csv' : 'plantilla-eventos-compliance.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const uploadFile = async (file: File) => {
    const valid =
      file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');
    if (!valid) {
      setResult((current) => ({
        ...current,
        [activeMode]: { success: false, message: 'Solo aceptamos CSV, XLS o XLSX', error: 'Formato no válido' },
      }));
      return;
    }

    setIsImporting(true);
    setResult((current) => ({ ...current, [activeMode]: null }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = activeMode === 'audits' ? '/api/sostenibilidad/audit-sessions' : '/api/sostenibilidad/compliance-events';
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'No fue posible procesar el archivo');
      }

      setResult((current) => ({
        ...current,
        [activeMode]: {
          success: true,
          message: payload.message || `Importación completada para ${modeTitle}`,
          imported: payload.imported,
          updated: payload.updated,
        },
      }));
    } catch (error) {
      setResult((current) => ({
        ...current,
        [activeMode]: {
          success: false,
          message: error instanceof Error ? error.message : 'No fue posible procesar el archivo',
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
      }));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar compliance</h1>
          <p className="mt-2 text-muted-foreground">
            Carga auditorías y eventos de cumplimiento desde CSV/XLS/XLSX usando los mismos contratos reales del módulo.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/sostenibilidad/compliance">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as ImportMode)}>
        <TabsList>
          <TabsTrigger value="audits">Auditorías</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="audits" className="mt-4">
          <ImportPanel
            title="Importar auditorías de cumplimiento"
            description="Carga auditorías ISO 45001, SERNAGEOMIN u otras revisiones de cumplimiento."
            activeMode="audits"
            modeTitle={modeTitle}
            downloadTemplate={downloadTemplate}
            fileInputRef={fileInputRef}
            dragActive={dragActive}
            isImporting={isImporting}
            onDragActiveChange={setDragActive}
            onDrop={handleDrop}
            onUpload={() => fileInputRef.current?.click()}
            onFileSelected={uploadFile}
            result={currentResult}
          />
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <ImportPanel
            title="Importar eventos de cumplimiento"
            description="Carga vencimientos legales, auditorías planificadas y controles programados desde Excel."
            activeMode="events"
            modeTitle={modeTitle}
            downloadTemplate={downloadTemplate}
            fileInputRef={fileInputRef}
            dragActive={dragActive}
            isImporting={isImporting}
            onDragActiveChange={setDragActive}
            onDrop={handleDrop}
            onUpload={() => fileInputRef.current?.click()}
            onFileSelected={uploadFile}
            result={currentResult}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImportPanel({
  title,
  description,
  activeMode,
  modeTitle,
  downloadTemplate,
  fileInputRef,
  dragActive,
  isImporting,
  onDragActiveChange,
  onDrop,
  onUpload,
  onFileSelected,
  result,
}: {
  title: string;
  description: string;
  activeMode: ImportMode;
  modeTitle: string;
  downloadTemplate: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  isImporting: boolean;
  onDragActiveChange: (value: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => Promise<void>;
  onUpload: () => void;
  onFileSelected: (file: File) => Promise<void>;
  result: ImportResult | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-border/70 bg-card/80 md:col-span-2">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              onDragActiveChange(true);
            }}
            onDragLeave={() => onDragActiveChange(false)}
            onDrop={onDrop}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border bg-background/50'
            }`}
          >
            <Upload className="mx-auto mb-3 h-10 w-10 text-primary" />
            <p className="font-medium">Arrastra tu archivo aqui o usa el selector</p>
            <p className="mt-1 text-sm text-muted-foreground">Acepta CSV, XLS y XLSX.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Plantilla Excel
              </Button>
              <Button variant="outline" onClick={onUpload} className="gap-2">
                <Upload className="h-4 w-4" />
                Seleccionar archivo
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFileSelected(file);
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={downloadTemplate} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Descargar plantilla
            </Button>
            {isImporting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando {modeTitle}...
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Formato esperado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {activeMode === 'audits' ? (
            <>
              <p>Campos obligatorios: `AUDIT_NAME`.</p>
              <p>Campos recomendados: `CATEGORY`, `COMPLIANCE_STATUS`, `AUDITOR`, `EVIDENCE_COUNT`.</p>
              <p>Si repites auditoría y categoría, el sistema actualiza el registro existente.</p>
            </>
          ) : (
            <>
              <p>Campos obligatorios: `TITLE`, `EVENT_TYPE`, `DUE_DATE`.</p>
              <p>Campos recomendados: `DESCRIPTION`, `FREQUENCY`, `NEXT_DATE`, `STATUS`.</p>
              <p>Si repites titulo, tipo y fecha, el sistema actualiza el evento existente.</p>
            </>
          )}
        </CardContent>
      </Card>

      {result ? (
        <Alert variant={result.success ? 'default' : 'destructive'} className="md:col-span-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p>{result.message}</p>
              {result.success ? (
                <div className="text-sm">
                  <p>Importados: {result.imported || 0}</p>
                  <p>Actualizados: {result.updated || 0}</p>
                </div>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}


