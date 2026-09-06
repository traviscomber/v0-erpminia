export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const BUCKET = 'geology-core-images';
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.6-terra';
const ANALYSIS_VERSION = 'corevision_v1';

function safeJson(text: string) {
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(clean);
}

function extractResponseText(payload: any) {
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text.trim();
    }
  }
  return typeof payload?.output_text === 'string' ? payload.output_text.trim() : '';
}

function extensionFor(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function nullableNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function blobToDataUrl(blob: Blob) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
}

async function loadValidatedExemplars(context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>) {
  const { data: reviews } = await context.supabase
    .from('production_geology_core_image_reviews')
    .select('id,core_image_id,canonical_labels,geologist_comment,reviewed_at,decision')
    .eq('organization_id', context.organizationId)
    .in('decision', ['validated', 'edited'])
    .order('reviewed_at', { ascending: false })
    .limit(6);

  if (!reviews?.length) return [];
  const ids = reviews.map((row: any) => row.core_image_id);
  const { data: images } = await context.supabase
    .from('production_geology_core_images')
    .select('id,hole_code,from_m,to_m,storage_path,status')
    .eq('organization_id', context.organizationId)
    .in('id', ids)
    .eq('status', 'validated');

  const byId = new Map((images || []).map((row: any) => [row.id, row]));
  const output: any[] = [];
  for (const review of reviews) {
    const image: any = byId.get(review.core_image_id);
    if (!image) continue;
    const { data } = await context.supabase.storage.from(BUCKET).download(image.storage_path);
    if (!data) continue;
    output.push({
      review,
      image,
      dataUrl: await blobToDataUrl(data),
    });
  }
  return output;
}

