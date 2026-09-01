// @ts-nocheck -- Supabase Edge Function runs in Deno; Next.js must not resolve npm: specifiers.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const MAX_BYTES = 10 * 1024 * 1024;
const AUTO = 0.9;
const BATCH = 25;

function ext(ct: string) {
  if (ct.includes('avif')) return 'avif';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  return 'jpg';
}
function abs(v: string, b: string) {
  try { return new URL(v, b).toString(); } catch { return v; }
}
function meta(h: string, b: string) {
  const patterns = [
    /<meta[^>]+property=[\"']og:image(?::secure_url)?[\"'][^>]+content=[\"']([^\"']+)[\"']/i,
    /<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']og:image(?::secure_url)?[\"']/i,
    /<meta[^>]+name=[\"']twitter:image(?::src)?[\"'][^>]+content=[\"']([^\"']+)[\"']/i,
  ];
  for (const p of patterns) {
    const m = h.match(p);
    if (m?.[1]) return abs(m[1].replace(/&amp;/g, '&'), b);
  }
  return null;
}
async function fetchImage(c: any) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 MOTIL Media Autopilot',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8,text/html;q=0.7',
    'Referer': c.source_url,
  };
  let u = c.image_url || c.source_url;
  let r = await fetch(u, { headers, redirect: 'follow' });
  if (!r.ok) throw new Error(`Fuente HTTP ${r.status}`);
  let ct = (r.headers.get('content-type') || '').toLowerCase();
  if (!ct.startsWith('image/')) {
    if (!ct.includes('text/html')) throw new Error(`La URL no devolvio imagen (${ct || 'sin content-type'})`);
    const h = await r.text();
    const resolved = meta(h, r.url || c.source_url);
    if (!resolved) throw new Error('La pagina no expone og:image/twitter:image');
    u = resolved;
    r = await fetch(u, { headers: { ...headers, Referer: c.source_url }, redirect: 'follow' });
    if (!r.ok) throw new Error(`Imagen de pagina HTTP ${r.status}`);
    ct = (r.headers.get('content-type') || '').toLowerCase();
  }
  if (!ct.startsWith('image/')) throw new Error(`La URL resuelta no devolvio imagen (${ct || 'sin content-type'})`);
  const b = new Uint8Array(await r.arrayBuffer());
  if (!b.length) throw new Error('Imagen vacia');
  if (b.length > MAX_BYTES) throw new Error('Imagen supera limite');
  return { b, ct, u };
}

Deno.serve(async (req: Request) => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const supplied = req.headers.get('x-motil-media-key');
  const { data: authRow, error: authErr } = await sb.from('production_internal_stage_auth')
    .select('secret,enabled,expires_at').eq('key', 'motil-media-autopilot').maybeSingle();
  if (authErr || !authRow || !authRow.enabled || !supplied || supplied !== authRow.secret || new Date(authRow.expires_at).getTime() <= Date.now()) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { data: run } = await sb.from('product_media_autopilot_runs').insert({ metadata: { trigger: 'scheduled' } }).select('id').single();
  const runId = run?.id;
  let discovered = 0, processed = 0, approved = 0, failed = 0, skipped = 0;
  let fatal: string | null = null;

  try {
    const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await sb.from('product_media_web_candidates').update({ status: 'queued', error_message: 'AUTOPILOT: recovered stale processing candidate', updated_at: new Date().toISOString() })
      .eq('status', 'processing').lt('updated_at', staleBefore);

    const { data: disc, error: discErr } = await sb.rpc('motil_media_autopilot_discover', { p_limit: 100 });
    if (discErr) throw discErr;
    discovered = Number(disc || 0);

    const { data: candidates, error } = await sb.from('product_media_web_candidates')
      .select('id,organization_id,canonical_product_id,source_url,image_url,source_domain,confidence,requested_by_auth_user_id,error_message')
      .eq('status', 'queued').order('confidence', { ascending: false }).order('created_at', { ascending: true }).limit(BATCH);
    if (error) throw error;

    for (const c of candidates || []) {
      processed++;
      try {
        const { data: existing } = await sb.from('product_media').select('id').eq('canonical_product_id', c.canonical_product_id)
          .in('status', ['approved', 'pending']).limit(1).maybeSingle();
        if (existing) {
          await sb.from('product_media_web_candidates').update({ status: 'skipped', error_message: 'Producto ya tiene imagen activa.', updated_at: new Date().toISOString() }).eq('id', c.id);
          skipped++;
          continue;
        }
        await sb.from('product_media_web_candidates').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', c.id);
        const im = await fetchImage(c);
        const mediaId = crypto.randomUUID();
        const path = `${c.organization_id}/${c.canonical_product_id}/${mediaId}.${ext(im.ct)}`;
        const { error: up } = await sb.storage.from('product-media').upload(path, im.b, { contentType: im.ct, upsert: false });
        if (up) throw up;
        const auto = Number(c.confidence || 0) >= AUTO;
        const now = new Date().toISOString();
        const note = String(c.error_message || '').startsWith('AUTOPILOT B:')
          ? `Representative image imported by Motil Media Autopilot. ${c.error_message}`
          : `Image imported by Motil Media Autopilot from ${c.source_url}`;
        const { error: ins } = await sb.from('product_media').insert({
          id: mediaId,
          organization_id: c.organization_id,
          canonical_product_id: c.canonical_product_id,
          storage_bucket: 'product-media',
          storage_path: path,
          source_type: 'web_source',
          generation_model: String(c.error_message || '').startsWith('AUTOPILOT B:') ? 'web-import-representative-autopilot' : 'web-import-autopilot',
          generation_prompt: note,
          status: auto ? 'approved' : 'pending',
          generated_by: c.requested_by_auth_user_id,
          reviewed_by: auto ? c.requested_by_auth_user_id : null,
          reviewed_at: auto ? now : null,
          source_url: c.source_url,
          source_domain: c.source_domain,
          source_confidence: c.confidence,
          source_checked_at: now,
        });
        if (ins) { await sb.storage.from('product-media').remove([path]); throw ins; }
        await Promise.all([
          sb.from('product_media_web_candidates').update({ status: 'done', image_url: im.u, error_message: null, updated_at: now }).eq('id', c.id),
          sb.from('product_media_generation_queue').update({ status: 'done', last_error: null, locked_at: null, updated_at: now }).eq('product_id', c.canonical_product_id),
        ]);
        if (auto) approved++;
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        await sb.from('product_media_web_candidates').update({ status: 'failed', error_message: `AUTOPILOT FAILED: ${msg}`.slice(0, 2000), updated_at: new Date().toISOString() }).eq('id', c.id);
      }
    }
  } catch (e) {
    fatal = e instanceof Error ? e.message : String(e);
  }

  const { count: queuedAfter } = await sb.from('product_media_web_candidates').select('id', { count: 'exact', head: true }).eq('status', 'queued');
  if (runId) {
    await sb.from('product_media_autopilot_runs').update({
      finished_at: new Date().toISOString(), discovered, processed, approved, failed, skipped,
      queued_after: queuedAfter ?? null, error_message: fatal,
    }).eq('id', runId);
  }
  return Response.json({ ok: !fatal, discovered, processed, approved, failed, skipped, queuedAfter, error: fatal });
});
