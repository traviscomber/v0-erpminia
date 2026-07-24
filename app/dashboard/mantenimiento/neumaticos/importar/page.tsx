'use client';

import Link from 'next/link';
import { useRef, useState, type DragEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PreviewRow = {
  partCode: string;
  partName: string;
  familia: string;
  equipo: string;
  stock: number;
  unitCost: number;
};

type ImportResult = {
  success: boolean;
  message: string;
  total?: number;
  inserted?: number;
  updated?: number;
  error?: string;
};

// ---------------------------------------------------------------------------
// Template data — matches the real Chilean mining XLS format
// ---------------------------------------------------------------------------

function buildTemplateXlsxB64(): string {
  // We generate a plain CSV that Excel opens correctly with ; separator
  const headers = ['CODIGO', 'FAMILIA', 'SUB_FAMILIA', 'EQUIPO', 'PRODUCTO', 'STOCK', 'VALOR_UNITARIO', 'VALOR'];
  const rows: (string | number)[][] = [
    ['NEU-018R25-K001', 'Neumaticos', 'Llantas OTR', 'Camion 930E', 'Neumatico 18.00R25 Michelin XDR3', 8, 1850000, 14800000],
    ['NEU-027R49-K001', 'Neumaticos', 'Llantas OTR', 'Camion Komatsu 860E', 'Neumatico 27.00R49 Bridgestone VSDP', 4, 4200000, 16800000],
    ['NEU-018R25-C001', 'Neumaticos', 'Llantas OTR', 'Excavadora CAT 390', 'Neumatico 18.00R25 Goodyear RL4K+', 6, 1920000, 11520000],
    ['NEU-023R25-M001', 'Neumaticos', 'Llantas', 'Motoniveladora CAT 16M', 'Neumatico 23.5R25 Titan LD400', 10, 980000, 9800000],
    ['NEU-014R24-G001', 'Neumaticos', 'Llantas', 'Grua Grove RT890E', 'Neumatico 14.00R24 Continental', 3, 780000, 2340000],
    ['NEU-024R35-P001', 'Neumaticos', 'Llantas OTR', 'Pala electrica P&H 2300XPC', 'Neumatico 24.00R35 Michelin XDM2', 0, 3100000, 0],
    ['LLANTA-700R16-C001', 'Llantas', 'Llantas Livianas', 'Camioneta Toyota Hilux', 'Llanta 265/65R17 BF Goodrich AT', 16, 185000, 2960000],
    ['NEU-012R20-CO001', 'Neumaticos', 'Llantas', 'Compresor Atlas Copco XRXS', 'Neumatico 12.00R20 Goodyear', 4, 420000, 1680000],
  ];

  const csvContent = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  return csvContent;
}

function downloadTemplate() {
  const csv = buildTemplateXlsxB64();
  const bom = '\uFEFF'; // UTF-8 BOM so Excel opens with correct encoding
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-neumaticos.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function NeumaticosImportPage() {
  const [dragActive, setDragActive]       = useState(false);
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [preview, setPreview]             = useState<PreviewRow[] | null>(null);
  const [previewTotal, setPreviewTotal]   = useState(0);
  const [isPreviewing, setIsPreviewing]   = useState(false);
  const [isImporting, setIsImporting]     = useState(false);
  const [result, setResult]               = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSelectedFile(null);
    setPreview(null);
    setPreviewTotal(0);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadPreview = async (file: File) => {
    const valid =
      file.name.toLowerCase().endsWith('.csv') ||
      file.name.toLowerCase().endsWith('.xls') ||
      file.name.toLowerCase().endsWith('.xlsx');

    if (!valid) {
      setResult({ success: false, message: 'Formato no valido. Usa CSV, XLS o XLSX.' });
      return;
    }

    setIsPreviewing(true);
    setPreview(null);
    setResult(null);
    setSelectedFile(file);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('preview', '1');

      const res = await fetch('/api/maintenance/neumaticos/import', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setResult({ success: false, message: payload?.error || 'No se pudo leer el archivo' });
        setSelectedFile(null);
        return;
      }

      setPreview(payload.preview ?? []);
      setPreviewTotal(payload.total ?? 0);
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Error al leer el archivo' });
      setSelectedFile(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const confirmImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);

      const res = await fetch('/api/maintenance/neumaticos/import', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.error || 'No se pudo importar');
      }

      setResult({
        success: true,
        message: payload.message,
        total:    payload.total,
        inserted: payload.inserted,
        updated:  payload.updated,
      });
      setPreview(null);
      setSelectedFile(null);
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Error al importar' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await loadPreview(file);
  };

  const formatCLP = (n: number) =>
    n > 0
      ? '$' + Math.round(n).toLocaleString('es-CL')
      : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar neumaticos</h1>
          <p className="mt-1 text-muted-foreground">
            Carga un archivo XLS/CSV con el inventario de llantas desde faena. Los registros se
            actualizan en bodega y aparecen automaticamente en el tablero.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0 gap-2">
          <Link href="/dashboard/mantenimiento/neumaticos">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Drop zone */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Cargar archivo
            </CardTitle>
            <CardDescription>
              Acepta XLS, XLSX y CSV con separador punto y coma. Columnas requeridas:{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">CODIGO</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">PRODUCTO</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">STOCK</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedFile && !preview && (
              <div
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background/50 hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                {isPreviewing ? (
                  <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                ) : (
                  <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                )}
                <p className="font-medium text-foreground">
                  {isPreviewing ? 'Leyendo archivo...' : 'Arrastra tu archivo aqui'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">o usa el boton para seleccionar</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button
                    variant="default"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPreviewing}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Seleccionar archivo
                  </Button>
                  <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                    <Download className="h-4 w-4" />
                    Plantilla CSV
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void loadPreview(file);
                  }}
                />
              </div>
            )}

            {/* Preview table */}
            {preview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando{' '}
                    <span className="font-semibold text-foreground">{preview.length}</span> de{' '}
                    <span className="font-semibold text-foreground">{previewTotal}</span> filas detectadas
                  </p>
                  <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                    Cambiar archivo
                  </Button>
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Codigo</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">Equipo</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Stock</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">V. Unit.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr
                            key={row.partCode}
                            className={`border-b border-border/50 last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                          >
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.partCode}</td>
                            <td className="px-3 py-2 text-foreground">{row.partName}</td>
                            <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                              {row.equipo || '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Badge variant={row.stock === 0 ? 'destructive' : 'secondary'}>
                                {row.stock}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">
                              {formatCLP(row.unitCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {previewTotal > preview.length && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {previewTotal - preview.length} filas mas no mostradas en preview
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <Button variant="outline" onClick={reset} disabled={isImporting}>
                    Cancelar
                  </Button>
                  <Button onClick={confirmImport} disabled={isImporting} className="gap-2 min-w-[140px]">
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmar importacion ({previewTotal})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <p className="font-medium">{result.message}</p>
                  {result.success && (
                    <div className="mt-1 flex flex-wrap gap-3 text-sm">
                      <span>Total: <strong>{result.total}</strong></span>
                      <span>Nuevos: <strong>{result.inserted}</strong></span>
                      <span>Actualizados: <strong>{result.updated}</strong></span>
                    </div>
                  )}
                  {result.success && (
                    <Button asChild size="sm" variant="outline" className="mt-3 gap-2">
                      <Link href="/dashboard/mantenimiento/neumaticos">
                        Ver tablero
                      </Link>
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: format guide */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Columnas del archivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { col: 'CODIGO',         req: true,  desc: 'Codigo unico del neumatico' },
                { col: 'PRODUCTO',       req: true,  desc: 'Nombre / descripcion' },
                { col: 'STOCK',          req: true,  desc: 'Cantidad en bodega' },
                { col: 'FAMILIA',        req: false, desc: 'Neumaticos / Llantas' },
                { col: 'EQUIPO',         req: false, desc: 'Maquina o vehiculo' },
                { col: 'VALOR_UNITARIO', req: false, desc: 'Precio por unidad (CLP)' },
                { col: 'VALOR',          req: false, desc: 'Valor total de la linea' },
                { col: 'SUB_FAMILIA',    req: false, desc: 'OTR / Llantas livianas' },
              ].map(({ col, req, desc }) => (
                <div key={col} className="flex items-start gap-2">
                  <code className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-mono ${req ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {col}
                  </code>
                  <span className="text-muted-foreground leading-snug">{desc}</span>
                  {req && <span className="ml-auto shrink-0 text-xs text-primary">req.</span>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notas de importacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Si el codigo ya existe, <strong className="text-foreground">actualiza</strong> stock y precio. Si no existe, <strong className="text-foreground">crea</strong> el registro.</p>
              <p>El separador del CSV debe ser punto y coma <code className="rounded bg-muted px-1 text-xs">;</code> (formato chileno Excel).</p>
              <p>Los codigos que no empiecen con <code className="rounded bg-muted px-1 text-xs">NEU-</code> o <code className="rounded bg-muted px-1 text-xs">LLANTA-</code> se prefijarán automaticamente.</p>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={downloadTemplate} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Descargar plantilla CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
