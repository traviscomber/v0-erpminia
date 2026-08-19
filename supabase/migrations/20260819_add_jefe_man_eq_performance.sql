insert into public.role_operational_kpi_definitions(cargo_id,kpi_key,label,unit,source_domain,source_object,aggregation_method,direction)
select c.id,v.kpi_key,v.label,v.unit,'maintenance','maintenance_work_orders',v.method,v.direction
from public.cargos c
join (values
 ('wo_closure_rate','Cierre de órdenes de trabajo','%','ratio','higher_is_better'),
 ('open_backlog','Backlog abierto','OT','count','lower_is_better'),
 ('mttr_hours','MTTR observado','h','avg','lower_is_better'),
 ('preventive_closure_rate','Cumplimiento preventivo observado','%','ratio','higher_is_better')
) v(kpi_key,label,unit,method,direction) on true
where c.name='JEFE MAN. EQ'
on conflict(cargo_id,kpi_key) do nothing;

insert into public.role_matrix(cargo_id,module_key,access_level)
select id,'core_desempeno','LEC' from public.cargos where name='JEFE MAN. EQ'
on conflict(cargo_id,module_key) do update set access_level=excluded.access_level;
