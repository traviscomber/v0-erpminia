# AUDITORÍA PROFUNDA DE DATOS - MOTIL MVP
**Fecha**: Junio 18, 2026  
**Status**: ⚠️ ISSUES ENCONTRADOS (3 prioritarios)

---

## 📊 RESUMEN EJECUTIVO

| Aspecto | Estado | Detalles |
|---------|--------|----------|
| Bodega (5,104 items) | ⚠️ PARCIAL | 1,000 items sin datos de cantidad/costo |
| Cost Centers (277) | ❌ DUPLICADO | 554 registros (exactamente el doble) |
| Finanzas (5 movimientos) | ✓ OK | Balance: -$208,500 (activos - pasivos) |
| Mantenimiento (4 OTs) | ❌ INCOMPLETO | 0/4 work orders tienen cost_center_id |
| Integraciones | ⚠️ PARCIAL | CC no propagado a finanzas_movements |

---

## 1️⃣ BODEGA INVENTORY - DATOS INCOMPLETOS

### Status: ⚠️ REQUIERE LIMPIEZA

**Hallazgos:**
- ✓ Total items: 5,104
- ✓ NULL SKUs: 0 (excelente)
- ✓ Empty categories: 0 (excelente)
- ❌ Zero quantity items: 1,000 (19.6% del inventario)
- ❌ NULL unit_cost: 1,000 (19.6% del inventario)
- ✓ Duplicate SKUs: 0 (perfecto)
- ✓ Unique categories: 17 categorías (bien)

**Items Afectados:**
```
Acero039 | Curva Fierro 90° 4' | Qty:0 | Cost:0
Acero041 | Curva Fierro 90° 6' | Qty:0 | Cost:0
Acero042 | Curva Fierro 90° 8' | Qty:0 | Cost:0
... (997 más)
```

**Acción Recomendada:**
- [ ] Investigar si estos 1,000 items son placeholders o datos de prueba
- [ ] Si son placeholders: ELIMINAR
- [ ] Si son válidos: COMPLETAR con datos reales de inventario
- [ ] Crear script para marcar items incompletos con flag `incomplete=true`

**Prioridad:** MEDIA

---

## 2️⃣ COST CENTERS - DUPLICACIÓN EXACTA

### Status: ❌ CRÍTICO - REQUIERE REPARACIÓN INMEDIATA

**Hallazgo:**
```
Expected: 277 centros de costos
Actual:   554 registros (exactamente 2x)
```

**Análisis:**
- No hay duplicación por CÓDIGO (Los codes son únicos)
- Parece ser que se corrió la migración dos veces OR
- Hubo un UPSERT fallido que creó duplicados
- Todos marcados como `status='active'`

**Ejemplos:**
```
01 | Presupuesto Of. La Ligua
02 | Presupuesto Of. Santiago
03 | Costo de Explotación
1  | Mina Peumo
10 | Cargadores de Bajo Perfil
...
```

**Acción Requerida:**
- [ ] Identificar IDs duplicados (el segundo batch)
- [ ] Crear backup antes de eliminar
- [ ] Eliminar 277 registros duplicados
- [ ] Verificar integridad referencial en tablas relacionadas

**Prioridad:** CRÍTICO

---

## 3️⃣ MANTENIMIENTO - INTEGRACIÓN INCOMPLETA

### Status: ❌ WORK ORDERS SIN COST CENTER

**Work Orders Existentes:**
```
WO-2026-0001 | Inspección preventiva sistema hidráulico     | CC: NO
WO-2026-0002 | Análisis de vibración molino SAG             | CC: NO
WO-2026-0003 | Cambio de sello mecánico                     | CC: NO
WO-2026-0004 | Tensado y alineación de correa               | CC: NO
```

**Total:** 4 work orders | **Con CC**: 0 | **Sin CC**: 4 (100%)

**Por Status:**
- Completed: 1
- Open: 2
- In Progress: 1

**Problema:**
Las work orders fueron creadas ANTES de que la integración de cost_center_id fuera activa. El formulario actual tiene el selector, pero las OT antiguas no se migraron.

**Acción Recomendada:**
- [ ] Crear UI para editar cost_center de work orders existentes
- [ ] O: Ejecutar migration script para asignar automáticamente
- [ ] Verificar que nuevas OT guarden cost_center_id correctamente