async function analyzeImage(args: {
  targetDataUrl: string;
  target: any;
  exemplars: any[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en el servidor');

  const guardrails = `Eres MOTIL CoreVision, asistente visual para un geólogo profesional. Analiza SOLAMENTE lo que puede observarse razonablemente en fotografías de testigo/chips y compáralo con ejemplos históricos que hayan sido validados por geólogos. Una semejanza visual NO es identidad geológica, probabilidad geológica ni continuidad. No infieras ley, recurso, reserva, dominio, contacto, control estructural, geometría 3D ni continuidad espacial a partir de una foto. No conviertas una clasificación visual en dato canónico. Toda interpretación queda pendiente de validación humana. Busca también evidencia visual que contradiga la interpretación propuesta. Si la calidad fotográfica no permite una observación, decláralo. Devuelve JSON puro, sin markdown.`;

  const schema = `Devuelve exactamente un objeto con: visual_observations {lithology_candidates:string[], alteration_candidates:string[], mineralization_candidates:string[], structures:string[], textures:string[], image_quality_notes:string[]}, analogs [{historical_image_id:string,hole_code:string|null,interval:string|null,reason:string,visual_similarity_score:number}], evidence_for:string[], evidence_against:string[], missing_evidence:string[], suggested_interpretation:string, classification_confidence:number. Los scores deben estar entre 0 y 1 y describen sólo similitud/confianza visual del modelo.`;

  const content: any[] = [
    { type: 'input_text', text: `${guardrails}\n\n${schema}\n\nIMAGEN OBJETIVO: ${args.target.hole_code || 'sin sondaje'} ${args.target.from_m ?? '?'}-${args.target.to_m ?? '?'} m.` },
    { type: 'input_image', image_url: args.targetDataUrl, detail: 'high' },
  ];

  if (args.exemplars.length) {
    content.push({ type: 'input_text', text: 'EJEMPLOS HISTÓRICOS VALIDADOS POR GEÓLOGO. Úsalos sólo como analogías visuales, no como verdad transferible al objetivo.' });
    for (const exemplar of args.exemplars) {
      content.push({
        type: 'input_text',
        text: `historical_image_id=${exemplar.image.id}; sondaje=${exemplar.image.hole_code || 's/d'}; intervalo=${exemplar.image.from_m ?? '?'}-${exemplar.image.to_m ?? '?'} m; etiquetas humanas=${JSON.stringify(exemplar.review.canonical_labels || {})}; comentario=${exemplar.review.geologist_comment || ''}`,
      });
      content.push({ type: 'input_image', image_url: exemplar.dataUrl, detail: 'low' });
    }
  } else {
    content.push({ type: 'input_text', text: 'No existen todavía ejemplos históricos visuales validados. No inventes analogías; devuelve analogs=[].' });
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_GEOLOGY_VISION_MODEL || process.env.OPENAI_GEOLOGY_MODEL || DEFAULT_MODEL,
      input: [{ role: 'user', content }],
      reasoning: { effort: 'medium' },
      max_output_tokens: 2600,
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || `OpenAI respondió ${response.status}`);
  const text = extractResponseText(payload);
  if (!text) throw new Error('CoreVision no devolvió análisis utilizable');
  return { parsed: safeJson(text), model: payload?.model || DEFAULT_MODEL, responseId: payload?.id || null };
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [{ data: images, error }, { data: holes }] = await Promise.all([
    context.supabase
      .from('production_geology_core_images')
      .select('id,drill_hole_id,hole_code,from_m,to_m,original_filename,mime_type,captured_at,device_label,illumination_profile,scale_present,depth_label_visible,focus_confirmed,uniform_light_confirmed,status,created_at')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false })
      .limit(100),
    context.supabase
      .from('production_drill_holes')
      .select('id,hole_code')
      .eq('organization_id', context.organizationId)
      .order('hole_code', { ascending: true })
      .limit(1000),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const imageIds = (images || []).map((row: any) => row.id);
  let analyses: any[] = [];
  let reviews: any[] = [];
  if (imageIds.length) {
    const [analysisResult, reviewResult] = await Promise.all([
      context.supabase
        .from('production_geology_core_image_analyses')
        .select('id,core_image_id,model,analysis_version,visual_observations,analogs,evidence_for,evidence_against,missing_evidence,suggested_interpretation,visual_similarity_score,classification_confidence,created_at')
        .eq('organization_id', context.organizationId)
        .in('core_image_id', imageIds)
        .order('created_at', { ascending: false }),
      context.supabase
        .from('production_geology_core_image_reviews')
        .select('id,core_image_id,analysis_id,decision,canonical_labels,geologist_comment,reviewed_at')
        .eq('organization_id', context.organizationId)
        .in('core_image_id', imageIds)
        .order('reviewed_at', { ascending: false }),
    ]);
    analyses = analysisResult.data || [];
    reviews = reviewResult.data || [];
  }

  const latestAnalysis = new Map<string, any>();
  for (const row of analyses) if (!latestAnalysis.has(row.core_image_id)) latestAnalysis.set(row.core_image_id, row);
  const latestReview = new Map<string, any>();
  for (const row of reviews) if (!latestReview.has(row.core_image_id)) latestReview.set(row.core_image_id, row);

  return NextResponse.json({
    canWrite: access.canWrite,
    holes: holes || [],
    images: (images || []).map((row: any) => ({ ...row, analysis: latestAnalysis.get(row.id) || null, review: latestReview.get(row.id) || null })),
    policy: {
      visualOnly: true,
      humanValidationRequired: true,
      validatedExamplesOnly: true,
      confidenceMeaning: 'Confianza visual del modelo; no es probabilidad geológica.',
      canonicalWrite: 'Ningún resultado de CoreVision modifica automáticamente logging, ley, contactos, dominios, recursos o reservas.',
    },
  });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  const isUpload = contentType.includes('multipart/form-data');
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  if (isUpload) {
    const form = await request.formData();
    const file = form.get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Selecciona una imagen' }, { status: 400 });
    if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: 'Formato no soportado. Usa JPEG, PNG o WebP.' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'La imagen debe pesar menos de 12 MB' }, { status: 400 });

    const drillHoleId = typeof form.get('drillHoleId') === 'string' ? String(form.get('drillHoleId')) : '';
    let holeCode: string | null = null;
    if (drillHoleId) {
      const { data: hole } = await context.supabase
        .from('production_drill_holes')
        .select('id,hole_code')
        .eq('id', drillHoleId)
        .eq('organization_id', context.organizationId)
        .maybeSingle();
      if (!hole) return NextResponse.json({ error: 'Sondaje no pertenece a la organización' }, { status: 400 });
      holeCode = hole.hole_code;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const digest = createHash('sha256').update(bytes).digest('hex');
    const imageId = crypto.randomUUID();
    const storagePath = `${context.organizationId}/${imageId}-${digest.slice(0, 12)}.${extensionFor(file.type)}`;
    const { error: storageError } = await context.supabase.storage.from(BUCKET).upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

    const row = {
      id: imageId,
      organization_id: context.organizationId,
      drill_hole_id: drillHoleId || null,
      hole_code: holeCode,
      from_m: nullableNumber(form.get('fromM')),
      to_m: nullableNumber(form.get('toM')),
      storage_path: storagePath,
      original_filename: file.name.slice(0, 250),
      mime_type: file.type,
      byte_size: file.size,
      captured_at: typeof form.get('capturedAt') === 'string' && form.get('capturedAt') ? String(form.get('capturedAt')) : new Date().toISOString(),
      captured_by: context.userId,
      device_label: typeof form.get('deviceLabel') === 'string' ? String(form.get('deviceLabel')).slice(0, 160) : null,
      illumination_profile: typeof form.get('illuminationProfile') === 'string' ? String(form.get('illuminationProfile')).slice(0, 250) : null,
      scale_present: form.get('scalePresent') === 'true',
      depth_label_visible: form.get('depthLabelVisible') === 'true',
      focus_confirmed: form.get('focusConfirmed') === 'true',
      uniform_light_confirmed: form.get('uniformLightConfirmed') === 'true',
    };
    const { data, error } = await context.supabase.from('production_geology_core_images').insert(row).select('id,status,created_at').single();
    if (error) {
      await context.supabase.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ image: data }, { status: 201 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const imageId = typeof body?.imageId === 'string' ? body.imageId : '';
  if (!imageId) return NextResponse.json({ error: 'imageId requerido' }, { status: 400 });

  const { data: image } = await context.supabase
    .from('production_geology_core_images')
    .select('*')
    .eq('id', imageId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();
  if (!image) return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });

  if (action === 'analyze') {
    const qualityReady = image.uniform_light_confirmed && image.focus_confirmed;
    if (!qualityReady) return NextResponse.json({ error: 'Confirma iluminación uniforme y foco antes de analizar' }, { status: 400 });
    const { data: targetBlob, error: downloadError } = await context.supabase.storage.from(BUCKET).download(image.storage_path);
    if (downloadError || !targetBlob) return NextResponse.json({ error: downloadError?.message || 'No fue posible leer la imagen' }, { status: 500 });
    try {
      const exemplars = (await loadValidatedExemplars(context)).filter((row: any) => row.image.id !== image.id);
      const result = await analyzeImage({ targetDataUrl: await blobToDataUrl(targetBlob), target: image, exemplars });
      const parsed = result.parsed || {};
      const { data: analysis, error } = await context.supabase
        .from('production_geology_core_image_analyses')
        .insert({
          organization_id: context.organizationId,
          core_image_id: image.id,
          model: result.model,
          response_id: result.responseId,
          analysis_version: ANALYSIS_VERSION,
          visual_observations: parsed.visual_observations || {},
          analogs: Array.isArray(parsed.analogs) ? parsed.analogs : [],
          evidence_for: Array.isArray(parsed.evidence_for) ? parsed.evidence_for : [],
          evidence_against: Array.isArray(parsed.evidence_against) ? parsed.evidence_against : [],
          missing_evidence: Array.isArray(parsed.missing_evidence) ? parsed.missing_evidence : [],
          suggested_interpretation: typeof parsed.suggested_interpretation === 'string' ? parsed.suggested_interpretation : null,
          visual_similarity_score: null,
          classification_confidence: Number.isFinite(Number(parsed.classification_confidence)) ? Math.max(0, Math.min(1, Number(parsed.classification_confidence))) : null,
          created_by: context.userId,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      await context.supabase.from('production_geology_core_images').update({ status: 'in_review', updated_at: new Date().toISOString() }).eq('id', image.id).eq('organization_id', context.organizationId);
      return NextResponse.json({ analysis, exemplarCount: exemplars.length });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible analizar la imagen' }, { status: 502 });
    }
  }

  if (action === 'review') {
    const decision = body?.decision;
    if (!['validated', 'rejected', 'edited'].includes(decision)) return NextResponse.json({ error: 'Decisión de revisión inválida' }, { status: 400 });
    const analysisId = typeof body?.analysisId === 'string' ? body.analysisId : null;
    if (analysisId) {
      const { data: analysis } = await context.supabase
        .from('production_geology_core_image_analyses')
        .select('id')
        .eq('id', analysisId)
        .eq('core_image_id', image.id)
        .eq('organization_id', context.organizationId)
        .maybeSingle();
      if (!analysis) return NextResponse.json({ error: 'Análisis no pertenece a esta imagen' }, { status: 400 });
    }
    const canonicalLabels = body?.canonicalLabels && typeof body.canonicalLabels === 'object' ? body.canonicalLabels : {};
    const { data: review, error } = await context.supabase
      .from('production_geology_core_image_reviews')
      .insert({
        organization_id: context.organizationId,
        core_image_id: image.id,
        analysis_id: analysisId,
        decision,
        canonical_labels: canonicalLabels,
        geologist_comment: typeof body?.comment === 'string' ? body.comment.trim().slice(0, 6000) : null,
        reviewer_id: context.userId,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await context.supabase
      .from('production_geology_core_images')
      .update({ status: decision === 'rejected' ? 'rejected' : 'validated', updated_at: new Date().toISOString() })
      .eq('id', image.id)
      .eq('organization_id', context.organizationId);
    return NextResponse.json({ review });
  }

  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
}
