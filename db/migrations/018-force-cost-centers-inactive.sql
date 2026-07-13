update public.cost_centers
set status = 'inactive',
    updated_at = now()
where regexp_replace(code, '^0+', '') ~ '^[1-7](?:$|-)' 
   or code ~ '^0?[1-7](?:$|-)';
