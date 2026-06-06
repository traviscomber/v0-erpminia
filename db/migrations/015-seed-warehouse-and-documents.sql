-- Seed minimo productivo para Bodega + Flujo documental
-- Prioriza la organizacion del usuario juan@n3uralia.com y cae al primer profile con organization_id

with seed_user as (
    select
        p.id as user_id,
        p.organization_id,
        coalesce(p.email, u.email) as email
    from public.profiles p
    left join public.users u on u.id = p.id
    where p.organization_id is not null
    order by
        case when coalesce(p.email, u.email) = 'juan@n3uralia.com' then 0 else 1 end,
        p.created_at asc nulls last
    limit 1
),
zone_upsert as (
    insert into public.warehouse_zones (organization_id, zone_code, zone_name, description)
    select organization_id, 'BOD-01', 'Bodega Principal', 'Bodega operativa principal de faena'
    from seed_user
    on conflict (organization_id, zone_code) do update
    set zone_name = excluded.zone_name,
        description = excluded.description
    returning id, organization_id
),
rack_a as (
    insert into public.warehouse_racks (zone_id, rack_code, rack_name, capacity_units)
    select id, 'A', 'Rack A', 120
    from zone_upsert
    on conflict (zone_id, rack_code) do update
    set rack_name = excluded.rack_name,
        capacity_units = excluded.capacity_units
    returning id
),
rack_b as (
    insert into public.warehouse_racks (zone_id, rack_code, rack_name, capacity_units)
    select id, 'B', 'Rack B', 120
    from zone_upsert
    on conflict (zone_id, rack_code) do update
    set rack_name = excluded.rack_name,
        capacity_units = excluded.capacity_units
    returning id
)
insert into public.warehouse_bins (rack_id, bin_code, bin_location, capacity_units, current_stock)
select rack_id, bin_code, bin_location, capacity_units, current_stock
from (
    select (select id from rack_a limit 1) as rack_id, '01' as bin_code, 'A-01-01' as bin_location, 60 as capacity_units, 0 as current_stock
    union all
    select (select id from rack_a limit 1), '02', 'A-01-02', 60, 0
    union all
    select (select id from rack_b limit 1), '01', 'B-01-01', 60, 0
    union all
    select (select id from rack_b limit 1), '02', 'B-01-02', 60, 0
) bins
where rack_id is not null
on conflict (rack_id, bin_code) do update
set
    bin_location = excluded.bin_location,
    capacity_units = excluded.capacity_units;

with seed_user as (
    select
        p.id as user_id,
        p.organization_id,
        coalesce(p.email, u.email) as email
    from public.profiles p
    left join public.users u on u.id = p.id
    where p.organization_id is not null
    order by
        case when coalesce(p.email, u.email) = 'juan@n3uralia.com' then 0 else 1 end,
        p.created_at asc nulls last
    limit 1
),
bins as (
    select
        wb.id,
        wb.bin_location,
        wz.organization_id
    from public.warehouse_bins wb
    join public.warehouse_racks wr on wr.id = wb.rack_id
    join public.warehouse_zones wz on wz.id = wr.zone_id
    join seed_user su on su.organization_id = wz.organization_id
)
insert into public.warehouse_stock (
    organization_id,
    part_code,
    part_name,
    bin_id,
    quantity_on_hand,
    quantity_reserved,
    reorder_level,
    reorder_quantity,
    unit_cost,
    last_counted_date,
    batch_number,
    supplier_lot,
    updated_at
)
select
    b.organization_id,
    s.part_code,
    s.part_name,
    b.id,
    s.quantity_on_hand,
    s.quantity_reserved,
    s.reorder_level,
    s.reorder_quantity,
    s.unit_cost,
    current_date,
    s.batch_number,
    s.supplier_lot,
    now()
