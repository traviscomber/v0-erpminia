export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'product-media';
const BATCH_SIZE = 30;
const MAX_BYTES = 10 * 1024 * 1024;
const AUTO_APPROVE_CONFIDENCE = 0.9;
const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin']);
const IMAGE_JUNK_HINTS = ['logo', 'icon', 'favicon', 'spinner', 'placeholder', 'tracking', 'pixel', 'avatar', 'social'];
const IMAGE_PRODUCT_HINTS = ['product', 'main', 'gallery', 'zoom', 'hero'];

type Candidate = {
  id: string;
  organization_id: string;
  canonical_product_id: string;
  source_url: string;
  image_url: string;
  source_domain: string;
  confidence: number;
  requested_by_auth_user_id: string;
};

type ImageChoice = {
  url: string;
  score: number;
};

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message || 'Error desconocido');
  return String(error || 'Error desconocido');
}

function extensionFor(contentType: string) {
  if (contentType.includes('avif')) return 'avif';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function absoluteUrl(value: string, base: string) {
  const decoded = decodeHtml(String(value || '').trim());
  if (!decoded || /^(?:data|blob|javascript):/i.test(decoded)) return null;
  try {
    const url = new URL(decoded, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function attributeFromTag(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quoted = tag.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*["']([^"']+)["']`, 'i'));
  if (quoted?.[1]) return decodeHtml(quoted[1]);
  const unquoted = tag.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*([^\\s>]+)`, 'i'));
  return unquoted?.[1] ? decodeHtml(unquoted[1]) : null;
}

function isJunkImage(value: string) {
  const normalized = value.toLowerCase();
  return IMAGE_JUNK_HINTS.some((hint) => normalized.includes(hint));
}

function metaImageFromHtml(html: string, baseUrl: string) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const resolved = absoluteUrl(match[1], baseUrl);
    if (resolved && !isJunkImage(resolved)) return resolved;
  }
  return null;
}

function imageUrlsFromJsonValue(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(imageUrlsFromJsonValue);
  if (!value || typeof value !== 'object') return [];
  const row = value as Record<string, unknown>;
  return ['url', 'contentUrl', 'thumbnailUrl'].flatMap((key) => imageUrlsFromJsonValue(row[key]));
}

function productNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(productNodes);
  if (!value || typeof value !== 'object') return [];
  const row = value as Record<string, unknown>;
  const type = row['@type'];
  const types = Array.isArray(type) ? type : [type];
  const matchesProduct = types.some((entry) => String(entry || '').toLowerCase() === 'product');
  const nested = Object.values(row).flatMap(productNodes);
  return matchesProduct ? [row, ...nested] : nested;
}

function jsonLdImageFromHtml(html: string, baseUrl: string) {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const productImages: string[] = [];
  const fallbackImages: string[] = [];

  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const products = productNodes(parsed);
      for (const product of products) productImages.push(...imageUrlsFromJsonValue(product.image));

      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots) {
        if (root && typeof root === 'object') fallbackImages.push(...imageUrlsFromJsonValue((root as Record<string, unknown>).image));
      }
    } catch {
      // Invalid JSON-LD should not prevent the HTML fallback from running.
    }
  }

  for (const value of [...productImages, ...fallbackImages]) {
    const resolved = absoluteUrl(value, baseUrl);
    if (resolved && !isJunkImage(resolved)) return resolved;
  }
  return null;
}

function srcsetChoices(srcset: string, baseUrl: string) {
  return srcset.split(',').map((part) => {
    const bits = part.trim().split(/\s+/);
    const url = absoluteUrl(bits[0] || '', baseUrl);
    if (!url) return null;
    const descriptor = bits[1] || '';
    const width = descriptor.endsWith('w') ? Number.parseInt(descriptor, 10) || 0 : 0;
    const density = descriptor.endsWith('x') ? Number.parseFloat(descriptor) || 0 : 0;
    return { url, rank: width || density * 1000 };
  }).filter((value): value is { url: string; rank: number } => Boolean(value)).sort((a, b) => b.rank - a.rank);
}

