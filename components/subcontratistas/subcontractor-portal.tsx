'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  AlertCircle,
  Building2,
  FileUp,
  Loader2,
  LogOut,
  Search,
  ShieldCheck,
  Upload,
  Users,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type PortalEecc = {
  id: string;
  name: string;
  rut: string;
  representative: string;
  email: string;
  phone: string;
  is_active: boolean;
  notes: string;
};

type PortalDoc = {
  id: string;
  slot_index: number;
  documento_nombre: string;
  file_name: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  l1_status: 'cumple' | 'no_cumple' | null;
  l1_observaciones: string | null;
  l2_status: 'cumple' | 'no_cumple' | null;
  l2_observaciones: string | null;
};

type PortalSession = {
  authenticated: boolean;
  session: {
    session_id: string;
    rut: string;
    rut_display: string;
    role: string;
  };
  eecc: PortalEecc | null;
  eecc_list: PortalEecc[];
  carpeta: {
    id: string;
    empresa_nombre: string;
    empresa_rut: string | null;
    contacto_email: string | null;
    status: string;
    submitted_at: string | null;
    created_at: string;
    carpeta_documentos: PortalDoc[];
  } | null;
  docs: PortalDoc[];
  required_documents: string[];
  uploaded_count: number;
  total_documents: number;
  can_upload: boolean;
  warning?: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error((payload && payload.error) || 'Error');
    throw error;
  }
  return payload as PortalSession;
};

function statusBadge(status: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'aprobado') {
    return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Aprobado</Badge>;
  }
  if (normalized === 'en_revision_l1' || normalized === 'en_revision_l2') {
    return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">En revision</Badge>;
  }
  if (normalized === 'rechazado') {
    return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Rechazado</Badge>;
  }
  return <Badge variant="outline">Pendiente</Badge>;
}