from (
    select 'A-01-01' as bin_location, 'FLT-001' as part_code, 'Filtro hidráulico principal' as part_name, 18 as quantity_on_hand, 2 as quantity_reserved, 10 as reorder_level, 20 as reorder_quantity, 45000::numeric as unit_cost, 'LOT-2026-001' as batch_number, 'SUP-HID-001' as supplier_lot
    union all
    select 'A-01-02', 'ROD-002', 'Rodamiento molino SAG', 2, 0, 3, 4, 380000::numeric, 'LOT-2026-002', 'SUP-SAG-004'
    union all
    select 'B-01-01', 'SEL-003', 'Sello mecánico bomba relaves', 0, 0, 2, 3, 125000::numeric, 'LOT-2026-003', 'SUP-BMB-002'
    union all
    select 'B-01-02', 'COR-004', 'Kit alineación correa', 6, 1, 4, 6, 78000::numeric, 'LOT-2026-004', 'SUP-CNV-003'
) s
join bins b on b.bin_location = s.bin_location
on conflict (organization_id, part_code, batch_number) do update
set
    part_name = excluded.part_name,
    bin_id = excluded.bin_id,
    quantity_on_hand = excluded.quantity_on_hand,
    quantity_reserved = excluded.quantity_reserved,
    reorder_level = excluded.reorder_level,
    reorder_quantity = excluded.reorder_quantity,
    unit_cost = excluded.unit_cost,
    supplier_lot = excluded.supplier_lot,
    updated_at = now();

with seed_user as (
    select
        p.id as user_id,
        p.organization_id,
        coalesce(p.email, u.email) as email,
        coalesce(u.full_name, p.full_name, trim(concat_ws(' ', p.first_name, p.last_name)), 'Juan Admin') as full_name
    from public.profiles p
    left join public.users u on u.id = p.id
    where p.organization_id is not null
    order by
        case when coalesce(p.email, u.email) = 'juan@n3uralia.com' then 0 else 1 end,
        p.created_at asc nulls last
    limit 1
)
insert into public.documents (
    organization_id,
    document_number,
    title,
    description,
    category,
    document_type,
    status,
    priority,
    version,
    current_file_url,
    current_file_path,
    file_size_mb,
    file_mime_type,
    effective_date,
    expiry_date,
    sernageomin_requirement,
    created_by,
    created_at,
    updated_at,
    submitted_at,
    submitted_by,
    approved_at,
    approved_by,
    search_text
)
select
    su.organization_id,
    d.document_number,
    d.title,
    d.description,
    d.category,
    d.document_type,
    d.status,
    d.priority,
    1,
    d.current_file_url,
    d.current_file_path,
    d.file_size_mb,
    d.file_mime_type,
    d.effective_date,
    d.expiry_date,
    d.sernageomin_requirement,
    su.user_id,
    now() - d.created_offset,
    now(),
    case when d.status in ('submitted', 'under_review', 'approved') then now() - d.submitted_offset else null end,
    case when d.status in ('submitted', 'under_review', 'approved') then su.user_id else null end,
    case when d.status = 'approved' then now() - interval '2 days' else null end,
    case when d.status = 'approved' then su.user_id else null end,
    concat_ws(' ', d.title, d.description, d.category, d.document_number)
from seed_user su
cross join (
    values
        (
            'DOC-COMP-001',
            'Matriz de Cumplimiento SERNAGEOMIN 2026',
            'Documento base de cumplimiento regulatorio para auditorias y revisiones legales.',
            'compliance',
            'matrix',
            'approved',
            'high',
            '/documents/compliance/matriz-sernageomin-2026.pdf',
            '/documents/compliance/matriz-sernageomin-2026.pdf',
            2.4::numeric,
            'application/pdf',
            current_date - 90,
            current_date + 180,
            true,
            interval '12 days',
            interval '10 days'
        ),
        (
            'DOC-REG-002',
            'Permiso Operacional de Relaves',
            'Permiso regulatorio vigente asociado a la operacion de relaves.',
            'regulatory',
            'permit',
            'under_review',
            'critical',
            '/documents/regulatory/permiso-relaves.pdf',
            '/documents/regulatory/permiso-relaves.pdf',
            1.7::numeric,
            'application/pdf',
            current_date - 30,
            current_date + 25,
            true,
            interval '7 days',
            interval '6 days'
        ),
        (
            'DOC-HSE-003',
            'Procedimiento de Trabajo Seguro en Altura',
            'Procedimiento operativo y de seguridad con trazabilidad de aprobacion.',
            'sostenibilidad',
            'procedure',
            'submitted',
            'normal',
            '/documents/sostenibilidad/pts-altura.pdf',
            '/documents/sostenibilidad/pts-altura.pdf',
            1.2::numeric,
            'application/pdf',
            current_date - 15,
            current_date + 365,
            false,
            interval '4 days',
            interval '4 days'
        )
) as d(
    document_number,
    title,
    description,
    category,
    document_type,
    status,
    priority,
    current_file_url,
    current_file_path,
    file_size_mb,
    file_mime_type,
    effective_date,
    expiry_date,
    sernageomin_requirement,
    created_offset,
    submitted_offset
)
where not exists (
    select 1
    from public.documents existing
    where existing.organization_id = su.organization_id
      and existing.document_number = d.document_number
);

