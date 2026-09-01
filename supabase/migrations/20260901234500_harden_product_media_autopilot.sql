-- Version the production-safe Product 360 media classifier and discovery logic.
-- Specific spares must never receive representative imagery solely by morphology.

CREATE OR REPLACE FUNCTION public.motil_media_visual_group(
  p_name text,
  p_family text DEFAULT NULL::text,
  p_product_code text DEFAULT NULL::text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  select case
    when coalesce(p_product_code,'') ilike 'Servi%' or coalesce(p_product_code,'') ilike 'CEAR%' then null
    when coalesce(p_name,'') ~* '^(perno|pernos)[[:space:]]+(hex|M[0-9]|[0-9]+[[:space:]]*MM)'
      and coalesce(p_name,'') !~* '(parker|allen|anclaje|ojo|avellan|rueda|seguridad|especial|croquis|spicer|chancador|molino|motor|qsl|cocina|tirafondo|bomba|freno|operaci[oó]n|equipo|toyota|jcb|cat|john deere|cummins|atlas|epiroc|serie)'
      then 'fastener_hex_bolt_standard'
    when coalesce(p_name,'') ~* '^tuercas?[[:space:]]+(([0-9]+([.,][0-9]+)?|M[0-9]+)[[:space:]]*(mm|pulg|"|''|x|hilo)|[0-9]+/[0-9]+[[:space:]]*(''|"|pulg)[[:space:]]+hilo)'
      and coalesce(p_name,'') !~* '(seguridad|seguro|nylon|cañonera|piñ[oó]n|cubre|nodular|castillo|mariposa|especial|croquis|rodamiento|bomba|eje|rueda|freno|pasador|tirante|prensa|estopa|tensor|tongo|toyota|jcb|cat|mann|vw|sullair|hilux|chasis|equipo|motor|bronce|tap[oó]n|hidr[aá]ul|fig|diagrama)'
      then 'fastener_hex_nut_standard'
    when coalesce(p_name,'') ~* 'golilla[[:space:]]+plana'
      and coalesce(p_name,'') !~* '(goma|copa|cobre|especial|croquis)'
      then 'fastener_flat_washer'
    when coalesce(p_name,'') ~* '(mini[[:space:]]*fusible|fusible)[[:space:]]+(de[[:space:]]+)?horquilla'
      then 'electrical_mini_blade_fuse'
    when coalesce(p_name,'') ~* 'prensa[[:space:]]*estopa[[:space:]]*PG'
      then 'electrical_pg_cable_gland'
    when coalesce(p_name,'') ~* '(tornillo|perno).*(punta[[:space:]]+broca|autoperforante)'
      and coalesce(p_name,'') ~* 'hex'
      then 'fastener_self_drilling_hex_screw'
    when coalesce(p_name,'') ~* 'abrazadera.*(sinfin|sinf[ií]n|manguera)'
      and coalesce(p_name,'') !~* '([0-9]{3,}[ -]?[0-9]{2,}|motor|inyector|turbo|cat|john deere|cummins|atlas|epiroc|serie)'
      then 'clamp_worm_drive_hose'
    when coalesce(p_name,'') ~* '(correa.*(tipo[[:space:]]+)?v([^[:alpha:]]|$)|v[- ]?belt|correa.*trapezoidal)'
      and coalesce(p_name,'') !~* '(motor|chasis|amarok|fot[oó]n|kit|servicio|alternador|ventilador|tensor|rodillo|cat|john deere|cummins|atlas|epiroc|serie|dentad|sincr[oó]nic|timing|distribuci[oó]n|kia|frontier)'
      then 'belt_v_standard'
    else null
  end;
$function$;

CREATE OR REPLACE FUNCTION public.motil_media_autopilot_discover(p_limit integer DEFAULT 100)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid;
  v_count integer := 0;
  v_n integer := 0;
begin
  select requested_by_auth_user_id into v_user
  from public.product_media_web_candidates
  where requested_by_auth_user_id is not null
  order by created_at desc
  limit 1;
  if v_user is null then return 0; end if;

  -- A: only reuse successful sources for an exact normalized product name.
  with src as (
    select distinct on (lower(trim(cp.name)))
      lower(trim(cp.name)) as norm_name,
      c.source_url, c.image_url, c.source_domain, greatest(c.confidence,0.95) as confidence
    from public.canonical_products_v1 cp
    join public.product_media_web_candidates c on c.canonical_product_id=cp.id and c.status='done'
    where length(trim(cp.name)) >= 8
      and cp.product_code not ilike 'Servi%'
      and cp.product_code not ilike 'CEAR%'
      and lower(cp.name) not like '%disponible usar%'
      and lower(cp.name) not like '%sin imagen%'
      and lower(cp.name) not like '%s/imagen%'
      and c.image_url is not null
    order by lower(trim(cp.name)), c.updated_at desc
  ), targets as (
    select p.id,p.organization_id,s.*
    from public.canonical_products_v1 p
    join src s on s.norm_name=lower(trim(p.name))
    where coalesce(p.is_active,true)
      and p.product_code not ilike 'Servi%'
      and p.product_code not ilike 'CEAR%'
      and not exists (select 1 from public.product_media m where m.canonical_product_id=p.id and m.status in ('approved','pending'))
      and not exists (select 1 from public.product_media_web_candidates c where c.canonical_product_id=p.id)
    limit greatest(p_limit-v_count,0)
  )
  insert into public.product_media_web_candidates(organization_id,canonical_product_id,source_url,image_url,source_domain,confidence,status,error_message,requested_by_auth_user_id)
  select organization_id,id,source_url,image_url,source_domain,confidence,'queued','AUTOPILOT A: exact normalized product name reused from previously successful Motil source.',v_user
  from targets;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- B: representative reuse is restricted to the allowlisted visual groups above.
  if v_count < p_limit then
    with approved_src as (
      select distinct on (vg)
        vg, c.source_url, c.image_url, c.source_domain,
        greatest(coalesce(c.confidence,0),0.91) as confidence
      from public.canonical_products_v1 cp
      join public.product_media_web_candidates c
        on c.canonical_product_id=cp.id and c.status='done'
      join public.product_media m
        on m.canonical_product_id=cp.id and m.status='approved' and m.source_type='web_source'
      cross join lateral (
        select public.motil_media_visual_group(cp.name,cp.family,cp.product_code) as vg
      ) g
      where vg is not null and c.source_url is not null and c.image_url is not null
      order by vg, c.confidence desc nulls last, c.updated_at desc
    ), targets as (
      select p.id,p.organization_id,a.*
      from public.canonical_products_v1 p
      cross join lateral (
        select public.motil_media_visual_group(p.name,p.family,p.product_code) as vg
      ) g
      join approved_src a on a.vg=g.vg
      where coalesce(p.is_active,true)
        and g.vg is not null
        and not exists (select 1 from public.product_media m where m.canonical_product_id=p.id and m.status in ('approved','pending'))
        and not exists (select 1 from public.product_media_web_candidates c where c.canonical_product_id=p.id)
      limit greatest(p_limit-v_count,0)
    )
    insert into public.product_media_web_candidates(organization_id,canonical_product_id,source_url,image_url,source_domain,confidence,status,error_message,requested_by_auth_user_id)
    select organization_id,id,source_url,image_url,source_domain,confidence,'queued',
      'AUTOPILOT B: approved representative internet image reused for visual group '||vg||'; dimensions/specification may differ.',v_user
    from targets;
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  if v_count < p_limit then
    insert into public.product_media_web_candidates(organization_id,canonical_product_id,source_url,image_url,source_domain,confidence,status,error_message,requested_by_auth_user_id)
    select p.organization_id,p.id,
      'https://www.cmatic.cl/shop/perno-hexagonal-grado-5-zincado-unc-3-4-10x3-4028',
      'https://www.cmatic.cl/web/image/product.template/4028/image_1920?unique=f175d7c',
      'cmatic.cl',0.91,'queued','AUTOPILOT B: representative standard hex bolt morphology; size/grade may differ.',v_user
    from public.canonical_products_v1 p
    where coalesce(p.is_active,true)
      and public.motil_media_visual_group(p.name,p.family,p.product_code)='fastener_hex_bolt_standard'
      and not exists (select 1 from public.product_media m where m.canonical_product_id=p.id and m.status in ('approved','pending'))
      and not exists (select 1 from public.product_media_web_candidates c where c.canonical_product_id=p.id)
    limit greatest(p_limit-v_count,0);
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  if v_count < p_limit then
    insert into public.product_media_web_candidates(organization_id,canonical_product_id,source_url,image_url,source_domain,confidence,status,error_message,requested_by_auth_user_id)
    select p.organization_id,p.id,
      'https://www.cmatic.cl/shop/tuerca-hexagonal-grado-5-zincado-unc-1-1-2-6-3951',
      'https://www.cmatic.cl/web/image/product.template/3951/image_1920?unique=b541fb1',
      'cmatic.cl',0.91,'queued','AUTOPILOT B: representative standard hex nut morphology; size/thread may differ.',v_user
    from public.canonical_products_v1 p
    where coalesce(p.is_active,true)
      and public.motil_media_visual_group(p.name,p.family,p.product_code)='fastener_hex_nut_standard'
      and not exists (select 1 from public.product_media m where m.canonical_product_id=p.id and m.status in ('approved','pending'))
      and not exists (select 1 from public.product_media_web_candidates c where c.canonical_product_id=p.id)
    limit greatest(p_limit-v_count,0);
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  if v_count < p_limit then
    insert into public.product_media_web_candidates(organization_id,canonical_product_id,source_url,image_url,source_domain,confidence,status,error_message,requested_by_auth_user_id)
    select p.organization_id,p.id,
      'https://www.cmatic.cl/shop/golilla-plana-cte-zincada-1-5-8-f-436-3950',
      'https://www.cmatic.cl/web/image/product.template/3950/image_1920?unique=f175d7c',
      'cmatic.cl',0.91,'queued','AUTOPILOT B: representative standard flat washer morphology; size may differ.',v_user
    from public.canonical_products_v1 p
    where coalesce(p.is_active,true)
      and public.motil_media_visual_group(p.name,p.family,p.product_code)='fastener_flat_washer'
      and not exists (select 1 from public.product_media m where m.canonical_product_id=p.id and m.status in ('approved','pending'))
      and not exists (select 1 from public.product_media_web_candidates c where c.canonical_product_id=p.id)
    limit greatest(p_limit-v_count,0);
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  if v_count < p_limit then
    insert into public.product_media_web_candidates(organization_id,canonical_product_id,source_url,image_url,source_domain,confidence,status,error_message,requested_by_auth_user_id)
    select p.organization_id,p.id,
      'https://www.cmatic.cl/shop/fusible-mini-paleta-electrico-15a-12v-4101',
      'https://www.cmatic.cl/web/image/product.template/4101/image_1920?unique=f175d7c',
      'cmatic.cl',0.91,'queued','AUTOPILOT B: representative mini blade fuse family; amperage/color may differ.',v_user
    from public.canonical_products_v1 p
    where coalesce(p.is_active,true)
      and public.motil_media_visual_group(p.name,p.family,p.product_code)='electrical_mini_blade_fuse'
      and not exists (select 1 from public.product_media m where m.canonical_product_id=p.id and m.status in ('approved','pending'))
      and not exists (select 1 from public.product_media_web_candidates c where c.canonical_product_id=p.id)
    limit greatest(p_limit-v_count,0);
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  if v_count < p_limit then
    insert into public.product_media_web_candidates(organization_id,canonical_product_id,source_url,image_url,source_domain,confidence,status,error_message,requested_by_auth_user_id)
    select p.organization_id,p.id,
      'https://www.cmatic.cl/shop/pe-pvc-negro-pg24-prensa-estopa-pvc-negra-para-cable-15-a-22mm-pg-24-3040',
      'https://www.cmatic.cl/web/image/product.template/3040/image_1920?unique=f175d7c',
      'cmatic.cl',0.91,'queued','AUTOPILOT B: representative PG cable gland morphology; PG size may differ.',v_user
    from public.canonical_products_v1 p
    where coalesce(p.is_active,true)
      and public.motil_media_visual_group(p.name,p.family,p.product_code)='electrical_pg_cable_gland'
      and not exists (select 1 from public.product_media m where m.canonical_product_id=p.id and m.status in ('approved','pending'))
      and not exists (select 1 from public.product_media_web_candidates c where c.canonical_product_id=p.id)
    limit greatest(p_limit-v_count,0);
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  return v_count;
end;
$function$;
