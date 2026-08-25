export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'product-media';
const OPENAI_IMAGE_ENDPOINT = 'https://api.openai.com/v1/images/generations';
const OPENAI_IMAGE_MODEL = 'gpt-image-1.5';

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; error?: unknown; code?: unknown };
    if (typeof candidate.message === 'string' && candidate.message) return candidate.message;
    if (typeof candidate.error === 'string' && candidate.error) return candidate.error;
    if (typeof candidate.code === 'string' && candidate.code) return candidate.code;
  }
  return String(error || 'Error desconocido');
}

function promptFor(product: Record<string, unknown>) {
  return [
    'Fotografía de catálogo industrial, vista de producto aislado sobre fondo gris claro, iluminación de estudio, encuadre cuadrado.',
    `Producto: ${product.name}. Código interno: ${product.product_code}.`,
    product.family ? `Familia: ${product.family}.` : '',
    product.subfamily ? `Subfamilia: ${product.subfamily}.` : '',
    product.description ? `Descripción de referencia: ${product.description}.` : '',
    'Sin texto, marcas, logotipos, personas, etiquetas ni números visibles. No inventar especificaciones técnicas no descritas.',
  ].filter(Boolean).join(' ');
}

async function uploadProductImage(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  storagePath: string,
  image: Buffer,
) {
  let result = await supabase.storage.from(BUCKET).upload(storagePath, image, {
    contentType: 'image/png',
    upsert: false,
  });

  const firstMessage = messageOf(result.error);
  if (result.error && /bucket not found/i.test(firstMessage)) {
    console.warn('[admin/product-media:storage-bucket-missing]', { bucket: BUCKET });

    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });

    const createMessage = messageOf(createError);
    if (createError && !/already exists|duplicate/i.test(createMessage)) {
      return { error: new Error(`No se pudo crear bucket ${BUCKET}: ${createMessage}`) };
    }

    result = await supabase.storage.from(BUCKET).upload(storagePath, image, {
      contentType: 'image/png',
      upsert: false,
    });
  }

  return result;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;
  const supabase = getSupabaseServerClient();
  let stage = 'request';

  try {
    const body = await request.json();
    const action = String(body.action || '');
    const productId = String(body.productId || '');
    if (!productId) return NextResponse.json({ error: 'Producto requerido.', stage }, { status: 400 });

    stage = 'product_lookup';
    const { data: product, error: productError } = await supabase
      .from('canonical_products_v1')
      .select('id, product_code, name, description, family, subfamily')
      .eq('organization_id', auth.organizationId)
      .eq('id', productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) return NextResponse.json({ error: 'Producto no encontrado.', stage }, { status: 404 });

    if (action === 'generate') {
      stage = 'openai_config';
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) {
        console.error('[admin/product-media:openai-config]', { hasOpenAiApiKey: false });
        return NextResponse.json({ error: 'OPENAI_API_KEY no está configurada en producción.', stage }, { status: 503 });
      }

      const prompt = promptFor(product);
      console.info('[admin/product-media:openai-request]', {
        model: OPENAI_IMAGE_MODEL,
        productId: product.id,
        hasOpenAiApiKey: true,
      });

      stage = 'openai_generation';
      const generated = await fetch(OPENAI_IMAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'low',
          output_format: 'png',
        }),
        cache: 'no-store',
      });

      const responseText = await generated.text();
      let payload: any = null;
      try { payload = responseText ? JSON.parse(responseText) : null; } catch { payload = null; }

      if (!generated.ok) {
        const openAiMessage = payload?.error?.message || responseText.slice(0, 1000) || `OpenAI respondió HTTP ${generated.status}.`;
        console.error('[admin/product-media:openai-response]', {
          status: generated.status,
          type: payload?.error?.type || null,
          code: payload?.error?.code || null,
          message: openAiMessage,
        });
        return NextResponse.json({ error: `OpenAI: ${openAiMessage}`, stage, status: generated.status }, { status: 502 });
      }

      const base64 = payload?.data?.[0]?.b64_json;
      if (!base64) {
        console.error('[admin/product-media:openai-response]', {
          status: generated.status,
          hasData: Array.isArray(payload?.data),
          hasBase64: false,
          responsePreview: responseText.slice(0, 500),
        });
        return NextResponse.json({ error: 'OpenAI respondió sin datos de imagen.', stage }, { status: 502 });
      }

      const id = crypto.randomUUID();
      const storagePath = `${auth.organizationId}/${product.id}/${id}.png`;
      const image = Buffer.from(base64, 'base64');

      stage = 'storage_upload';
      const { error: uploadError } = await uploadProductImage(supabase, storagePath, image);
      if (uploadError) {
        console.error('[admin/product-media:storage-upload]', { message: messageOf(uploadError), productId: product.id });
        return NextResponse.json({ error: `Storage: ${messageOf(uploadError)}`, stage }, { status: 500 });
      }

      stage = 'media_insert';
      const { data: media, error: insertError } = await supabase.from('product_media').insert({
        id,
        organization_id: auth.organizationId,
        canonical_product_id: product.id,
        storage_bucket: BUCKET,
        storage_path: storagePath,
        generation_model: OPENAI_IMAGE_MODEL,
        generation_prompt: prompt,
        status: 'pending',
        generated_by: auth.user.id,
      }).select('id, status').single();

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        console.error('[admin/product-media:media-insert]', { message: messageOf(insertError), productId: product.id });
        return NextResponse.json({ error: `Base de datos: ${messageOf(insertError)}`, stage }, { status: 500 });
      }

      return NextResponse.json({ media, stage: 'complete' }, { status: 201 });
    }

    stage = 'media_review';
    if (!['approve', 'reject'].includes(action) || !body.mediaId) return NextResponse.json({ error: 'Acción no soportada.', stage }, { status: 400 });
    const mediaId = String(body.mediaId);
    const { data: candidate, error: candidateError } = await supabase.from('product_media')
      .select('id, status')
      .eq('id', mediaId)
      .eq('organization_id', auth.organizationId)
      .eq('canonical_product_id', product.id)
      .maybeSingle();
    if (candidateError) throw candidateError;
    if (!candidate) return NextResponse.json({ error: 'Imagen no encontrada.', stage }, { status: 404 });

    if (action === 'approve') {
      const { error: oldError } = await supabase.from('product_media').update({ status: 'rejected', reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), review_notes: 'Reemplazada por una nueva foto aprobada.' }).eq('organization_id', auth.organizationId).eq('canonical_product_id', product.id).eq('status', 'approved');
      if (oldError) throw oldError;
    }

    const { error: reviewError } = await supabase.from('product_media').update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), review_notes: body.notes || null }).eq('id', mediaId).eq('organization_id', auth.organizationId);
    if (reviewError) throw reviewError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = messageOf(error);
    console.error('[admin/product-media]', { stage, message });
    return NextResponse.json({ error: `${stage}: ${message}`, stage }, { status: 500 });
  }
}