with seed_user as (
    select
        p.id as user_id,
        p.organization_id,
        coalesce(u.full_name, p.full_name, trim(concat_ws(' ', p.first_name, p.last_name)), 'Juan Admin') as full_name
    from public.profiles p
    left join public.users u on u.id = p.id
    where p.organization_id is not null
    order by
        case when coalesce(p.email, u.email) = 'juan@n3uralia.com' then 0 else 1 end,
        p.created_at asc nulls last
    limit 1
),
docs as (
    select id, document_number, status
    from public.documents
    where organization_id = (select organization_id from seed_user)
      and document_number in ('DOC-COMP-001', 'DOC-REG-002', 'DOC-HSE-003')
),
approval_rows as (
    select
        d.id as document_id,
        a.approval_level,
        a.approval_level_name,
        a.required_role,
        a.status,
        a.comments
    from docs d
    join (
        values
            ('DOC-COMP-001', 1, 'Jefe de Sostenibilidad', 'jefe_sostenibilidad', 'approved', 'Revision legal completada'),
            ('DOC-COMP-001', 2, 'Gerente General', 'gerente_general', 'approved', 'Aprobacion final emitida'),
            ('DOC-REG-002', 1, 'Jefe de Sostenibilidad', 'jefe_sostenibilidad', 'approved', 'Validacion tecnica completada'),
            ('DOC-REG-002', 2, 'Gerente General', 'gerente_general', 'pending', null),
            ('DOC-HSE-003', 1, 'Jefe de Sostenibilidad', 'jefe_sostenibilidad', 'pending', null),
            ('DOC-HSE-003', 2, 'Gerente General', 'gerente_general', 'pending', null)
    ) as a(document_number, approval_level, approval_level_name, required_role, status, comments)
      on a.document_number = d.document_number
)
insert into public.document_approvals (
    document_id,
    approval_level,
    approval_level_name,
    required_role,
    status,
    assigned_to,
    assigned_to_name,
    approved_by,
    approved_by_name,
    comments,
    approved_at,
    submitted_for_review_at,
    created_at,
    updated_at
)
select
    ar.document_id,
    ar.approval_level,
    ar.approval_level_name,
    ar.required_role,
    ar.status,
    su.user_id,
    su.full_name,
    case when ar.status = 'approved' then su.user_id else null end,
    case when ar.status = 'approved' then su.full_name else null end,
    ar.comments,
    case when ar.status = 'approved' then now() - interval '2 days' else null end,
    now() - interval '4 days',
    now() - interval '4 days',
    now()
from approval_rows ar
cross join seed_user su
where not exists (
    select 1
    from public.document_approvals existing
    where existing.document_id = ar.document_id
      and existing.approval_level = ar.approval_level
);

with docs as (
    select id, title, created_by
    from public.documents
    where document_number in ('DOC-COMP-001', 'DOC-REG-002', 'DOC-HSE-003')
)
insert into public.document_audit_logs (document_id, action, user_id, details, created_at)
select
    d.id,
    'created',
    d.created_by,
    concat('Documento inicializado para MVP: ', d.title),
    now() - interval '3 days'
from docs d
where not exists (
    select 1
    from public.document_audit_logs existing
    where existing.document_id = d.id
      and existing.action = 'created'
);