function LoginPanel({ onSuccess }: { onSuccess: () => void }) {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/portal/subcontratistas/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rut, password }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo iniciar sesion');
      }

      toast.success('Sesion iniciada');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/70 bg-card/90 shadow-xl shadow-black/20">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Portal para subcontratistas
        </div>
        <div>
          <CardTitle className="text-2xl">Ingreso por RUT</CardTitle>
          <CardDescription className="mt-2 text-base">
            Usa tu RUT y la clave <span className="font-semibold">lapatagua</span> + los 4 digitos antes del guion.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={submitLogin} className="space-y-4">
          {error ? (
            <div className="flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="rut">RUT</Label>
            <Input
              id="rut"
              placeholder="12.345.678-9"
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Clave</Label>
            <Input
              id="password"
              type="password"
              placeholder="lapatagua5678"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Solo necesitas el RUT y la clave generada para tu empresa.
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Entrar al portal
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PortalDocRow({
  doc,
  carpetaId,
  onUploaded,
}: {
  doc: PortalDoc;
  carpetaId: string;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const uploadFile = async (file: File) => {
    if (!carpetaId) {
      toast.error('No hay una carpeta disponible para subir documentos');
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slot_index', String(doc.slot_index));

      const response = await fetch(`/api/portal/subcontratistas/carpeta/${carpetaId}/upload-doc`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo subir el archivo');
      }

      toast.success(`Documento ${doc.slot_index} cargado`);
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-colors',
      doc.file_name ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-background/60'
    )}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {doc.slot_index}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-sm leading-snug">{doc.documento_nombre}</p>
              <p className="text-xs text-muted-foreground">
                {doc.file_name ? doc.file_name : 'Pendiente por cargar'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {doc.file_name ? (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Cargado</Badge>
            ) : (
              <Badge variant="outline">Pendiente</Badge>
            )}
            {statusBadge(doc.l1_status || doc.l2_status || 'pendiente')}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/60">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {carpetaId ? (uploading ? 'Subiendo...' : 'Cargar archivo') : 'Sin carpeta'}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              disabled={!carpetaId || uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  uploadFile(file);
                }
              }}
            />
          </label>
          {fileName ? (
            <span className="text-xs text-muted-foreground">Archivo: {fileName}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PortalContent({
  session,
  onRefresh,
}: {
  session: PortalSession;
  onRefresh: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const eeccFiltered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return session.eecc_list;

    return session.eecc_list.filter((item) =>
      [item.name, item.rut, item.representative, item.email, item.phone]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [search, session.eecc_list]);

  const submitCarpeta = async () => {
    if (!session.carpeta?.id) return;
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/portal/subcontratistas/carpeta/${session.carpeta.id}/submit`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo enviar la carpeta');
      }

      toast.success('Carpeta enviada a revision');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar la carpeta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/portal/subcontratistas/logout', {
      method: 'POST',
      credentials: 'include',
    });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Portal de subcontratistas</CardTitle>
                <CardDescription>
                  RUT {session.session.rut_display} - {session.eecc?.name || 'EECC'}
                </CardDescription>
              </div>
              <Button variant="outline" className="gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Documentos cargados</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {session.uploaded_count}/{session.total_documents}
              </p>
              <Progress value={(session.uploaded_count / session.total_documents) * 100} className="mt-3" />
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado de carpeta</p>
              <div className="mt-2">{statusBadge(session.carpeta?.status || 'pendiente')}</div>
              <p className="mt-3 text-sm text-muted-foreground">
                {session.carpeta ? 'La carpeta ya esta lista para continuar.' : 'No se pudo crear la carpeta todavia.'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Accion</p>
              <p className="mt-2 text-sm font-medium">Sube documentos y envialos a revision cuando termines.</p>
              <Button
                className="mt-3 w-full gap-2"
                disabled={!session.carpeta || session.carpeta.status !== 'pendiente' || submitting}
                onClick={submitCarpeta}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Enviar a revision
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle className="text-lg">Datos de la empresa</CardTitle>
            <CardDescription>La informacion se toma desde la EECC asociada al RUT.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{session.eecc?.name || 'Sin empresa'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{session.eecc?.representative || 'Sin representante'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              <span>{session.eecc?.rut || session.session.rut_display}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4" />
              <span>{session.eecc?.email || 'Sin correo'}</span>
            </div>
            {session.warning ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                {session.warning}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documentos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[520px]">
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="eecc">EECC</TabsTrigger>
          <TabsTrigger value="estado">Estado</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="space-y-4">
          <Card className="border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle>Subida de documentos</CardTitle>
              <CardDescription>
                Carga los documentos requeridos uno por uno. El avance se guarda en linea.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!session.carpeta ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  No se pudo crear la carpeta todavia. Revisa que la EECC tenga correo de contacto.
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {session.uploaded_count} de {session.total_documents} documentos cargados
                </div>
                <div className="text-sm font-medium text-primary">
                  {Math.round((session.uploaded_count / session.total_documents) * 100)}%
                </div>
              </div>

              <div className="space-y-3">
                {session.docs.map((doc) => (
                  <PortalDocRow
                    key={doc.id}
                    doc={doc}
                    carpetaId={session.carpeta?.id || ''}
                    onUploaded={onRefresh}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eecc" className="space-y-4">
          <Card className="border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle>Listado de EECC</CardTitle>
              <CardDescription>
                Las empresas asociadas al RUT se muestran aqui para trazabilidad y control.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  {session.eecc_list.length} registro(s) encontrados para este RUT.
                </div>
                <div className="w-full md:w-80">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre, RUT o representante"
                  />
                </div>
              </div>

              <div className="grid gap-3">
                {eeccFiltered.map((eecc) => (
                  <div key={eecc.id} className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{eecc.name}</p>
                          {eecc.is_active ? (
                            <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Activa</Badge>
                          ) : (
                            <Badge variant="outline">Inactiva</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">RUT: {eecc.rut || '-'}</p>
                        <p className="text-sm text-muted-foreground">Representante: {eecc.representative || '-'}</p>
                      </div>
                      <div className="space-y-1 text-sm md:text-right">
                        <p>{eecc.email || 'Sin correo'}</p>
                        <p className="text-muted-foreground">{eecc.phone || 'Sin telefono'}</p>
                      </div>
                    </div>
                    {eecc.notes ? (
                      <p className="mt-3 text-sm text-muted-foreground">{eecc.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estado" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/70 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">RUT</span>
                  <span className="font-mono">{session.session.rut_display}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="font-medium">{session.eecc?.name || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Carpeta</span>
                  <span className="font-mono text-xs">{session.carpeta?.id || 'Sin carpeta'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base">Trazabilidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  La sesion usa una clave firmada y los archivos quedan asociados a un identificador UUID de portal.
                </p>
                <p className="text-muted-foreground">
                  El flujo reutiliza la carpeta de arranque para mantener una sola fuente de verdad.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base">Accion rapida</CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full gap-2" variant="outline" onClick={onRefresh}>
                  <FileUp className="h-4 w-4" />
                  Actualizar estado
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function SubcontractorPortal() {
  const { data, error, isLoading, mutate } = useSWR('/api/portal/subcontratistas/session', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const refresh = () => mutate();

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando portal...
      </div>
    );
  }

  if (error || !data?.authenticated) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-4 py-10">
        <div className="w-full space-y-4">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Portal de subcontratistas
            </div>
            <h1 className="text-3xl font-semibold text-balance">Ingreso simple por RUT</h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tu RUT y la clave generada para subir documentos.
            </p>
          </div>
          <LoginPanel onSuccess={refresh} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <PortalContent session={data} onRefresh={refresh} />
    </div>
  );
}
