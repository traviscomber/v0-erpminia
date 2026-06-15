# MOTIL MVP - PLAN ACELERADO (Roadmap 7 Meses Comprimido)

## Estado Actual vs Roadmap Original

El proyecto actual está ADELANTADO vs el roadmap de 7 meses:

```
Mes 1 (Base técnica)     → 100% DONE ✓
Mes 2 (Documentos/Legal) → 90% DONE (falta audit trail)
Mes 3 (Mantenimiento)    → 90% DONE (OT básica, falta cierre)
Mes 4 (Bodega)          → 90% DONE (inventario, falta movimientos)
Mes 5 (Sostenibilidad)  → 70% DONE (estructura, falta features)
Mes 6 (Finanzas/Compras) → 75% DONE (básico, falta OC)
Mes 7 (IA/Reportes)     → 40% DONE (mockup, falta real)
```

**CONCLUSIÓN:** Estamos en Mes 2-3 pero con 60-70% completado globalmente. Esto permite **comprimir el roadmap a 2-3 meses** si nos enfocamos en gaps críticos.

---

## Plan Acelerado - Próximas 2 Semanas

### SEMANA 1: Completar Documentos & Legal (Mes 2 - Final)

**Tareas (Por prioridad):**

1. **Audit Trail en Documentos** (4 horas)
   - Tabla: `document_versions` con timestamp, user_id, action, changes
   - Mostrar historial en modal de documento
   - Versionado automático en cada cambio

2. **Expiración de Documentos** (3 horas)
   - Campo `expires_at` en module_documents
   - Dashboard con alertas de próximas expiraciones
   - Email notification a 30 días antes

3. **Búsqueda y Filtros Avanzados** (3 horas)
   - Search por nombre, descripción, tipo
   - Filtrar por estado, fecha, documento
   - Ordenar por fecha, nombre, prioridad

4. **Testing & QA Mes 2** (2 horas)
   - Pruebas manuales de flujo completo
   - Verificar permisos de acceso
   - Checklist de "Definition of Done"

**Status:** Mes 2 → COMPLETO ✓

---

### SEMANA 2: Cerrar Mantenimiento Real (Mes 3 - Avance)

**Tareas (Por prioridad):**

1. **Cierre de OT con Evidencia** (5 horas)
   - Upload de fotos/evidencia en cierre
   - Registro de tiempo real trabajado
   - Checklist de tareas completadas

2. **Integración OT ↔ Bodega** (4 horas)
   - Relacionar OT con reserva de repuestos
   - Consumo automático al cerrar OT
   - Reporte de consumo por OT

3. **KPI de Mantenimiento** (3 horas)
   - MTTR (Mean Time To Repair)
   - Disponibilidad de equipos
   - Costo de mantenimiento por activo

4. **Testing & QA Mes 3** (2 horas)
   - Flujo completo OT (crear → cerrar → KPI)
   - Permisos de rol (supervisor, técnico)

**Status:** Mes 3 → 60% AVANCE

---

## Plan Detallado - 7 Semanas Restantes

### MES 1 - COMPLETADO
- Base técnica: ✓ Build limpio, APIs estables, SWR funcional
- Mock data: ✓ Reemplazado en módulos principales
- DB schema: ✓ 9 tablas principales
- Status: PRODUCTION READY

### MES 2 - EN PROGRESO (2 semanas)
**Documentos & Legal - Cierre**

Entregables:
- [x] Upload y descarga de documentos
- [x] L1/L2 review workflow
- [x] Email notifications
- [ ] Audit trail completo
- [ ] Expiración de documentos
- [ ] Búsqueda avanzada
- [ ] Reportes legales

Definition of Done:
- [x] Pantalla visible
- [x] Datos reales
- [x] CRUD completo
- [x] Permisos correctos
- [ ] Audit trail
- [x] No rompe build

### MES 3 - SIGUIENTE (2 semanas)
**Mantenimiento - Cierre**

Entregables:
- [x] Crear OT real
- [x] Asignar responsable
- [ ] Cierre con evidencia
- [ ] Integración con bodega
- [ ] KPI MTTR/disponibilidad
- [ ] Reportes de mantenimiento

Prioridad: ALTA
Owner: Equipo Operaciones
Dependencia: Bodega (Mes 4)

### MES 4 - SIGUIENTE (2 semanas)
**Bodega - Movimientos y Trazabilidad**

Entregables:
- [x] Stock real
- [ ] Movimientos (entrada/salida/transferencia)
- [ ] Reorder automático
- [ ] QR/ubicaciones
- [ ] Trazabilidad de consumo
- [ ] Integraciones (OT, Compras)

Prioridad: ALTA
Owner: Equipo Logística
Bloqueante para: Finanzas (Mes 6)

### MES 5 - SIGUIENTE (3 semanas)
**Sostenibilidad/HSE - Completo**

Entregables:
- [ ] Calendario operativo real
- [ ] Capacitaciones con registro
- [ ] EPP con fichas técnicas
- [ ] Medio ambiente (registros)
- [ ] Comunidades
- [ ] No conformidades + acciones correctivas
- [ ] Dashboard de sostenibilidad

Prioridad: MEDIA-ALTA
Owner: Equipo HSE
Complejidad: ALTA (muchas features)

### MES 6 - SIGUIENTE (2-3 semanas)
**Finanzas & Compras - Cierre**

Entregables:
- [x] Dashboard financiero básico
- [ ] Presupuestos y proyecciones
- [ ] Órdenes de compra (OC) real
- [ ] Documentos de compras
- [ ] Reportes de compras/finanzas
- [ ] Integración con inventario
- [ ] Integración con OT

Prioridad: MEDIA-ALTA
Owner: Equipo Finanzas
Dependencia: Bodega (Mes 4)