function htmlImageFromHtml(html: string, baseUrl: string) {
  const choices: ImageChoice[] = [];
  const tags = html.match(/<img\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const context = [
      attributeFromTag(tag, 'alt'),
      attributeFromTag(tag, 'class'),
      attributeFromTag(tag, 'id'),
      attributeFromTag(tag, 'title'),
    ].filter(Boolean).join(' ').toLowerCase();

    const rawCandidates: Array<{ value: string; bonus: number }> = [];
    for (const attr of ['data-src', 'data-lazy-src', 'data-original', 'src']) {
      const value = attributeFromTag(tag, attr);
      if (value) rawCandidates.push({ value, bonus: attr === 'src' ? 0 : 12 });
    }

    const srcset = attributeFromTag(tag, 'srcset') || attributeFromTag(tag, 'data-srcset');
    if (srcset) {
      for (const [index, choice] of srcsetChoices(srcset, baseUrl).entries()) {
        rawCandidates.push({ value: choice.url, bonus: 20 - Math.min(index, 10) });
      }
    }

    for (const candidate of rawCandidates) {
      const resolved = absoluteUrl(candidate.value, baseUrl);
      if (!resolved) continue;
      const combined = `${resolved} ${context}`.toLowerCase();
      if (isJunkImage(combined)) continue;

      let score = candidate.bonus;
      if (IMAGE_PRODUCT_HINTS.some((hint) => combined.includes(hint))) score += 50;
      if (/\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(resolved)) score += 5;
      const width = Number.parseInt(attributeFromTag(tag, 'width') || '', 10);
      const height = Number.parseInt(attributeFromTag(tag, 'height') || '', 10);
      if (width >= 500 || height >= 500) score += 15;
      else if ((width > 0 && width <= 80) || (height > 0 && height <= 80)) score -= 30;
      choices.push({ url: resolved, score });
    }
  }

  choices.sort((a, b) => b.score - a.score);
  return choices[0]?.url || null;
}

function pageImageFromHtml(html: string, baseUrl: string) {
  return metaImageFromHtml(html, baseUrl)
    || jsonLdImageFromHtml(html, baseUrl)
    || htmlImageFromHtml(html, baseUrl);
}

