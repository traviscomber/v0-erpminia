export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'product-media';
const BATCH_SIZE = 6;
const MAX_BYTES = 10 * 1024 * 1024;

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

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message || 'Error desconocido');
  return String(error || 'Error desconocido');
}

function extensionFor(contentType: string) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
}

async function ensureBucket(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

async function importCandidate(supabase: ReturnType<typeof getSupabaseServerClient>, candidate: Candidate) {
  const { data: existing } = await supabase
    .from('product_media')
    .select('id')
    .eq('canonical_product_id', candidate.canonical_product_id)
    .in('status', ['approved', 'pending'])
    .limit(1)
    .maybeSingle();
  if (existing) {
    await supabase.from('product_media_web_candidates').update({ status: 'skipped', error_message: 'Producto ya tiene imagen activa.', updated_at: new Date().toISOString() }).eq('id', candidate.id);
    return { ok: true, skipped: true };
  }

  await supabase.from('product_media_web_candidates').update({ status: 'processing', error_message: null, updated_at: new Date().toISOString() }).eq('id', candidate.id);

  const response = await fetch(candidate.image_url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 MOTIL Product Media Importer',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Referer: candidate.source_url,
    },
    cache: 'no-store',
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Fuente HTTP ${response.status}`);
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('image/')) throw new Error(`La URL no devolvió imagen (${contentType || 'sin content-type'})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('Imagen vacía');
  if (buffer.length > MAX_BYTES) throw new Error(`Imagen supera ${MAX_BYTES} bytes`);

  const mediaId = crypto.randomUUID();
  const ext = extensionFor(contentType);
  const storagePath = `${candidate.organization_id}/${candidate.canonical_product_id}/${mediaId}.${ext}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from('product_media').insert({
    id: mediaId,
    organization_id: candidate.organization_id,
    canonical_product_id: candidate.canonical_product_id,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    source_type: 'web_source',
    generation_model: 'web-import',
    generation_prompt: `Imported from ${candidate.source_url}`,
    status: 'pending',
    generated_by: candidate.requested_by_auth_user_id,
    source_url: candidate.source_url,
    source_domain: candidate.source_domain,
    source_confidence: candidate.confidence,
    source_checked_at: new Date().toISOString(),
  });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  await Promise.all([
    supabase.from('product_media_web_candidates').update({ status: 'done', error_message: null, updated_at: new Date().toISOString() }).eq('id', candidate.id),
    supabase.from('product_media_generation_queue').update({ status: 'done', last_error: null, locked_at: null, updated_at: new Date().toISOString() }).eq('product_id', candidate.canonical_product_id),
  ]);
  return { ok: true, mediaId };
}

async function run(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const results = [];
  for (const candidate of candidates) {
    try {
      results.push({ candidateId: candidate.id, productId: candidate.canonical_product_id, ...(await importCandidate(supabase, candidate)) });
    } catch (error) {
      const message = messageOf(error);
      await supabase.from('product_media_web_candidates').update({ status: 'failed', error_message: message.slice(0, 2000), updated_at: new Date().toISOString() }).eq('id', candidate.id);
      console.error('[cron/product-media-web-import]', { candidateId: candidate.id, productId: candidate.canonical_product_id, message });
      results.push({ candidateId: candidate.id, productId: candidate.canonical_product_id, ok: false, error: message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, imported: results.filter((row) => row.ok && !('skipped' in row && row.skipped)).length, failed: results.filter((row) => !row.ok).length, results });
}

export async function GET(request: NextRequest) { return run(request); }
export async function POST(request: NextRequest) { return run(request); }