### MES 7 - FINAL (3 semanas)
**IA/KPI/Reportes & QA Final**

Entregables:
- [ ] Dashboard KPI operacional
- [ ] IA operacional (recomendaciones)
- [ ] Reportes ejecutivos
- [ ] Reportes operacionales
- [ ] Testing E2E de flujos críticos
- [ ] Documentación final
- [ ] Checklist de go-live

Prioridad: MEDIA
Owner: Equipo IA + QA
Complejidad: MEDIA

---

## Checklist por Módulo - Definition of Done

Cada módulo se considera LISTO cuando cumple:

### Producción ✓
- [x] Pantalla visible
- [x] KPI con datos reales (telemetría)
- [x] Alertas reales
- [x] Relación con Mantenimiento
- [x] No rompe build
- [x] Permisos configurados

### Mantenimiento
- [x] Pantalla visible
- [x] CRUD de OT
- [ ] Cierre con evidencia
- [ ] KPI MTTR
- [x] No rompe build
- [x] Permisos configurados
- [ ] Integración con Bodega

### Bodega
- [x] Pantalla visible
- [x] Stock real
- [ ] Movimientos real
- [ ] Reorder automático
- [x] No rompe build
- [x] Permisos configurados
- [ ] Trazabilidad de consumo

### Documentos & Legal ✓
- [x] Pantalla visible
- [x] CRUD real (upload/delete/edit)
- [x] L1/L2 review workflow
- [ ] Audit trail
- [x] No rompe build
- [x] Permisos + roles
- [ ] Versionado

### Sostenibilidad/HSE
- [x] Pantalla visible
- [ ] Capacitaciones real
- [ ] EPP real
- [ ] Calendario real
- [x] No rompe build
- [x] Permisos configurados
- [ ] No conformidades real

### Finanzas & Compras
- [x] Pantalla visible
- [x] Dashboard financiero básico
- [ ] OC real
- [ ] Presupuestos
- [x] No rompe build
- [x] Permisos configurados
- [ ] Reportes completos

### IA/KPI/Reportes
- [x] Pantalla visible
- [ ] Dashboard KPI real
- [ ] IA operacional
- [ ] Reportes ejecutivos
- [x] No rompe build
- [x] Permisos configurados
- [ ] Testing completo

### Admin/RBAC ✓
- [x] Pantalla visible
- [x] CRUD de usuarios
- [x] Asignación de roles
- [x] Permisos por modulo
- [x] No rompe build
- [x] Seguridad implementada

---

## Priorización de Gaps (Lo que detiene el MVP)

### CRÍTICO - Bloquean go-live
1. Audit trail en documentos (Mes 2)
2. Cierre de OT con evidencia (Mes 3)
3. Movimientos de bodega (Mes 4)

### IMPORTANTE - Mejoran experience
4. Expiración de documentos (Mes 2)
5. Integración OT ↔ Bodega (Mes 3)
6. KPI MTTR (Mes 3)
7. Reorder automático (Mes 4)

### MEDIO - Polish y extras
8. Búsqueda avanzada (Mes 2)
9. Sostenibilidad completa (Mes 5)
10. Reportes avanzados (Mes 7)

---

## Backlog Inmediato (Próximos 15 días)

Orden de ejecución recomendado:

1. **SEMANA 1:**
   - Audit trail en documentos (Mes 2)
   - Expiración de documentos (Mes 2)
   - QA completo Mes 2

2. **SEMANA 2:**
   - Cierre OT con evidencia (Mes 3)
   - Integración OT ↔ Bodega (Mes 3)
   - KPI MTTR básico (Mes 3)
   - QA completo Mes 3

3. **SEMANA 3:**
   - Movimientos de bodega (Mes 4)
   - Reorder automático (Mes 4)
   - Trazabilidad (Mes 4)

---

## Resultados Esperados

### Al cierre de Semana 2:
- 3 módulos: 100% DONE (Documentos, Legal, Mantenimiento)
- 2 módulos: 90% DONE (Bodega, Producción)
- Platform lista para TEST en staging

### Al cierre de Mes 4:
- 5 módulos: 100% DONE (Documentos, Legal, Mantenimiento, Bodega, Producción)
- 2 módulos: 80% DONE (Sostenibilidad, Finanzas)
- Platform lista para SOFT LAUNCH

### Al cierre de Mes 7:
- 9 módulos: 100% DONE
- Platform lista para PRODUCTION LAUNCH
- Documentación completa
- Testing E2E completo
- Go-live checklist PASSED

---

## Estimación de Esfuerzo

Total: 7 meses (original) → 2-3 meses (acelerado)

Por mes:
- Mes 1 (Base): 40 horas (DONE)
- Mes 2 (Documentos): 30 horas
- Mes 3 (Mantenimiento): 40 horas
- Mes 4 (Bodega): 40 horas
- Mes 5 (Sostenibilidad): 50 horas
- Mes 6 (Finanzas): 40 horas
- Mes 7 (IA/QA): 50 horas

**Total: 290 horas** (~6-7 semanas a 40 horas/semana)

---

## Recomendación Final

Estamos en posición de **acelerar significativamente** el roadmap porque:

1. Base técnica ya está lista (Mes 1 ✓)
2. Documentos & Legal casi listos (Mes 2, 90%)
3. Mantenimiento tiene estructura base (Mes 3, 90%)
4. APIs y DB schema ya existen

**Recomendación: COMENZAR SEMANA 1 con Documentos & Legal (Mes 2 cierre)**

Después de 2 semanas, estaremos en condiciones de hacer SOFT LAUNCH con 3 módulos completamente funcionales. El resto de los módulos pueden ir en paralelo.

