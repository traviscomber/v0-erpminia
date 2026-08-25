export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'product-media';
const OPENAI_IMAGE_ENDPOINT = 'https://api.openai.com/v1/images/generations';
const OPENAI_IMAGE_MODEL = 'gpt-image-1.5';
const BATCH_SIZE = 3;

type ClaimedProduct = { product_id: string; organization_id: string };
type Product = {
  id: string;
  organization_id: string;
  product_code: string;
  name: string;
  description?: string | null;
  family?: string | null;
  subfamily?: string | null;
};

function promptFor(product: Product) {
  return [
    'Fotografía de catálogo industrial, vista de producto aislado sobre fondo gris claro, iluminación de estudio, encuadre cuadrado.',
    `Producto: ${product.name}. Código interno: ${product.product_code}.`,
    product.family ? `Familia: ${product.family}.` : '',
    product.subfamily ? `Subfamilia: ${product.subfamily}.` : '',
    product.description ? `Descripción de referencia: ${product.description}.` : '',
    'Sin texto, marcas, logotipos, personas, etiquetas ni números visibles. No inventar especificaciones técnicas no descritas.',
  ].filter(Boolean).join(' ');
}

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message || 'Error desconocido');
  return String(error || 'Error desconocido');
}

async function ensureBucket(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

async function resolveActorAuthUserId(supabase: ReturnType<typeof getSupabaseServerClient>, organizationId: string) {
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('organization_id', organizationId)
    .in('role', ['admin', 'superadmin', 'super_admin'])
    .limit(20);
  if (profileError) throw profileError;
  const profileIds = (profiles || []).map((row) => row.id);
  if (!profileIds.length) throw new Error('No existe un perfil administrador para atribuir la generación.');

  const { data: links, error: linkError } = await supabase
    .from('auth_profile_identity_links')
    .select('auth_user_id, profile_id')
    .in('profile_id', profileIds)
    .limit(1);
  if (linkError) throw linkError;
  const actor = links?.[0]?.auth_user_id;
  if (!actor) throw new Error('No existe vínculo auth para un administrador de la organización.');
  return actor as string;
}

async function markFailed(supabase: ReturnType<typeof getSupabaseServerClient>, productId: string, attempts: number, error: string) {
  const delayMinutes = Math.min(360, Math.max(5, 5 * Math.pow(2, Math.max(0, attempts - 1))));
  const nextAttempt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
  await supabase
    .from('product_media_generation_queue')
    .update({ status: 'failed', last_error: error.slice(0, 2000), next_attempt_at: nextAttempt, locked_at: null, updated_at: new Date().toISOString() })
    .eq('product_id', productId);
}

async function generateOne(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  product: Product,
  actorAuthUserId: string,
  apiKey: string,
) {
  const prompt = promptFor(product);
  const response = await fetch(OPENAI_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENAI_IMAGE_MODEL, prompt, n: 1, size: '1024x1024', quality: 'low', output_format: 'png' }),
    cache: 'no-store',
  });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(payload?.error?.message || `OpenAI HTTP ${response.status}`);
  const base64 = payload?.data?.[0]?.b64_json;
  if (!base64) throw new Error('OpenAI respondió sin datos de imagen.');

  const mediaId = crypto.randomUUID();
  const storagePath = `${product.organization_id}/${product.id}/${mediaId}.png`;
  const image = Buffer.from(base64, 'base64');
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, image, { contentType: 'image/png', upsert: false });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from('product_media').insert({
    id: mediaId,
    organization_id: product.organization_id,
    canonical_product_id: product.id,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    generation_model: OPENAI_IMAGE_MODEL,
    generation_prompt: prompt,
    status: 'pending',
    generated_by: actorAuthUserId,
  });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  await supabase
    .from('product_media_generation_queue')
    .update({ status: 'done', last_error: null, locked_at: null, updated_at: new Date().toISOString() })
    .eq('product_id', product.id);
  return mediaId;
}

async function run(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 503 });

  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);

  const { data: claimed, error: claimError } = await supabase.rpc('claim_product_media_generation_batch', { p_limit: BATCH_SIZE });
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  const batch = (claimed || []) as ClaimedProduct[];
  if (!batch.length) return NextResponse.json({ ok: true, claimed: 0, message: 'No quedan productos elegibles.' });

  const ids = batch.map((row) => row.product_id);
  const { data: products, error: productError } = await supabase
    .from('canonical_products_v1')
    .select('id, organization_id, product_code, name, description, family, subfamily')
    .in('id', ids);
  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

  const attemptsByProduct = new Map<string, number>();
  const { data: queueRows } = await supabase.from('product_media_generation_queue').select('product_id, attempts').in('product_id', ids);
  for (const row of queueRows || []) attemptsByProduct.set(row.product_id, Number(row.attempts || 1));

  const actorByOrg = new Map<string, string>();
  const results = await Promise.all((products || []).map(async (product) => {
    try {
      let actor = actorByOrg.get(product.organization_id);
      if (!actor) {
        actor = await resolveActorAuthUserId(supabase, product.organization_id);
        actorByOrg.set(product.organization_id, actor);
      }
      const mediaId = await generateOne(supabase, product as Product, actor, apiKey);
      return { productId: product.id, ok: true, mediaId };
    } catch (error) {
      const message = messageOf(error);
      await markFailed(supabase, product.id, attemptsByProduct.get(product.id) || 1, message);
      console.error('[cron/product-media-generation]', { productId: product.id, message });
      return { productId: product.id, ok: false, error: message };
    }
  }));

  return NextResponse.json({ ok: true, claimed: batch.length, generated: results.filter((row) => row.ok).length, failed: results.filter((row) => !row.ok).length, results });
}

export async function GET(request: NextRequest) { return run(request); }
export async function POST(request: NextRequest) { return run(request); }
