# Verificacion de base para importacion de Existencias

Ejecuta estas consultas en Supabase despues de aplicar `db/migrations/016-import-existencias-ready.sql`.

## 1. Confirmar tablas y columnas clave

```sql
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('suppliers', 'warehouse_stock', 'purchase_orders')
  and column_name in (
    'organization_id',
    'rut',
    'po_number',
    'vendor_name',
    'item_code',
    'quantity',
    'unit_price',
    'total_amount',
    'delivery_date',
    'status',
    'part_code',
    'part_name',
    'quantity_on_hand',
    'quantity_reserved',
    'reorder_level',
    'reorder_quantity',
    'unit_cost',
    'batch_number',
    'supplier_lot'
  )
order by table_name, column_name;
```

Resultado esperado:
- `suppliers` con `rut` y `organization_id`
- `warehouse_stock` con `part_code`, `batch_number`, `reorder_level`, `reorder_quantity`
- `purchase_orders` con `po_number`, `vendor_name`, `item_code`, `quantity`, `unit_price`, `total_amount`, `delivery_date`

## 2. Confirmar indice unico de orden de compra

```sql
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'purchase_orders'
order by indexname;
```

Resultado esperado:
- indice unico sobre `(organization_id, po_number)`

## 3. Confirmar que la importacion puede reescribir sin duplicar

```sql
select
  organization_id,
  po_number,
  count(*) as filas
from public.purchase_orders
group by organization_id, po_number
having count(*) > 1
order by filas desc, po_number;
```

Resultado esperado:
- cero filas

## 4. Confirmar stock min-max importado

```sql
select
  count(*) as total_stock_rows,
  count(*) filter (where batch_number = 'MINMAX') as filas_minmax
from public.warehouse_stock;
```

Resultado esperado:
- `filas_minmax` mayor que 0 si ya cargaste el Excel

## 5. Confirmar proveedores

```sql
select
  count(*) as total_proveedores,
  count(*) filter (where rut is not null and rut <> '') as con_rut
from public.suppliers;
```

Resultado esperado:
- debe haber proveedores cargados y varios con RUT

