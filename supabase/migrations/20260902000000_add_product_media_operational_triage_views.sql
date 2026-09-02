-- Operational intelligence for Product 360 media sourcing.
-- These views are intentionally not granted to anon/authenticated roles.

create or replace view public.product_media_source_health_v1
with (security_invoker = true)
as
select
  source_domain,
  count(*) filter (where status = 'done')::bigint as done_count,
  count(*) filter (where status = 'failed')::bigint as failed_count,
  count(*) filter (where status = 'skipped')::bigint as skipped_count,
  count(*) filter (where status = 'queued')::bigint as queued_count,
  case
    when count(*) filter (where status in ('done','failed')) = 0 then null
    else round(
      100.0 * count(*) filter (where status = 'done') /
      count(*) filter (where status in ('done','failed')),
      1
    )
  end as success_pct,
  max(updated_at) as last_activity_at,
  count(*) filter (where status='failed' and error_message ilike '%HTTP 403%')::bigint as http_403_count,
  count(*) filter (where status='failed' and error_message ilike '%HTTP 404%')::bigint as http_404_count,
  count(*) filter (where status='failed' and error_message ilike '%HTTP 429%')::bigint as http_429_count,
  count(*) filter (where status='failed' and error_message ilike '%og:image%')::bigint as metadata_image_missing_count
from public.product_media_web_candidates
where source_domain is not null
group by source_domain;

create or replace view public.product_media_gap_triage_v1
with (security_invoker = true)
as
select
  p.id as canonical_product_id,
  p.organization_id,
  p.product_code,
  p.name,
  p.family,
  p.subfamily,
  public.motil_media_visual_group(p.name,p.family,p.product_code) as safe_visual_group,
  case
    when p.product_code ilike 'Servi%' or p.product_code ilike 'CEAR%'
      or p.name ~* '^(servicio|mano de obra|arriendo|flete|traslado|calibraci[oó]n|certificaci[oó]n)([^[:alpha:]]|$)'
      then 'service_candidate'
    when public.motil_media_visual_group(p.name,p.family,p.product_code) is not null
      then 'safe_representative'
    when q.status='queued' and q.last_error like 'QALITO DATA HOLD:%'
      then 'data_hold'
    when q.status='queued' and q.last_error like 'QALITO:%'
      then 'exact_match_required'
    else 'exact_or_manual'
  end as recommended_lane,
  q.status as generation_queue_status,
  q.last_error as generation_queue_note
from public.canonical_products_v1 p
left join public.product_media_generation_queue q on q.product_id=p.id
where p.is_active=true
  and not exists (
    select 1 from public.product_media m
    where m.canonical_product_id=p.id and m.status='approved'
  );

revoke all on public.product_media_source_health_v1 from anon, authenticated;
revoke all on public.product_media_gap_triage_v1 from anon, authenticated;
