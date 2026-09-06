alter table public.production_geology_hypotheses enable row level security;
alter table public.production_geology_hypothesis_events enable row level security;

revoke execute on function public.capture_production_geology_hypothesis_event() from public, anon, authenticated;
revoke execute on function public.log_production_geology_hypothesis_event() from public, anon, authenticated;

grant execute on function public.capture_production_geology_hypothesis_event() to service_role;
grant execute on function public.log_production_geology_hypothesis_event() to service_role;

comment on table public.production_geology_hypotheses is 'Server-mediated, human-review workflow for derived geological hypotheses. RLS is enabled with no end-user policies; rows are review-layer objects and never source geological facts.';
comment on table public.production_geology_hypothesis_events is 'Server-mediated append-only audit history for geological hypothesis review. RLS is enabled with no end-user policies.';