**Prioridad:** ALTA (bloquea reporting)

---

## 4️⃣ FINANZAS - FALTA INTEGRACIÓN CC

### Status: ⚠️ CAMPO cost_center_id NO EXISTE

**Datos Actuales:**
- Total movimientos: 5
- Ingresos: $180,000
- Egresos: $388,500
- Balance: -$208,500 (pasivo)

**Columnas Disponibles:**
```
id, date, category, description, amount, type, project, 
approved_by, status, created_at, updated_at
```

**PROBLEMA:** NO EXISTE `cost_center_id` en finanzas_movements

**Movimientos Actuales:**
```
egreso: $15,000   | CC: null
egreso: $320,000  | CC: null
egreso: $45,000   | CC: null
ingreso: $180,000 | CC: null
egreso: $8,500    | CC: null
```

**Acción Requerida:**
- [ ] Agregar columna `cost_center_id` a finanzas_movements
- [ ] Ejecutar FASE 2 migration parte 2 (si no se ejecutó completamente)
- [ ] Actualizar UI de finanzas para requerir/asignar CC

**Prioridad:** ALTA

---

## 5️⃣ RESUMEN DE CATEGORÍAS EN BODEGA

**17 Categorías Detectadas:**
```
1. Acero
2. Repuesto
3. Ferretería
4. Lubricante
5. Víveres
6. Cinta
7. Combustible
8. Compo (¿incompleto?)
9. Coraza
10. EPP
... (7 más)
```

**Nota:** Categoría "Compo" parece incompleta. Revisar si es "Componente" truncado.

---

## 📋 PLAN DE ACCIÓN INMEDIATO

### Fase 1: Limpieza (HOY)
1. **Cost Centers**: Eliminar 277 duplicados
   ```sql
   DELETE FROM cost_centers WHERE id IN (
     SELECT id FROM (
       SELECT id, ROW_NUMBER() OVER (PARTITION BY code ORDER BY created_at DESC) 
       FROM cost_centers
     ) WHERE row_number > 1
   );
   ```

2. **Bodega Items**: Marcar/eliminar 1,000 items incompletos
   ```sql
   -- Opción 1: Marcar como draft
   UPDATE bodega_inventory SET status='draft' WHERE quantity=0 AND unit_cost=0;
   
   -- Opción 2: Eliminar completamente
   DELETE FROM bodega_inventory WHERE quantity=0 AND unit_cost=0;
   ```

### Fase 2: Integración (ESTA SEMANA)
1. Ejecutar FASE 2 migration completamente (si no se ejecutó parte 2)
2. Agregar cost_center_id a finanzas_movements
3. Migrar work orders existentes con CC asignado
4. Actualizar formularios UI para ser requeridos CC

### Fase 3: Validación (PRÓXIMA SEMANA)
1. Crear tests de integridad referencial
2. Verificar cascadas de delete/update
3. Documentar SLA de datos
4. Implementar monitoreo continuo

---

## ✅ DATOS QUE ESTÁN BIEN

- ✓ Bodega SKUs: 0 duplicados, 0 nulls
- ✓ Bodega Categories: 17 bien definidas
- ✓ Cost Centers estructura: Correcta (solo duplicación)
- ✓ Work Orders: Creadas correctamente (solo faltan CC)
- ✓ Finanzas balances: Números coherentes

---

## 🔐 RECOMENDACIONES DE SEGURIDAD

1. **RLS Status**: Revisar que todas las tablas tengan RLS habilitado
   - bodega_inventory: ❌ SIN RLS
   - finanzas_movements: ❌ SIN RLS
   - Agregar RLS en próxima sprint

2. **Backups**: Hacer backup ANTES de eliminar duplicados

3. **Auditoría**: Todos los delete/update deben loguear en audit_log

---

## 📞 PRÓXIMOS PASOS

Contacto para aprobación de limpieza:
- [ ] Ejecutar Fase 1 (cost center cleanup)
- [ ] Ejecutar Fase 2 (integración CC)
- [ ] Validar Fase 3 (tests y monitoring)

**Estimado:** 4-6 horas de trabajo | **Riesgo:** BAJO (cambios son limpios)
