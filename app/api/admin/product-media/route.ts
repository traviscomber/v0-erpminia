export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'product-media';
const OPENAI_IMAGE_ENDPOINT = 'https://api.openai.com/v1/images/generations';
const OPENAI_IMAGE_MODEL = 'gpt-image-1.5';

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

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;
  const supabase = getSupabaseServerClient();

  try {
    const body = await request.json();
    const action = String(body.action || '');
    const productId = String(body.productId || '');
    if (!productId) return NextResponse.json({ error: 'Producto requerido.' }, { status: 400 });

    const { data: product, error: productError } = await supabase
      .from('canonical_products_v1')
      .select('id, product_code, name, description, family, subfamily')
      .eq('organization_id', auth.organizationId)
      .eq('id', productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });

    if (action === 'generate') {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) {
        console.error('[admin/product-media:openai-config]', { hasOpenAiApiKey: false });
        return NextResponse.json({ error: 'OPENAI_API_KEY no está configurada en producción.' }, { status: 503 });
      }

      const prompt = promptFor(product);
      console.info('[admin/product-media:openai-request]', {
        model: OPENAI_IMAGE_MODEL,
        productId: product.id,
        hasOpenAiApiKey: true,
      });

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

      const payload = await generated.json().catch(() => null);
      if (!generated.ok) {
        const openAiMessage = payload?.error?.message || `OpenAI respondió HTTP ${generated.status}.`;
        console.error('[admin/product-media:openai-response]', {
          status: generated.status,
          type: payload?.error?.type || null,
          code: payload?.error?.code || null,
          message: openAiMessage,
        });
        return NextResponse.json({ error: `OpenAI: ${openAiMessage}` }, { status: 502 });
      }

      const base64 = payload?.data?.[0]?.b64_json;
      if (!base64) {
        console.error('[admin/product-media:openai-response]', {
          status: generated.status,
          hasData: Array.isArray(payload?.data),
          hasBase64: false,
        });
        return NextResponse.json({ error: 'OpenAI respondió sin datos de imagen.' }, { status: 502 });
      }

      const id = crypto.randomUUID();
      const storagePath = `${auth.organizationId}/${product.id}/${id}.png`;
      const image = Buffer.from(base64, 'base64');
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, image, { contentType: 'image/png', upsert: false });
      if (uploadError) throw uploadError;

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
        throw insertError;
      }

      return NextResponse.json({ media }, { status: 201 });
    }

    if (!['approve', 'reject'].includes(action) || !body.mediaId) return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
    const mediaId = String(body.mediaId);
    const { data: candidate, error: candidateError } = await supabase.from('product_media')
      .select('id, status')
      .eq('id', mediaId)
      .eq('organization_id', auth.organizationId)
      .eq('canonical_product_id', product.id)
      .maybeSingle();
    if (candidateError) throw candidateError;
    if (!candidate) return NextResponse.json({ error: 'Imagen no encontrada.' }, { status: 404 });

    if (action === 'approve') {
      const { error: oldError } = await supabase.from('product_media').update({ status: 'rejected', reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), review_notes: 'Reemplazada por una nueva foto aprobada.' }).eq('organization_id', auth.organizationId).eq('canonical_product_id', product.id).eq('status', 'approved');
      if (oldError) throw oldError;
    }

    const { error: reviewError } = await supabase.from('product_media').update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), review_notes: body.notes || null }).eq('id', mediaId).eq('organization_id', auth.organizationId);
    if (reviewError) throw reviewError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/product-media]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo gestionar la fotografía.' }, { status: 500 });
  }
}
