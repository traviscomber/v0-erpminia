# Phase 4: Assign Work Orders to Cost Centers

## 4 Work Orders Pendientes de Asignación

### Work Orders a Asignar:

1. **WO-2026-0003**: Cambio de sello mecánico
   - Descripción: Reemplazo de sello mecánico en bomba principal
   - Ubicación probable: 1-8 Mantención (Equipment maintenance)
   - Sugerencia: Asignar a **1-8 Mantención**

2. **WO-2026-0004**: Tensado y alineación de correa
   - Descripción: Alineación y tensado de correas de transmisión
   - Ubicación probable: 1-9 Camionetas o Mantención
   - Sugerencia: Asignar a **1-8 Mantención**

3. **WO-2026-0001**: Inspección preventiva sistema hidráulico
   - Descripción: Revisión preventiva de sistema hidráulico
   - Ubicación probable: 1-8 Mantención
   - Sugerencia: Asignar a **1-8 Mantención**

4. **WO-2026-0002**: Análisis de vibración molino SAG
   - Descripción: Análisis de vibraciones en molino SAG
   - Ubicación probable: Planta de procesamiento
   - Sugerencia: Asignar a **1 Mina Peumo** (main cost center)

---

## Centros de Costos Disponibles:

```
1 Mina Peumo               (Main mining operation)
1-1 Mina                   (Mining operations)
1-2 Supervisión            (Supervision)
1-3 Perforación Liviana    (Light drilling)
1-4 Tronadura              (Blasting)
1-5 Cargüío                (Loading)
1-6 Desagüe                (Drainage)
1-7 Perforación Mecánica   (Mechanical drilling)
1-8 Mantención             (Maintenance)
1-9 Camionetas             (Trucks)
... y 267 más
```

---

## Opción A: Asignación Manual en Supabase Dashboard

1. **Abre Supabase SQL Editor**

2. **Ejecuta este SQL para cada work order:**

```sql
-- Opción 1: Asignar WO-2026-0003 a 1-8 Mantención
UPDATE maintenance_work_orders 
SET cost_center_id = (
  SELECT id FROM cost_centers 
  WHERE code = '1-8 Mantención' 
  LIMIT 1
)
WHERE work_order_number = 'WO-2026-0003';

-- Opción 2: Asignar WO-2026-0004 a 1-8 Mantención
UPDATE maintenance_work_orders 
SET cost_center_id = (
  SELECT id FROM cost_centers 
  WHERE code = '1-8 Mantención' 
  LIMIT 1
)
WHERE work_order_number = 'WO-2026-0004';

-- Opción 3: Asignar WO-2026-0001 a 1-8 Mantención
UPDATE maintenance_work_orders 
SET cost_center_id = (
  SELECT id FROM cost_centers 
  WHERE code = '1-8 Mantención' 
  LIMIT 1
)
WHERE work_order_number = 'WO-2026-0001';

-- Opción 4: Asignar WO-2026-0002 a 1 Mina Peumo
UPDATE maintenance_work_orders 
SET cost_center_id = (
  SELECT id FROM cost_centers 
  WHERE code = '1 Mina Peumo' 
  LIMIT 1
)
WHERE work_order_number = 'WO-2026-0002';
```

3. **Verifica que las asignaciones fueron correctas:**

```sql
SELECT work_order_number, 
       title, 
       cost_center_id,
       cc.code,
       cc.name
FROM maintenance_work_orders wo
LEFT JOIN cost_centers cc ON wo.cost_center_id = cc.id
ORDER BY work_order_number;
```

---

## Opción B: Asignación Masiva en una sola query

```sql
-- Assign all 4 work orders at once
UPDATE maintenance_work_orders 
SET cost_center_id = cc.id
FROM cost_centers cc
WHERE 
  (work_order_number = 'WO-2026-0001' AND cc.code = '1-8 Mantención') OR
  (work_order_number = 'WO-2026-0002' AND cc.code = '1 Mina Peumo') OR
  (work_order_number = 'WO-2026-0003' AND cc.code = '1-8 Mantención') OR
  (work_order_number = 'WO-2026-0004' AND cc.code = '1-8 Mantención');
```

---

## Opción C: Usando Node.js (desde terminal)

Si prefieres automatizar:

```bash
cd /vercel/share/v0-project

SUPABASE_URL="$(grep '^SUPABASE_URL' .env.development.local | cut -d= -f2-)" \
SUPABASE_SERVICE_ROLE_KEY="$(grep '^SUPABASE_SERVICE_ROLE_KEY' .env.development.local | cut -d= -f2-)" \
node << 'SCRIPT'
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Get the center IDs
  const { data: centers } = await s.from('cost_centers')
    .select('id,code')
    .in('code', ['1-8 Mantención', '1 Mina Peumo']);

  const centerMap = {};
  centers.forEach(c => centerMap[c.code] = c.id);

  // Update work orders
  const updates = [
    { wo: 'WO-2026-0001', cc: centerMap['1-8 Mantención'] },
    { wo: 'WO-2026-0002', cc: centerMap['1 Mina Peumo'] },
    { wo: 'WO-2026-0003', cc: centerMap['1-8 Mantención'] },
    { wo: 'WO-2026-0004', cc: centerMap['1-8 Mantención'] }
  ];

  for (const update of updates) {
    await s.from('maintenance_work_orders')
      .update({ cost_center_id: update.cc })
      .eq('work_order_number', update.wo);
    console.log(`✓ Updated ${update.wo}`);
  }
})();
SCRIPT
```

---

## Verificación Final

```sql
-- Verify all work orders have cost_center_id assigned
SELECT 
  work_order_number,
  title,
  cc.code,
  cc.name,
  CASE 
    WHEN cost_center_id IS NOT NULL THEN '✓ ASSIGNED'
    ELSE '✗ UNASSIGNED'
  END as status
FROM maintenance_work_orders wo
LEFT JOIN cost_centers cc ON wo.cost_center_id = cc.id
ORDER BY work_order_number;
```

---

## Expected Result:

```
work_order_number | title                              | code            | name            | status
WO-2026-0001      | Inspección preventiva hidráulico   | 1-8 Mantención  | Mantención      | ✓ ASSIGNED
WO-2026-0002      | Análisis de vibración molino SAG   | 1 Mina Peumo    | 1 Mina Peumo    | ✓ ASSIGNED
WO-2026-0003      | Cambio de sello mecánico           | 1-8 Mantención  | Mantención      | ✓ ASSIGNED
WO-2026-0004      | Tensado y alineación de correa     | 1-8 Mantención  | Mantención      | ✓ ASSIGNED
```

---

## Tiempo estimado: 10 minutos

Elige la opción que te resulte más cómoda (A, B o C) y ejecuta.
Una vez completado, notifica para proceder con Phase 5 (RLS Policies).
