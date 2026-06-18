# Phase 3: Add cost_center_id to finanzas_movements

## Requiere Ejecución Manual en Supabase Dashboard

Supabase no permite ejecutar ALTER TABLE vía API. Necesitas ejecutarlo directamente en el SQL Editor.

### Pasos:

1. **Abre Supabase Dashboard:**
   - URL: https://ttlptyheuqeotadtcbaw.supabase.co
   - Ve a: SQL Editor (en el menú izquierdo)

2. **Crea una nueva query:**
   - Click en "New Query"
   - Copia el siguiente SQL:

```sql
-- Phase 3: Add cost_center_id to finanzas_movements
ALTER TABLE finanzas_movements
ADD COLUMN IF NOT EXISTS cost_center_id UUID 
REFERENCES cost_centers(id) ON DELETE SET NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_finanzas_movements_cost_center_id 
ON finanzas_movements(cost_center_id);
```

3. **Ejecuta:**
   - Click en "Run" (botón azul)
   - Espera confirmación

4. **Verifica:**
   ```sql
   -- Run this to verify the column was added
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'finanzas_movements' 
   AND column_name = 'cost_center_id';
   ```

### Expected Result:
```
column_name        | data_type
cost_center_id     | uuid
```

---

## Qué hace este SQL:

- **ALTER TABLE**: Agrega la columna cost_center_id
- **IF NOT EXISTS**: Evita error si ya existe
- **UUID**: Mismo tipo que el ID de cost_centers
- **REFERENCES**: Vincula con cost_centers(id)
- **ON DELETE SET NULL**: Si se elimina un centro, el movimiento mantiene los datos pero CC se vuelve NULL
- **CREATE INDEX**: Para queries rápidas por cost_center

---

## Tiempo estimado: 2 minutos

Una vez completado, notifica para continuar con Phase 4 (Work Orders).
