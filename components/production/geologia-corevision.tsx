'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const API = '/api/produccion/geologia/corevision';

type CoreImage = {
  id: string;
  hole_code: string | null;
  from_m: number | null;
  to_m: number | null;
  status: string;
  created_at: string;
  scale_present: boolean;
  depth_label_visible: boolean;
  focus_confirmed: boolean;
  uniform_light_confirmed: boolean;
  analysis?: any;
  review?: any;
};

export function GeologiaCoreVision() {
  const [payload, setPayload] = useState<any>({ images: [], holes: [], policy: null, canWrite: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drillHoleId, setDrillHoleId] = useState('');
  const [fromM, setFromM] = useState('');
  const [toM, setToM] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('Celular / cámara de terreno');
  const [illuminationProfile, setIlluminationProfile] = useState('Luz uniforme, sin reflejo directo');
  const [checks, setChecks] = useState({ scale: false, depth: false, focus: false, light: false });

  async function refresh() {
    setLoading(true);
    const response = await fetch(API, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setError(json.error || 'No fue posible cargar CoreVision');
    else {
      setPayload(json);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!selected) { setPreview(null); return; }
    const url = URL.createObjectURL(selected);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selected]);

  const captureReady = checks.focus && checks.light;
  const validatedExamples = useMemo(() => (payload.images || []).filter((image: CoreImage) => image.status === 'validated').length, [payload.images]);

  async function upload() {
    if (!selected) return;
    setBusy('upload'); setError(null);
    const form = new FormData();
    form.set('image', selected);
    if (drillHoleId) form.set('drillHoleId', drillHoleId);
    form.set('fromM', fromM);
    form.set('toM', toM);
    form.set('deviceLabel', deviceLabel);
    form.set('illuminationProfile', illuminationProfile);
    form.set('scalePresent', String(checks.scale));
    form.set('depthLabelVisible', String(checks.depth));
    form.set('focusConfirmed', String(checks.focus));
    form.set('uniformLightConfirmed', String(checks.light));
    form.set('capturedAt', new Date().toISOString());
    const response = await fetch(API, { method: 'POST', body: form });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setError(json.error || 'No fue posible guardar la imagen');
    else {
      setSelected(null); setFromM(''); setToM('');
      setChecks({ scale: false, depth: false, focus: false, light: false });
      await refresh();
    }
    setBusy(null);
  }

  async function action(imageId: string, actionName: 'analyze' | 'review', extra: any = {}) {
    setBusy(`${actionName}:${imageId}`); setError(null);
    const response = await fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionName, imageId, ...extra }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setError(json.error || 'No fue posible completar la acción');
    else await refresh();
    setBusy(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">MOTIL CoreVision</p>
        <h2 className="text-2xl font-semibold tracking-tight">Interpretación visual asistida de testigos</h2>
        <p className="mt-1 max-w-4xl text-sm text-muted-foreground">Captura una imagen controlada, compárala con fotografías históricas validadas por geólogos y recibe observaciones visuales explicables. El análisis nunca reemplaza el logging ni se convierte automáticamente en dato canónico.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Imágenes" value={(payload.images || []).length} note="evidencia visual registrada" />
        <Metric label="Ejemplos validados" value={validatedExamples} note="pueden alimentar analogías" />
        <Metric label="Revisión humana" value="Obligatoria" note="antes de usar una etiqueta" />
        <Metric label="Confianza IA" value="Visual" note="no es probabilidad geológica" />
      </div>

      {error ? <div className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>1. Capturar muestra</CardTitle>
          <CardDescription>Ideal: celular Pro o cámara fija perpendicular, iluminación difusa uniforme, escala y profundidad visibles.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="corevision-image">Foto del testigo o muestra</Label>
              <Input id="corevision-image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={!payload.canWrite} onChange={(event) => setSelected(event.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">JPEG, PNG o WebP · máximo 12 MB. En móvil abre la cámara trasera.</p>
            </div>
            {preview ? <img src={preview} alt="Vista previa de la muestra" className="max-h-[420px] w-full object-contain bg-muted" /> : <div className="flex min-h-52 items-center justify-center bg-muted/40 text-sm text-muted-foreground">Vista previa</div>}
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Sondaje</Label><select className="h-10 w-full border bg-background px-3 text-sm" value={drillHoleId} onChange={(e) => setDrillHoleId(e.target.value)}><option value="">Sin asociar</option>{(payload.holes || []).map((hole: any) => <option key={hole.id} value={hole.id}>{hole.hole_code}</option>)}</select></div>
              <div className="space-y-2"><Label>Equipo</Label><Input value={deviceLabel} onChange={(e) => setDeviceLabel(e.target.value)} /></div>
              <div className="space-y-2"><Label>Desde (m)</Label><Input inputMode="decimal" value={fromM} onChange={(e) => setFromM(e.target.value)} /></div>
              <div className="space-y-2"><Label>Hasta (m)</Label><Input inputMode="decimal" value={toM} onChange={(e) => setToM(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Iluminación</Label><Input value={illuminationProfile} onChange={(e) => setIlluminationProfile(e.target.value)} /></div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Check checked={checks.light} onChange={(value) => setChecks((c) => ({ ...c, light: value }))} label="Iluminación uniforme" />
              <Check checked={checks.focus} onChange={(value) => setChecks((c) => ({ ...c, focus: value }))} label="Imagen nítida / foco confirmado" />
              <Check checked={checks.scale} onChange={(value) => setChecks((c) => ({ ...c, scale: value }))} label="Escala visible" />
              <Check checked={checks.depth} onChange={(value) => setChecks((c) => ({ ...c, depth: value }))} label="Código/profundidad visible" />
            </div>
            <Button disabled={!payload.canWrite || !selected || !captureReady || busy === 'upload'} onClick={() => void upload()}>{busy === 'upload' ? 'Guardando…' : 'Guardar evidencia visual'}</Button>
            {!captureReady ? <p className="text-xs text-muted-foreground">Para analizar, MOTIL exige al menos iluminación uniforme y foco confirmados.</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Analizar y comparar</CardTitle>
          <CardDescription>CoreVision utiliza sólo imágenes validadas por un geólogo como ejemplos históricos. Si aún no existen, analiza la foto sin inventar analogías.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">Cargando evidencia visual…</p> : null}
          {!loading && !(payload.images || []).length ? <p className="text-sm text-muted-foreground">Aún no hay fotografías. La primera captura inicia la biblioteca visual de La Patagua.</p> : null}
          {(payload.images || []).map((image: CoreImage) => <ImageReview key={image.id} image={image} canWrite={payload.canWrite} busy={busy} action={action} />)}
        </CardContent>
      </Card>

      <div className="border-l-2 pl-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Límite de interpretación</p>
        <p>Una coincidencia visual puede sugerir un análogo para revisar. No demuestra litología definitiva, ley, continuidad, control estructural, dominio, recurso ni reserva. La promoción a etiqueta histórica requiere validación humana explícita.</p>
      </div>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>;
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex items-center gap-2 border p-3"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

function ImageReview({ image, canWrite, busy, action }: { image: CoreImage; canWrite: boolean; busy: string | null; action: (id: string, name: 'analyze' | 'review', extra?: any) => Promise<void> }) {
  const [comment, setComment] = useState('');
  const analysis = image.analysis;
  const observations = analysis?.visual_observations || {};
  return (
    <div className="border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-medium">{image.hole_code || 'Muestra sin sondaje'} · {image.from_m ?? '?'}–{image.to_m ?? '?'} m</p><p className="text-xs text-muted-foreground">{new Date(image.created_at).toLocaleString('es-CL')} · estado: {image.status}</p></div>
        {!analysis ? <Button size="sm" disabled={!canWrite || busy === `analyze:${image.id}` || !image.focus_confirmed || !image.uniform_light_confirmed} onClick={() => void action(image.id, 'analyze')}>{busy === `analyze:${image.id}` ? 'Analizando…' : 'Analizar con CoreVision'}</Button> : null}
      </div>

      {analysis ? <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Section title="Observaciones visuales" items={[...(observations.lithology_candidates || []), ...(observations.alteration_candidates || []), ...(observations.mineralization_candidates || []), ...(observations.structures || []), ...(observations.textures || [])]} />
          <Section title="Evidencia que apoya" items={analysis.evidence_for || []} />
          <Section title="Evidencia que contradice" items={analysis.evidence_against || []} />
          <Section title="Evidencia faltante" items={analysis.missing_evidence || []} />
        </div>
        <div className="space-y-3">
          <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Interpretación sugerida para revisar</p><p className="mt-1 text-sm">{analysis.suggested_interpretation || 'Sin interpretación suficiente.'}</p></div>
          <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confianza visual del modelo</p><p className="mt-1 text-sm">{analysis.classification_confidence == null ? 'No informada' : `${Math.round(Number(analysis.classification_confidence) * 100)}%`} <span className="text-muted-foreground">· no es probabilidad geológica</span></p></div>
          <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Análogos históricos validados</p>{(analysis.analogs || []).length ? <div className="mt-1 space-y-1">{analysis.analogs.map((a: any, index: number) => <p key={index} className="text-sm">{a.hole_code || 's/d'} {a.interval || ''} · {Math.round(Number(a.visual_similarity_score || 0) * 100)}% visual · {a.reason}</p>)}</div> : <p className="mt-1 text-sm text-muted-foreground">Sin análogos validados suficientes.</p>}</div>
          {!image.review ? <div className="space-y-2 pt-2"><Label>Comentario del geólogo</Label><Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Qué confirmas, corriges o descartas…" /><div className="flex flex-wrap gap-2"><Button size="sm" disabled={!canWrite || busy === `review:${image.id}`} onClick={() => void action(image.id, 'review', { decision: 'validated', analysisId: analysis.id, comment, canonicalLabels: observations })}>Validar como ejemplo histórico</Button><Button size="sm" variant="outline" disabled={!canWrite || busy === `review:${image.id}`} onClick={() => void action(image.id, 'review', { decision: 'edited', analysisId: analysis.id, comment, canonicalLabels: observations })}>Validar con corrección</Button><Button size="sm" variant="ghost" disabled={!canWrite || busy === `review:${image.id}`} onClick={() => void action(image.id, 'review', { decision: 'rejected', analysisId: analysis.id, comment, canonicalLabels: {} })}>Rechazar análisis</Button></div></div> : <div className="border-l-2 pl-3 text-sm"><p className="font-medium">Revisión humana: {image.review.decision}</p><p className="text-muted-foreground">{image.review.geologist_comment || 'Sin comentario adicional.'}</p></div>}
        </div>
      </div> : null}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>{items?.length ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">Sin evidencia suficiente.</p>}</div>;
}
