revoke all on table public.contract_amendments from anon, authenticated;
revoke all on table public.equipment_fault_analytics from anon, authenticated;
revoke all on table public.maintenance_analytics_daily from anon, authenticated;
revoke all on table public.permissions from anon, authenticated;
revoke all on table public.person_competencies from anon, authenticated;
revoke all on table public.person_credentials from anon, authenticated;
revoke all on table public.person_epp_assignments from anon, authenticated;
revoke all on table public.production_drill_hole_location_evidence from anon, authenticated;
revoke all on table public.role_permissions from anon, authenticated;
revoke all on table public.roles from anon, authenticated;
revoke all on table public.technician_performance_analytics from anon, authenticated;
revoke all on table public.tire_lifecycle_analytics from anon, authenticated;
revoke all on table public.work_order_type_analytics from anon, authenticated;

grant all on table
  public.contract_amendments,
  public.equipment_fault_analytics,
  public.maintenance_analytics_daily,
  public.permissions,
  public.person_competencies,
  public.person_credentials,
  public.person_epp_assignments,
  public.production_drill_hole_location_evidence,
  public.role_permissions,
  public.roles,
  public.technician_performance_analytics,
  public.tire_lifecycle_analytics,
  public.work_order_type_analytics
to service_role;
