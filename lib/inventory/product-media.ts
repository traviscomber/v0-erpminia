import type { SupabaseClient } from '@supabase/supabase-js';

export type ProductMedia = {
  id: string;
  canonical_product_id: string;
  status: 'pending' | 'approved' | 'rejected';
  source_type: 'ai_generated' | 'web_source';
  generation_model: string;
  storage_bucket: string;
  storage_path: string;
  generated_at: string;
  source_url?: string | null;
  source_domain?: string | null;
  source_confidence?: number | null;
  image_url: string | null;
};

export async function getProductMedia(
  supabase: SupabaseClient,
  organizationId: string,
  productIds: string[],
  includePending = false,
) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  const mediaByProduct = new Map<string, ProductMedia>();
  if (!uniqueIds.length) return mediaByProduct;

  let query = supabase
    .from('product_media')
    .select('id, canonical_product_id, status, source_type, generation_model, storage_bucket, storage_path, generated_at, source_url, source_domain, source_confidence')
    .eq('organization_id', organizationId)
    .in('canonical_product_id', uniqueIds)
    .order('created_at', { ascending: false });
  if (!includePending) query = query.eq('status', 'approved');
  else query = query.in('status', ['approved', 'pending']);

  const { data, error } = await query;
  if (error) {
    console.error('[product-media:list]', {
      code: error.code,
      message: error.message,
      organizationId,
      productCount: uniqueIds.length,
    });
    return mediaByProduct;
  }

  for (const row of data || []) {
    if (mediaByProduct.has(row.canonical_product_id)) continue;

    if (row.source_type === 'web_source' && /^https?:\/\//i.test(row.storage_path)) {
      mediaByProduct.set(row.canonical_product_id, {
        ...row,
        image_url: row.storage_path,
      } as ProductMedia);
      continue;
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, 3600);
    if (signedError) {
      console.error('[product-media:signed-url]', {
        code: signedError.name,
        message: signedError.message,
        mediaId: row.id,
      });
    }
    mediaByProduct.set(row.canonical_product_id, {
      ...row,
      image_url: signed?.signedUrl || null,
    } as ProductMedia);
  }
  return mediaByProduct;
}

export function attachProductMedia<T extends { id: string }>(rows: T[], media: Map<string, ProductMedia>) {
  return rows.map((row) => ({ ...row, media: media.get(row.id) || null }));
}
