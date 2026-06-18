# Phase 5: Agregar RLS Policies (Seguridad)

## Proteger bodega_inventory y finanzas_movements

### ¿Qué es RLS (Row Level Security)?

RLS permite controlar qué datos ve cada usuario basado en su rol. Sin RLS, todos los datos son públicos.

---

## Paso 1: Habilitar RLS en las tablas

Ejecuta esto en Supabase SQL Editor:

```sql
-- Enable RLS on bodega_inventory
ALTER TABLE bodega_inventory ENABLE ROW LEVEL SECURITY;

-- Enable RLS on finanzas_movements  
ALTER TABLE finanzas_movements ENABLE ROW LEVEL SECURITY;

-- Enable RLS on maintenance_work_orders
ALTER TABLE maintenance_work_orders ENABLE ROW LEVEL SECURITY;
```

---

## Paso 2: Crear Políticas de Lectura

```sql
-- bodega_inventory: Leer si el usuario está autenticado
CREATE POLICY "bodega_read_authenticated" ON bodega_inventory
  FOR SELECT
  USING (auth.role() = 'authenticated_user');

-- finanzas_movements: Leer si es admin o finanzas
CREATE POLICY "finanzas_read_allowed" ON finanzas_movements
  FOR SELECT
  USING (
    auth.role() = 'authenticated_user' 
    OR current_user_role() IN ('admin', 'finanzas_supervisor')
  );

-- maintenance_work_orders: Leer si está autenticado
CREATE POLICY "work_orders_read_authenticated" ON maintenance_work_orders
  FOR SELECT
  USING (auth.role() = 'authenticated_user');
```

---

## Paso 3: Crear Políticas de Inserción/Actualización

```sql
-- bodega_inventory: Solo admins pueden modificar
CREATE POLICY "bodega_write_admin" ON bodega_inventory
  FOR INSERT, UPDATE
  WITH CHECK (current_user_role() IN ('admin', 'bodega_supervisor'));

-- finanzas_movements: Solo finanzas puede modificar
CREATE POLICY "finanzas_write_admin" ON finanzas_movements
  FOR INSERT, UPDATE
  WITH CHECK (current_user_role() IN ('admin', 'finanzas_supervisor'));

-- maintenance_work_orders: Solo mantenimiento puede modificar
CREATE POLICY "work_orders_write_maintainer" ON maintenance_work_orders
  FOR INSERT, UPDATE
  WITH CHECK (current_user_role() IN ('admin', 'operaciones_supervisor'));
```

---

## Paso 4: Verificar que RLS está habilitado

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('bodega_inventory', 'finanzas_movements', 'maintenance_work_orders');
```

Expected output:
```
tablename                 | rowsecurity
bodega_inventory          | t
finanzas_movements        | t
maintenance_work_orders   | t
```

---

## Nota Importante

Este es un setup **básico** de RLS. En producción necesitarías:

1. Definir una tabla `user_roles` para mapear usuarios a roles
2. Usar funciones PL/pgSQL para obtener el rol actual del usuario
3. Crear políticas más específicas por organización/departamento
4. Agregar políticas de DELETE si es necesario

---

## Tiempo estimado: 5 minutos

Una vez completado, notifica para actualizar la memoria final y generar el reporte de conclusión.

---

## Alternativa: Comenzar sin RLS

Si prefieres, puedes dejar RLS para después y lanzar el sistema sin él. RLS es principalmente para seguridad multi-usuario. El sistema funcionará igual sin RLS pero los datos estarán públicos.

**Recomendación:** Implementa RLS antes de producción.