async function fetchImage(candidate: Candidate) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 MOTIL Product Media Importer',
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8,text/html;q=0.7',
    Referer: candidate.source_url,
  };

  let imageUrl = candidate.image_url || candidate.source_url;
  let response = await fetch(imageUrl, { headers, cache: 'no-store', redirect: 'follow' });
  if (!response.ok) throw new Error(`Fuente HTTP ${response.status}`);
  let contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (!contentType.startsWith('image/')) {
    if (!contentType.includes('text/html')) throw new Error(`La URL no devolvió imagen (${contentType || 'sin content-type'})`);
    const html = await response.text();
    const resolved = pageImageFromHtml(html, response.url || candidate.source_url);
    if (!resolved) throw new Error('La página no expone una imagen de producto utilizable');
    imageUrl = resolved;
    response = await fetch(imageUrl, { headers: { ...headers, Referer: candidate.source_url }, cache: 'no-store', redirect: 'follow' });
    if (!response.ok) throw new Error(`Imagen de página HTTP ${response.status}`);
    contentType = (response.headers.get('content-type') || '').toLowerCase();
  }

  if (!contentType.startsWith('image/')) throw new Error(`La URL resuelta no devolvió imagen (${contentType || 'sin content-type'})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('Imagen vacía');
  if (buffer.length > MAX_BYTES) throw new Error(`Imagen supera ${MAX_BYTES} bytes`);
  return { buffer, contentType, imageUrl };
}

async function ensureBucket(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

async function importCandidate(supabase: ReturnType<typeof getSupabaseServerClient>, candidate: Candidate) {
  const { data: existing } = await supabase
    .from('product_media')
    .select('id,status')
    .eq('canonical_product_id', candidate.canonical_product_id)
    .in('status', ['approved', 'pending'])
    .limit(1)
    .maybeSingle();
  if (existing) {
    await supabase.from('product_media_web_candidates').update({ status: 'skipped', error_message: 'Producto ya tiene imagen activa.', updated_at: new Date().toISOString() }).eq('id', candidate.id);
    return { ok: true, skipped: true };
  }

  await supabase.from('product_media_web_candidates').update({ status: 'processing', error_message: null, updated_at: new Date().toISOString() }).eq('id', candidate.id);
  const { buffer, contentType, imageUrl } = await fetchImage(candidate);

  const mediaId = crypto.randomUUID();
  const ext = extensionFor(contentType);
  const storagePath = `${candidate.organization_id}/${candidate.canonical_product_id}/${mediaId}.${ext}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const autoApprove = Number(candidate.confidence || 0) >= AUTO_APPROVE_CONFIDENCE;
  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from('product_media').insert({
    id: mediaId,
    organization_id: candidate.organization_id,
    canonical_product_id: candidate.canonical_product_id,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    source_type: 'web_source',
    generation_model: 'web-import',
    generation_prompt: `Imported from ${candidate.source_url}`,
    status: autoApprove ? 'approved' : 'pending',
    generated_by: candidate.requested_by_auth_user_id,
    reviewed_by: autoApprove ? candidate.requested_by_auth_user_id : null,
    reviewed_at: autoApprove ? now : null,
    source_url: candidate.source_url,
    source_domain: candidate.source_domain,
    source_confidence: candidate.confidence,
    source_checked_at: now,
  });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  await Promise.all([
    supabase.from('product_media_web_candidates').update({ status: 'done', image_url: imageUrl, error_message: null, updated_at: now }).eq('id', candidate.id),
    supabase.from('product_media_generation_queue').update({ status: 'done', last_error: null, locked_at: null, updated_at: now }).eq('product_id', candidate.canonical_product_id),
  ]);
  return { ok: true, mediaId, autoApproved: autoApprove };
}

async function run(request: NextRequest) {
  const hasCronAuthorization =
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;

  if (!hasCronAuthorization) {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;
    if (!ADMIN_ROLES.has(String(context.role || '').toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);

  const { data, error } = await supabase
    .from('product_media_web_candidates')
    .select('id, organization_id, canonical_product_id, source_url, image_url, source_domain, confidence, requested_by_auth_user_id')
    .eq('status', 'queued')
    .order('confidence', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const candidates = (data || []) as Candidate[];
  if (!candidates.length) return NextResponse.json({ ok: true, imported: 0, message: 'No hay candidatos web pendientes.' });

  const results = await Promise.all(candidates.map(async (candidate) => {
    try {
      return { candidateId: candidate.id, productId: candidate.canonical_product_id, ...(await importCandidate(supabase, candidate)) };
    } catch (error) {
      const message = messageOf(error);
      await supabase.from('product_media_web_candidates').update({ status: 'failed', error_message: message.slice(0, 2000), updated_at: new Date().toISOString() }).eq('id', candidate.id);
      console.error('[cron/product-media-web-import]', { candidateId: candidate.id, productId: candidate.canonical_product_id, message });
      return { candidateId: candidate.id, productId: candidate.canonical_product_id, ok: false, error: message };
    }
  }));

  return NextResponse.json({
    ok: true,
    processed: results.length,
    imported: results.filter((row) => row.ok && !('skipped' in row && row.skipped)).length,
    autoApproved: results.filter((row) => row.ok && 'autoApproved' in row && row.autoApproved).length,
    failed: results.filter((row) => !row.ok).length,
    results,
  });
}

export async function GET(request: NextRequest) { return run(request); }
export async function POST(request: NextRequest) { return run(request); }
